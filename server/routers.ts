import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as messageService from "./messages";
import * as chatbot from "./chatbot";
import * as emailService from "./services/email";
import * as learnworldsService from "./services/learnworlds";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";
import { timingSafeEqual, createHash } from "crypto";
import {
  emitSupportTicketToAdmins,
  emitSupportMessage,
  emitSupportTicketUpdate,
} from "./_core/socket";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  // Debug endpoints (admin only — prevent exposing system internals)
  debug: router({
    testDb: adminProcedure.query(async () => {
      return await db.testDatabaseConnection();
    }),
    emailStatus: adminProcedure.query(() => {
      return emailService.getEmailServiceStatus();
    }),
    learnworldsStatus: adminProcedure.query(() => {
      return learnworldsService.getLearnworldsStatus();
    }),
    // Test email send (admin only, respects TEST_MODE)
    testEmail: adminProcedure
      .input(
        z.object({
          to: z.string().email(),
          subject: z.string(),
          message: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await emailService.sendEmail({
          to: input.to,
          subject: input.subject,
          html: `<p>${input.message}</p>`,
          templateType: "verification_code", // Using generic template type for test
        });
        return result;
      }),
  }),

  // Member authentication (Learnworlds members via email verification)
  memberAuth: router({
    // Request a verification code
    requestCode: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
        })
      )
      .mutation(async ({ input }) => {
        const email = input.email.toLowerCase().trim();

        // Verify Learnworlds is configured — refuse login if not
        const lwStatus = learnworldsService.getLearnworldsStatus();
        if (!lwStatus.isConfigured) {
          console.error(
            "[MemberAuth] Learnworlds not configured — blocking login. Set LEARNWORLDS_CLIENT_ID, LEARNWORLDS_CLIENT_SECRET, and LEARNWORLDS_SCHOOL_ID."
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Member authentication is not available. Please contact support.",
          });
        }

        // Verify the user exists in Learnworlds
        const lwUser = await learnworldsService.getUserByEmail(email);
        if (!lwUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "This email is not registered as a MojiTax member. Please use your Learnworlds account email.",
          });
        }

        if (lwUser.is_active === false) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Your MojiTax account is inactive. Please contact support.",
          });
        }

        // Generate and store verification code
        const code = await db.createVerificationCode(email);

        // Get user's name from Learnworlds
        let userName: string | null = null;
        userName = await learnworldsService.getUserName(email);

        // Send verification email
        const emailResult = await emailService.sendVerificationCode(
          email,
          userName,
          code
        );

        if (!emailResult.success) {
          console.error(
            "[MemberAuth] Failed to send verification email:",
            emailResult.error
          );
          // Don't expose email errors to users, just log them
        }

        return {
          success: true,
          message: "Verification code sent to your email",
          // Only show email in test mode for debugging
          ...(ENV.isTestMode &&
            emailResult.redirectedTo && {
              testNote: `Code sent to ${emailResult.redirectedTo} (TEST MODE)`,
            }),
        };
      }),

    // Update member display name (self-service)
    updateDisplayName: protectedProcedure
      .input(
        z.object({
          displayName: z
            .string()
            .min(2, "Display name must be at least 2 characters")
            .max(30, "Display name must be 30 characters or less")
            .regex(
              /^[a-zA-Z0-9_\- ]+$/,
              "Only letters, numbers, spaces, hyphens, and underscores allowed"
            ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.updateUserDisplayName(ctx.user.id, input.displayName.trim());
        return { success: true };
      }),

    // Verify code and log in
    verifyCode: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          code: z.string().length(6),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const email = input.email.toLowerCase().trim();

        // Verify the code
        const isValid = await db.verifyCode(email, input.code);
        if (!isValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "Invalid or expired verification code. Please request a new code.",
          });
        }

        // Get or create the member user
        const userName = await learnworldsService.getUserName(email);

        const user = await db.upsertMemberUser({
          email,
          name: userName,
        });

        // Auto-enroll user in Learnworlds-linked channels (supports multi-entity links)
        try {
          const userCourses = await learnworldsService.getUserCourses(email);
          const channelsWithLinks = await db.getChannelsWithLinks();

          for (const { channelId, links } of channelsWithLinks) {
            // Check if any of the channel's linked courses match the user's enrolled courses
            const shouldEnroll = links.some(
              link =>
                link.entityType === "course" &&
                userCourses.includes(link.entityId)
            );
            // Bundle/subscription matching requires additional API support

            if (shouldEnroll) {
              const isMember = await db.isUserInChannel(channelId, user.id);
              if (!isMember) {
                await db.addChannelMember({
                  channelId,
                  userId: user.id,
                });
                console.log(
                  `[AutoEnroll] User ${user.id} enrolled in channel ${channelId}`
                );
              }
            }
          }
        } catch (err: any) {
          console.error("[AutoEnroll] Error:", err.message);
          // Don't block login if auto-enrollment fails
        }

        // Create session token using jose (ESM-compatible)
        // Use JWT_SECRET or fallback to a dev secret (not secure for production!)
        const secretKey =
          ENV.cookieSecret || "dev-secret-change-in-production-" + ENV.appId;
        const secret = new TextEncoder().encode(secretKey);
        const appId = ENV.appId || "mojitax-connect";
        const memberName = userName || user.email || "Member";
        console.log("[Auth] Creating token with:", {
          openId: user.openId,
          appId,
          name: memberName,
        });
        const token = await new SignJWT({
          openId: user.openId,
          appId: appId,
          name: memberName,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("365d")
          .sign(secret);

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      }),

    // Check member status (for debugging)
    checkMember: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
        })
      )
      .query(async ({ input }) => {
        const lwStatus = learnworldsService.getLearnworldsStatus();
        if (!lwStatus.isConfigured) {
          return {
            learnworldsConfigured: false,
            message: "Learnworlds not configured",
          };
        }

        const lwUser = await learnworldsService.getUserByEmail(input.email);
        return {
          learnworldsConfigured: true,
          exists: !!lwUser,
          isActive: lwUser?.is_active || false,
          name: lwUser
            ? `${lwUser.first_name || ""} ${lwUser.last_name || ""}`.trim()
            : null,
        };
      }),
  }),

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Admin password login
    adminLogin: publicProcedure
      .input(z.object({ password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        if (!ENV.adminPassword) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Admin password not configured on this server.",
          });
        }

        // Timing-safe comparison: hash both values to ensure equal-length buffers
        const inputHash = createHash("sha256").update(input.password).digest();
        const expectedHash = createHash("sha256")
          .update(ENV.adminPassword)
          .digest();
        const passwordValid = timingSafeEqual(inputHash, expectedHash);

        if (!passwordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid admin password.",
          });
        }

        // Find or create the password-auth admin user
        const adminOpenId = "admin:password-auth";
        await db.upsertUser({
          openId: adminOpenId,
          name: "Admin",
          email: "admin@mojitax.com",
          role: "admin",
          loginMethod: "password",
          lastSignedIn: new Date(),
        });

        const adminUser = await db.getUserByOpenId(adminOpenId);
        if (!adminUser) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create admin session.",
          });
        }

        // Create JWT session token
        const secretKey =
          ENV.cookieSecret || "dev-secret-change-in-production-" + ENV.appId;
        const secret = new TextEncoder().encode(secretKey);
        const appId = ENV.appId || "mojitax-connect";
        const token = await new SignJWT({
          openId: adminOpenId,
          appId,
          name: adminUser.displayName || adminUser.name || "Admin",
        })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("30d")
          .sign(secret);

        // Set HTTP-only session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        });

        return {
          success: true,
          user: {
            id: adminUser.id,
            name: adminUser.displayName || adminUser.name,
            role: adminUser.role,
          },
        };
      }),
  }),

  channels: router({
    // Get all public channels
    getPublic: publicProcedure.query(async () => {
      return await db.getPublicChannels();
    }),

    // Get user's channels (requires auth) — includes unread counts
    getMy: protectedProcedure.query(async ({ ctx }) => {
      const channels = await db.getUserChannels(ctx.user.id);
      const unreadCounts = await db.getUnreadCountsForUser(ctx.user.id);
      const unreadMap = new Map(
        unreadCounts.map(u => [u.channelId, u.unreadCount])
      );
      return channels.map((ch: any) => ({
        ...ch,
        unreadCount: unreadMap.get(ch.id) || 0,
      }));
    }),

    // Get unread message counts for all visible channels
    getUnreadCounts: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadCountsForUser(ctx.user.id);
    }),

    // Mark a channel as read
    markAsRead: protectedProcedure
      .input(z.object({ channelId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateChannelLastRead(ctx.user.id, input.channelId);
        return { success: true };
      }),

    // Get channel by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const channel = await db.getChannelById(input.id);
        if (!channel) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Channel not found",
          });
        }

        // Check if user has access to private channels
        if (channel.isPrivate) {
          const isMember = await db.isUserInChannel(input.id, ctx.user.id);
          if (!isMember) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        }

        return channel;
      }),

    // Create a new channel (admin can create topic channels, users can create study groups)
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          type: z.enum(["topic", "study_group"]),
          isPrivate: z.boolean().default(false),
          // Legacy single-entity fields (still accepted for backwards compat)
          learnworldsCourseId: z.string().optional(),
          learnworldsBundleId: z.string().optional(),
          learnworldsSubscriptionId: z.string().optional(),
          // New multi-entity links
          learnworldsLinks: z
            .array(
              z.object({
                entityType: z.enum(["course", "bundle", "subscription"]),
                entityId: z.string(),
                entityTitle: z.string().optional(),
              })
            )
            .optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Only admins can create topic channels
        if (input.type === "topic" && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can create topic channels",
          });
        }

        const hasLinks =
          (input.learnworldsLinks && input.learnworldsLinks.length > 0) ||
          input.learnworldsCourseId ||
          input.learnworldsBundleId ||
          input.learnworldsSubscriptionId;

        // Learnworlds linking is admin-only
        if (hasLinks && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can link channels to Learnworlds",
          });
        }

        // Topic channels (except General) must be linked to a Learnworlds entity
        if (input.type === "topic" && !hasLinks) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Topic channels must be linked to a course, bundle, or subscription. Only the General channel can exist without a link.",
          });
        }

        const inviteCode = input.isPrivate ? nanoid(16) : undefined;

        // For backwards compat, set the first course/bundle/subscription on the channel row
        const firstCourse =
          input.learnworldsLinks?.find(l => l.entityType === "course")
            ?.entityId ||
          input.learnworldsCourseId ||
          null;
        const firstBundle =
          input.learnworldsLinks?.find(l => l.entityType === "bundle")
            ?.entityId ||
          input.learnworldsBundleId ||
          null;
        const firstSub =
          input.learnworldsLinks?.find(l => l.entityType === "subscription")
            ?.entityId ||
          input.learnworldsSubscriptionId ||
          null;

        const channelId = await db.createChannel({
          name: input.name,
          description: input.description || null,
          type: input.type,
          isPrivate: input.isPrivate,
          inviteCode: inviteCode || null,
          createdBy: ctx.user.id,
          learnworldsCourseId: firstCourse,
          learnworldsBundleId: firstBundle,
          learnworldsSubscriptionId: firstSub,
        });

        // Save all links to the junction table
        const allLinks: {
          entityType: string;
          entityId: string;
          entityTitle?: string;
        }[] = [];
        if (input.learnworldsLinks && input.learnworldsLinks.length > 0) {
          allLinks.push(...input.learnworldsLinks);
        } else {
          // Build from legacy single-entity fields
          if (input.learnworldsCourseId)
            allLinks.push({
              entityType: "course",
              entityId: input.learnworldsCourseId,
            });
          if (input.learnworldsBundleId)
            allLinks.push({
              entityType: "bundle",
              entityId: input.learnworldsBundleId,
            });
          if (input.learnworldsSubscriptionId)
            allLinks.push({
              entityType: "subscription",
              entityId: input.learnworldsSubscriptionId,
            });
        }

        if (allLinks.length > 0) {
          try {
            await db.setChannelLinks(channelId, allLinks);
          } catch (err: any) {
            // Junction table may not exist yet — that's okay, old columns are set
            console.warn(
              "[Channels] Could not save to junction table:",
              err.message
            );
          }
        }

        // Add creator as owner
        await db.addChannelMember({
          channelId,
          userId: ctx.user.id,
          role: "owner",
        });

        return { channelId, inviteCode };
      }),

    // Get links for a specific channel (admin only)
    getChannelLinks: adminProcedure
      .input(z.object({ channelId: z.number() }))
      .query(async ({ input }) => {
        return await db.getChannelLinks(input.channelId);
      }),

    // Get Learnworlds catalog for channel linking (admin only)
    getLearnworldsCatalog: adminProcedure.query(async () => {
      const [courses, bundles, subscriptions] = await Promise.all([
        learnworldsService.getCourses(),
        learnworldsService.getBundles(),
        learnworldsService.getSubscriptions(),
      ]);
      return { courses, bundles, subscriptions };
    }),

    // Join a channel
    join: protectedProcedure
      .input(
        z.object({
          channelId: z.number().optional(),
          inviteCode: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        let channelId = input.channelId;

        // If invite code provided, find channel by code
        if (input.inviteCode && !channelId) {
          const channels = await db.getAllChannels();
          const channel = channels.find(c => c.inviteCode === input.inviteCode);
          if (!channel) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Invalid invite code",
            });
          }
          channelId = channel.id;
        }

        if (!channelId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Channel ID or invite code required",
          });
        }

        const channel = await db.getChannelById(channelId);
        if (!channel) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Channel not found",
          });
        }

        // Check if already a member
        const isMember = await db.isUserInChannel(channelId, ctx.user.id);
        if (isMember) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Already a member",
          });
        }

        // For private channels, require invite code
        if (channel.isPrivate && channel.inviteCode !== input.inviteCode) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Invite code required for private channels",
          });
        }

        await db.addChannelMember({
          channelId,
          userId: ctx.user.id,
          role: "member",
        });

        return { success: true };
      }),

    // Leave a channel
    leave: protectedProcedure
      .input(z.object({ channelId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.removeChannelMember(input.channelId, ctx.user.id);
        return { success: true };
      }),

    // Get channel members
    getMembers: protectedProcedure
      .input(z.object({ channelId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Check if user has access
        const isMember = await db.isUserInChannel(input.channelId, ctx.user.id);
        if (!isMember && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        return await db.getChannelMembers(input.channelId);
      }),

    // Search channel members for @mention autocomplete
    // Only returns members who have set a display name (connect name) to protect privacy
    searchMembers: protectedProcedure
      .input(
        z.object({
          channelId: z.number(),
          query: z.string().max(100).default(""),
        })
      )
      .query(async ({ input, ctx }) => {
        const isMember = await db.isUserInChannel(input.channelId, ctx.user.id);
        if (!isMember && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const members = await db.getChannelMembers(input.channelId);

        // Only include members who have explicitly set a display name (connect name).
        // This protects users who haven't opted in — their real name / email won't
        // appear in the mention dropdown.
        const mentionable = members.filter(
          (m: any) => m.displayName && m.displayName.trim().length > 0
        );

        const q = input.query.toLowerCase();

        const filtered = q
          ? mentionable.filter((m: any) =>
              m.displayName.toLowerCase().includes(q)
            )
          : mentionable;

        // Return top 10 results, excluding the current user
        return filtered
          .filter((m: any) => m.id !== ctx.user.id)
          .slice(0, 10)
          .map((m: any) => ({
            id: m.id,
            name: m.displayName,
          }));
      }),

    // Close a channel (owner only)
    close: protectedProcedure
      .input(z.object({ channelId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const members = await db.getChannelMembers(input.channelId);
        const userMember = members.find(m => m.id === ctx.user.id);

        if (userMember?.memberRole !== "owner" && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only channel owner can close the channel",
          });
        }

        await db.updateChannel(input.channelId, { isClosed: true });
        return { success: true };
      }),
  }),

  messages: router({
    // Get messages for a channel
    getByChannel: protectedProcedure
      .input(
        z.object({
          channelId: z.number(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input, ctx }) => {
        // Check if user has access
        const channel = await db.getChannelById(input.channelId);
        if (!channel) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Channel not found",
          });
        }

        // Check if group is suspended
        if (channel.isSuspended) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "This group has been suspended by an administrator. Contact support for details.",
          });
        }

        if (channel.isPrivate) {
          const isMember = await db.isUserInChannel(
            input.channelId,
            ctx.user.id
          );
          // Study groups are private — admin cannot read messages unless they are a member
          if (!isMember) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                channel.type === "study_group"
                  ? "Study groups are private. Admin does not have access to group conversations."
                  : "Access denied",
            });
          }
        }

        return await db.getChannelMessages(
          input.channelId,
          input.limit,
          input.offset
        );
      }),

    // Get pinned messages
    getPinned: protectedProcedure
      .input(z.object({ channelId: z.number() }))
      .query(async ({ input, ctx }) => {
        const channel = await db.getChannelById(input.channelId);
        if (!channel) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Channel not found",
          });
        }

        if (channel.isPrivate) {
          const isMember = await db.isUserInChannel(
            input.channelId,
            ctx.user.id
          );
          // Study groups: admin cannot access unless member
          if (!isMember) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        }

        return await db.getPinnedMessages(input.channelId);
      }),

    // Send a message
    send: protectedProcedure
      .input(
        z.object({
          channelId: z.number(),
          content: z.string().min(1),
          replyToId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Check if user is suspended
        if (await db.isUserSuspended(ctx.user.id)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Your account has been suspended. You cannot send messages.",
          });
        }

        // Check if group is suspended
        const sendChannel = await db.getChannelById(input.channelId);
        if (sendChannel?.isSuspended) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This group has been suspended. Messages cannot be sent.",
          });
        }

        // Check membership — admins can send to topic channels but NOT to study groups
        const isMember = await db.isUserInChannel(input.channelId, ctx.user.id);
        const isStudyGroup = sendChannel?.type === "study_group";
        if (!isMember && !(ctx.user.role === "admin" && !isStudyGroup)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: isStudyGroup
              ? "Study groups are private. Only members can send messages."
              : "Must be a channel member to send messages",
          });
        }

        const messageType = ctx.user.role === "admin" ? "admin" : "user";

        // Use messageService to create and broadcast message
        const result = await messageService.createMessage({
          channelId: input.channelId,
          userId: ctx.user.id,
          content: input.content,
          messageType,
          replyToId: input.replyToId,
        });

        // @moji AI chatbot - responds when users mention @moji
        if (input.content.toLowerCase().includes("@moji")) {
          chatbot
            .handleUserMessage(input.channelId, ctx.user.id, input.content)
            .catch(err =>
              console.error("[Chatbot] Error handling message:", err)
            );
        }

        // TODO: Handle other @mentions and trigger notifications

        return result;
      }),

    // Toggle pin on a message (admin only)
    togglePin: adminProcedure
      .input(
        z.object({
          messageId: z.number(),
          isPinned: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        await db.togglePinMessage(input.messageId, input.isPinned);
        return { success: true };
      }),
  }),

  posts: router({
    // Create a post (admin only)
    create: adminProcedure
      .input(
        z.object({
          postType: z.enum(["event", "announcement", "article", "newsletter"]),
          title: z.string().min(1).max(500),
          content: z.string().min(1),
          channelId: z.number().optional(),

          // Event fields
          eventDate: z.date().optional(),
          eventLocation: z.string().optional(),

          // Article fields
          tags: z.string().optional(),
          featuredImage: z.string().optional(),

          // Newsletter fields
          distributionList: z.string().optional(),
          scheduledFor: z.date().optional(),

          // Announcement fields
          priorityLevel: z.enum(["low", "medium", "high", "urgent"]).optional(),

          // Event reminder scheduling
          reminderHours: z.number().optional(),

          // Article author attribution
          articleAuthor: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const postId = await db.createPost({
          postType: input.postType,
          title: input.title,
          content: input.content,
          authorId: ctx.user.id,
          channelId: input.channelId || null,
          eventDate: input.eventDate || null,
          eventLocation: input.eventLocation || null,
          tags: input.tags || null,
          featuredImage: input.featuredImage || null,
          distributionList: input.distributionList || null,
          scheduledFor: input.scheduledFor || null,
          priorityLevel: input.priorityLevel || null,
          reminderHours: input.reminderHours || null,
          articleAuthor: input.articleAuthor || null,
        });

        // Create a chat message in the General channel (or specified channel) for this post
        const targetChannelId = input.channelId || 1; // Default to General channel (id: 1)

        // Format the post content as a rich message
        let messageContent = `**${input.title}**\n\n${input.content}`;

        // Add metadata based on post type
        if (input.postType === "event" && input.eventDate) {
          const dateStr = input.eventDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          messageContent += `\n\n📅 **Event Date:** ${dateStr}`;
          if (input.eventLocation) {
            messageContent += `\n📍 **Location:** ${input.eventLocation}`;
          }
        } else if (input.postType === "article" && input.tags) {
          messageContent += `\n\n🏷️ **Tags:** ${input.tags}`;
        } else if (input.postType === "announcement" && input.priorityLevel) {
          const priorityEmoji = {
            low: "📌",
            medium: "📢",
            high: "⚠️",
            urgent: "🚨",
          }[input.priorityLevel];
          messageContent += `\n\n${priorityEmoji} **Priority:** ${input.priorityLevel.toUpperCase()}`;
        }

        // Create the message with special type
        const messageId = await db.createMessage({
          channelId: targetChannelId,
          userId: ctx.user.id,
          content: messageContent,
          messageType: input.postType, // Use post type as message type
          replyToId: null,
          postId, // Link to the post
        });

        // Update the post with the messageId
        await db.updatePost(postId, { messageId });

        // Email distribution: notify channel members (or all users for General)
        // Run in background so the API responds immediately
        (async () => {
          try {
            let recipients: Array<{
              email: string | null;
              name: string | null;
            }>;

            if (targetChannelId === 1) {
              // General channel → email all users
              const { users } = await db.getAllUsers({ limit: 10000 });
              recipients = users;
            } else {
              // Specific channel → email only channel members
              recipients = await db.getChannelMembers(targetChannelId);
            }

            const authorName = ctx.user.name || "Admin";

            for (const user of recipients) {
              if (!user.email) continue;

              try {
                if (input.postType === "event" && input.eventDate) {
                  await emailService.sendEventEmail(user.email, user.name, {
                    title: input.title,
                    content: input.content,
                    date: input.eventDate,
                    location: input.eventLocation || undefined,
                    authorName,
                    postId,
                  });
                } else if (input.postType === "announcement") {
                  await emailService.sendAnnouncementEmail(
                    user.email,
                    user.name,
                    {
                      title: input.title,
                      content: input.content,
                      authorName,
                    }
                  );
                } else if (input.postType === "newsletter") {
                  await emailService.sendNewsletterEmail(
                    user.email,
                    user.name,
                    {
                      title: input.title,
                      content: input.content,
                      authorName,
                    }
                  );
                } else if (input.postType === "article") {
                  await emailService.sendArticleEmail(user.email, user.name, {
                    title: input.title,
                    content: input.content,
                    tags: input.tags || undefined,
                    authorName: input.articleAuthor || "MojiTax",
                  });
                }
              } catch (emailErr) {
                console.error(
                  `[Posts] Failed to send email to ${user.email}:`,
                  emailErr
                );
              }
            }

            console.log(
              `[Posts] Email distribution complete for ${input.postType} "${input.title}" — ${recipients.filter(u => u.email).length} recipients`
            );
          } catch (err) {
            console.error("[Posts] Email distribution failed:", err);
          }
        })();

        return { postId, messageId, success: true };
      }),

    // Send a test email using the real post template (admin only, no channel post)
    testSend: adminProcedure
      .input(
        z.object({
          postType: z.enum(["event", "announcement", "article", "newsletter"]),
          title: z.string().min(1).max(500),
          content: z.string().min(1),
          testEmail: z.string().email(),

          // Event fields
          eventDate: z.date().optional(),
          eventLocation: z.string().optional(),

          // Article fields
          tags: z.string().optional(),

          // Announcement fields
          priorityLevel: z.enum(["low", "medium", "high", "urgent"]).optional(),

          // Article author attribution
          articleAuthor: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const authorName = ctx.user.name || "Admin";
        const email = input.testEmail;

        let result: emailService.EmailResult;

        if (input.postType === "event" && input.eventDate) {
          result = await emailService.sendEventEmail(email, "Test Recipient", {
            title: input.title,
            content: input.content,
            date: input.eventDate,
            location: input.eventLocation || undefined,
            authorName,
            postId: 0, // test mode, no real post
          });
        } else if (input.postType === "announcement") {
          result = await emailService.sendAnnouncementEmail(
            email,
            "Test Recipient",
            {
              title: input.title,
              content: input.content,
              authorName,
            }
          );
        } else if (input.postType === "newsletter") {
          result = await emailService.sendNewsletterEmail(
            email,
            "Test Recipient",
            {
              title: input.title,
              content: input.content,
              authorName,
            }
          );
        } else if (input.postType === "article") {
          result = await emailService.sendArticleEmail(
            email,
            "Test Recipient",
            {
              title: input.title,
              content: input.content,
              tags: input.tags || undefined,
              authorName: input.articleAuthor || "MojiTax",
            }
          );
        } else {
          // Fallback for event without date
          result = await emailService.sendAnnouncementEmail(
            email,
            "Test Recipient",
            {
              title: input.title,
              content: input.content,
              authorName,
            }
          );
        }

        return {
          success: result.success,
          error: result.error,
          sentTo: email,
        };
      }),

    // Get posts by type
    getByType: publicProcedure
      .input(
        z.object({
          postType: z.enum(["event", "announcement", "article", "newsletter"]),
          limit: z.number().default(20),
        })
      )
      .query(async ({ input }) => {
        return await db.getPostsByType(input.postType, input.limit);
      }),

    // Browse posts with pagination, sorting, and search
    browse: publicProcedure
      .input(
        z.object({
          postType: z.enum(["event", "announcement", "article", "newsletter"]),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
          sortBy: z.enum(["newest", "oldest", "pinned"]).default("newest"),
          search: z.string().max(200).optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.browsePostsByType(input.postType, {
          limit: input.limit,
          offset: input.offset,
          sortBy: input.sortBy,
          search: input.search || undefined,
        });
      }),

    // Get post by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const post = await db.getPostById(input.id);
        if (!post) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
        }
        return post;
      }),

    // Toggle pin on a post (admin only)
    togglePin: adminProcedure
      .input(
        z.object({
          postId: z.number(),
          isPinned: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        await db.togglePinPost(input.postId, input.isPinned);
        return { success: true };
      }),
  }),

  // Event RSVP system
  events: router({
    // Public: Submit interest in an event
    submitInterest: publicProcedure
      .input(
        z.object({
          postId: z.number(),
          name: z.string().min(1).max(255),
          email: z.string().email(),
          phone: z.string().max(50).optional(),
          company: z.string().max(255).optional(),
          notes: z.string().max(1000).optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Verify the post exists and is an event
        const post = await db.getPostById(input.postId);
        if (!post || post.postType !== "event") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        // Check for existing RSVP
        const existing = await db.getEventRsvpByEmail(
          input.postId,
          input.email
        );
        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "You have already indicated interest in this event. We will be in touch!",
          });
        }

        const rsvpId = await db.createEventRsvp({
          postId: input.postId,
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone || null,
          company: input.company || null,
          notes: input.notes || null,
        });

        return { rsvpId, success: true };
      }),

    // Public: Get event details for the interest form
    getPublicEvent: publicProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ input }) => {
        const post = await db.getPostById(input.postId);
        if (!post || post.postType !== "event") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }
        return {
          id: post.id,
          title: post.title,
          content: post.content,
          eventDate: post.eventDate,
          eventLocation: post.eventLocation,
          authorName: post.authorName,
        };
      }),

    // Admin: Get all RSVPs for an event
    getInvitees: adminProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEventRsvps(input.postId);
      }),

    // Admin: Send confirmation to all interested invitees
    sendConfirmation: adminProcedure
      .input(
        z.object({
          postId: z.number(),
          eventLink: z.string().optional(),
          additionalInfo: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const post = await db.getPostById(input.postId);
        if (!post || post.postType !== "event") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        const rsvps = await db.getEventRsvps(input.postId);
        const interested = rsvps.filter(r => r.status === "interested");
        let sentCount = 0;

        for (const rsvp of interested) {
          try {
            await emailService.sendEventConfirmation(rsvp.email, rsvp.name, {
              title: post.title,
              content: post.content,
              date: new Date(post.eventDate!),
              location: post.eventLocation || undefined,
              eventLink: input.eventLink || undefined,
              additionalInfo: input.additionalInfo || undefined,
            });
            await db.updateEventRsvp(rsvp.id, {
              status: "confirmed",
              confirmationSentAt: new Date(),
            });
            sentCount++;
          } catch (err) {
            console.error(
              `[Events] Failed to send confirmation to ${rsvp.email}:`,
              err
            );
          }
        }

        return { sentCount, success: true };
      }),

    // Admin: Send reminder to confirmed invitees
    sendReminder: adminProcedure
      .input(
        z.object({
          postId: z.number(),
          eventLink: z.string().optional(),
          reminderMessage: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const post = await db.getPostById(input.postId);
        if (!post || post.postType !== "event") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        const rsvps = await db.getEventRsvps(input.postId);
        const confirmed = rsvps.filter(
          r => r.status === "confirmed" || r.status === "interested"
        );
        let sentCount = 0;

        for (const rsvp of confirmed) {
          try {
            await emailService.sendEventReminder(rsvp.email, rsvp.name, {
              title: post.title,
              content: post.content,
              date: new Date(post.eventDate!),
              location: post.eventLocation || undefined,
              eventLink: input.eventLink || undefined,
              reminderMessage: input.reminderMessage || undefined,
            });
            await db.updateEventRsvp(rsvp.id, {
              reminderSentAt: new Date(),
            });
            sentCount++;
          } catch (err) {
            console.error(
              `[Events] Failed to send reminder to ${rsvp.email}:`,
              err
            );
          }
        }

        return { sentCount, success: true };
      }),
  }),

  support: router({
    // Chat with @moji (before creating a ticket)
    chatWithMoji: protectedProcedure
      .input(
        z.object({
          message: z.string().min(1),
          conversationHistory: z.array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const response = await chatbot.generateChatbotResponse(
          input.message,
          0, // no channel — this is a support pre-chat
          ctx.user.id,
          input.conversationHistory
        );

        return {
          content: response.content,
          shouldEscalate: response.shouldEscalate,
          confidence: response.confidence,
        };
      }),

    // Create a support ticket
    create: protectedProcedure
      .input(z.object({ subject: z.string(), initialMessage: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (await db.isUserSuspended(ctx.user.id)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Your account has been suspended. You cannot create tickets.",
          });
        }

        const ticketId = await db.createSupportTicket({
          userId: ctx.user.id,
          subject: input.subject,
          status: "open",
          priority: "medium",
        });

        // Create initial message
        await db.createSupportMessage({
          ticketId,
          senderId: ctx.user.id,
          senderType: "user",
          content: input.initialMessage,
        });

        // Notify admins in real-time
        emitSupportTicketToAdmins({
          ticketId,
          subject: input.subject,
          userId: ctx.user.id,
          userName: ctx.user.displayName || ctx.user.name || ctx.user.email,
          status: "open",
        });

        // Email admin(s) about the new ticket (fire-and-forget)
        db.getAdminUsers()
          .then(admins => {
            for (const admin of admins) {
              if (admin.email) {
                emailService
                  .sendSupportUpdate(admin.email, admin.name, {
                    ticketId,
                    subject: input.subject,
                    status: "New ticket",
                    latestMessage: input.initialMessage,
                  })
                  .catch(err =>
                    console.error("[Email] Failed to notify admin:", err)
                  );
              }
            }
          })
          .catch(err => console.error("[Email] Failed to fetch admins:", err));

        return { ticketId, success: true };
      }),

    // Get all support tickets (admin only)
    getAll: adminProcedure.query(async () => {
      return await db.getAllSupportTickets();
    }),

    // Get user's own support tickets
    getMy: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserSupportTickets(ctx.user.id);
    }),

    // Get ticket by ID with messages
    getById: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .query(async ({ input }) => {
        const ticket = await db.getSupportTicketById(input.ticketId);
        const messages = await db.getSupportMessagesByTicket(input.ticketId);
        return { ticket, messages };
      }),

    // Reply to a ticket
    reply: protectedProcedure
      .input(z.object({ ticketId: z.number(), content: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // Determine senderType from ticket relationship, not global role.
        // This avoids misattribution when admin and member share a browser
        // (same cookie name) and ensures correct alignment in chat UI.
        const ticket = await db.getSupportTicketById(input.ticketId);
        if (!ticket) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Ticket not found",
          });
        }
        const senderType = ctx.user.id === ticket.userId ? "user" : "admin";

        const messageId = await db.createSupportMessage({
          ticketId: input.ticketId,
          senderId: ctx.user.id,
          senderType,
          content: input.content,
        });

        // Update ticket's lastMessageAt
        await db.updateSupportTicket(input.ticketId, {
          lastMessageAt: new Date(),
        });

        // Broadcast message to ticket room, admins, and ticket owner
        emitSupportMessage(
          input.ticketId,
          {
            id: messageId,
            ticketId: input.ticketId,
            senderId: ctx.user.id,
            senderType,
            senderName: ctx.user.displayName || ctx.user.name || ctx.user.email,
            content: input.content,
            createdAt: new Date(),
          },
          ticket.userId
        );

        // Email the other party about the reply (fire-and-forget)
        if (senderType === "admin" && ticket.userEmail) {
          // Admin replied → email the user
          emailService
            .sendSupportUpdate(ticket.userEmail, ticket.userName, {
              ticketId: input.ticketId,
              subject: ticket.subject,
              status: "New reply from support",
              latestMessage: input.content,
            })
            .catch(err => console.error("[Email] Failed to notify user:", err));
        } else if (senderType === "user") {
          // User replied → email admin(s)
          db.getAdminUsers()
            .then(admins => {
              for (const admin of admins) {
                if (admin.email) {
                  emailService
                    .sendSupportUpdate(admin.email, admin.name, {
                      ticketId: input.ticketId,
                      subject: ticket.subject,
                      status: "New reply from user",
                      latestMessage: input.content,
                    })
                    .catch(err =>
                      console.error("[Email] Failed to notify admin:", err)
                    );
                }
              }
            })
            .catch(err =>
              console.error("[Email] Failed to fetch admins:", err)
            );
        }

        return { messageId, success: true };
      }),

    // Assign a ticket to an admin
    assign: adminProcedure
      .input(z.object({ ticketId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const ticket = await db.getSupportTicketById(input.ticketId);
        await db.updateSupportTicket(input.ticketId, {
          status: "in-progress",
          assignedToAdminId: ctx.user.id,
        });

        // Notify the ticket owner that an admin picked it up
        if (ticket) {
          emitSupportTicketUpdate(ticket.userId, input.ticketId, {
            status: "in-progress",
          });
        }

        return { success: true };
      }),

    // Close a support ticket
    close: adminProcedure
      .input(z.object({ ticketId: z.number() }))
      .mutation(async ({ input }) => {
        const ticket = await db.getSupportTicketById(input.ticketId);
        await db.updateSupportTicket(input.ticketId, {
          status: "closed",
          closedAt: new Date(),
        });

        // Notify the ticket owner
        if (ticket) {
          emitSupportTicketUpdate(ticket.userId, input.ticketId, {
            status: "closed",
          });

          // Email user that their ticket was closed (fire-and-forget)
          if (ticket.userEmail) {
            emailService
              .sendSupportUpdate(ticket.userEmail, ticket.userName, {
                ticketId: input.ticketId,
                subject: ticket.subject,
                status: "Closed",
              })
              .catch(err =>
                console.error("[Email] Failed to notify user:", err)
              );
          }
        }

        return { success: true };
      }),
  }),

  mojiKnowledge: router({
    // Get all knowledge base entries (admin only)
    getAll: adminProcedure.query(async () => {
      return await db.getAllKnowledgeBase();
    }),

    // Search knowledge base
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await db.searchKnowledgeBase(input.query);
      }),

    // Create knowledge base entry (admin only)
    create: adminProcedure
      .input(
        z.object({
          question: z.string().min(1),
          answer: z.string().min(1),
          category: z.string().optional(),
          tags: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const id = await db.createKnowledgeBaseEntry({
          question: input.question,
          answer: input.answer,
          category: input.category || null,
          tags: input.tags || null,
        });
        return { id, success: true };
      }),

    // Update knowledge base entry (admin only)
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          question: z.string().optional(),
          answer: z.string().optional(),
          category: z.string().optional(),
          tags: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateKnowledgeBaseEntry(id, updates);
        return { success: true };
      }),

    // Delete knowledge base entry (admin only)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteKnowledgeBaseEntry(input.id);
        return { success: true };
      }),

    // Bulk upload from CSV (admin only)
    bulkUpload: adminProcedure
      .input(
        z.object({
          entries: z.array(
            z.object({
              question: z.string(),
              answer: z.string(),
              category: z.string().optional(),
              tags: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const ids = [];
        for (const entry of input.entries) {
          const id = await db.createKnowledgeBaseEntry({
            question: entry.question,
            answer: entry.answer,
            category: entry.category || null,
            tags: entry.tags || null,
          });
          ids.push(id);
        }
        return { count: ids.length, success: true };
      }),
  }),

  emailLogs: router({
    // Get all email logs (admin only)
    getAll: adminProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async ({ input }) => {
        return await db.getAllEmailLogs(input.limit);
      }),

    // Create email log (admin only)
    create: adminProcedure
      .input(
        z.object({
          recipientEmail: z.string().email(),
          recipientName: z.string().optional(),
          subject: z.string(),
          content: z.string(),
          emailType: z.enum([
            "announcement",
            "reply",
            "mention",
            "ticket",
            "group_notification",
            "newsletter",
          ]),
        })
      )
      .mutation(async ({ input }) => {
        const id = await db.createEmailLog({
          recipientEmail: input.recipientEmail,
          recipientName: input.recipientName || null,
          subject: input.subject,
          content: input.content,
          emailType: input.emailType,
          templateType: input.emailType,
          status: "pending",
        });
        return { id, success: true };
      }),
  }),

  // Study Groups - dedicated router for study group management
  studyGroups: router({
    // Get all study groups (for discovery/browsing)
    getAll: protectedProcedure.query(async () => {
      return await db.getStudyGroups();
    }),

    // Admin: list all study groups including suspended/closed
    listAll: adminProcedure.query(async () => {
      return await db.getAllStudyGroupsAdmin();
    }),

    // Get user's study groups
    getMy: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserStudyGroups(ctx.user.id);
    }),

    // Get study group by ID with member count
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const group = await db.getStudyGroupById(input.id);
        if (!group) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Study group not found",
          });
        }

        const memberCount = await db.getStudyGroupMemberCount(input.id);
        const isMember = await db.isUserInChannel(input.id, ctx.user.id);
        const memberRole = isMember
          ? await db.getChannelMemberRole(input.id, ctx.user.id)
          : null;

        return {
          ...group,
          memberCount,
          isMember,
          memberRole,
        };
      }),

    // Create a new study group
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const groupId = await db.createStudyGroup({
          name: input.name,
          description: input.description,
          createdBy: ctx.user.id,
        });

        return { groupId, success: true };
      }),

    // Update study group settings (owner/admin only)
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Check if user is owner or admin
        const memberRole = await db.getChannelMemberRole(input.id, ctx.user.id);
        if (memberRole !== "owner" && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only group owner can update settings",
          });
        }

        await db.updateStudyGroup(input.id, {
          name: input.name,
          description: input.description,
        });

        return { success: true };
      }),

    // Archive a study group (owner/admin only)
    archive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const memberRole = await db.getChannelMemberRole(input.id, ctx.user.id);
        if (memberRole !== "owner" && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only group owner can archive",
          });
        }

        await db.archiveStudyGroup(input.id);
        return { success: true };
      }),

    // Suspend a study group (admin only — triggered by user complaint)
    suspend: adminProcedure
      .input(
        z.object({
          id: z.number(),
          reason: z.string().min(1, "Suspension reason is required"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const group = await db.getStudyGroupById(input.id);
        if (!group) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Study group not found",
          });
        }
        if (group.type !== "study_group") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only study groups can be suspended via this endpoint",
          });
        }

        await db.suspendGroup(input.id, input.reason, ctx.user.id);
        return { success: true };
      }),

    // Unsuspend a study group (admin only)
    unsuspend: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.unsuspendGroup(input.id);
        return { success: true };
      }),

    // Join a study group
    join: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const group = await db.getStudyGroupById(input.id);
        if (!group) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Study group not found",
          });
        }

        const isMember = await db.isUserInChannel(input.id, ctx.user.id);
        if (isMember) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Already a member",
          });
        }

        await db.addChannelMember({
          channelId: input.id,
          userId: ctx.user.id,
          role: "member",
        });

        return { success: true };
      }),

    // Leave a study group
    leave: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const memberRole = await db.getChannelMemberRole(input.id, ctx.user.id);
        if (memberRole === "owner") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Owner cannot leave. Transfer ownership or archive the group.",
          });
        }

        await db.removeChannelMember(input.id, ctx.user.id);
        return { success: true };
      }),

    // Get study group members
    getMembers: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const isMember = await db.isUserInChannel(input.id, ctx.user.id);
        if (!isMember && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Must be a member to view members",
          });
        }

        return await db.getChannelMembers(input.id);
      }),

    // Invite a member by email (owner/admin only)
    invite: protectedProcedure
      .input(
        z.object({
          groupId: z.number(),
          email: z.string().email(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const memberRole = await db.getChannelMemberRole(
          input.groupId,
          ctx.user.id
        );
        if (memberRole !== "owner" && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only group owner can invite members",
          });
        }

        // Find user by email
        const invitee = await db.getUserByEmail(input.email);
        if (!invitee) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found with this email",
          });
        }

        // Check if already a member
        const isAlreadyMember = await db.isUserInChannel(
          input.groupId,
          invitee.id
        );
        if (isAlreadyMember) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User is already a member",
          });
        }

        // Add as member
        await db.addChannelMember({
          channelId: input.groupId,
          userId: invitee.id,
          role: "member",
        });

        // TODO: Send email notification to invited user

        return { success: true, invitedUserId: invitee.id };
      }),

    // Remove a member (owner/admin only)
    removeMember: protectedProcedure
      .input(
        z.object({
          groupId: z.number(),
          userId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const memberRole = await db.getChannelMemberRole(
          input.groupId,
          ctx.user.id
        );
        if (memberRole !== "owner" && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only group owner can remove members",
          });
        }

        // Cannot remove owner
        const targetRole = await db.getChannelMemberRole(
          input.groupId,
          input.userId
        );
        if (targetRole === "owner") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove the owner",
          });
        }

        await db.removeChannelMember(input.groupId, input.userId);
        return { success: true };
      }),
  }),

  analytics: router({
    // Get support ticket analytics with filters
    getSupportAnalytics: adminProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          resolutionType: z
            .enum(["bot-answered", "human-answered", "no-answer", "escalated"])
            .optional(),
          enquiryType: z.string().optional(),
          status: z.enum(["open", "in-progress", "closed"]).optional(),
          searchQuery: z.string().optional(),
          limit: z.number().default(100),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        return await db.getSupportAnalytics(input);
      }),

    // Get analytics summary stats
    getSummaryStats: adminProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.getAnalyticsSummary(input);
      }),

    // Update ticket categorization
    updateTicketCategory: adminProcedure
      .input(
        z.object({
          ticketId: z.number(),
          resolutionType: z
            .enum(["bot-answered", "human-answered", "no-answer", "escalated"])
            .optional(),
          enquiryType: z.string().optional(),
          tags: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { ticketId, ...updates } = input;
        await db.updateSupportTicket(ticketId, updates);
        return { success: true };
      }),

    // Export filtered conversations to CSV
    exportToCSV: adminProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          resolutionType: z
            .enum(["bot-answered", "human-answered", "no-answer", "escalated"])
            .optional(),
          enquiryType: z.string().optional(),
          status: z.enum(["open", "in-progress", "closed"]).optional(),
        })
      )
      .query(async ({ input }) => {
        const tickets = await db.getSupportAnalytics({
          ...input,
          limit: 10000,
          offset: 0,
        });
        return { tickets, count: tickets.length };
      }),
  }),

  // Search across messages and posts
  search: router({
    messages: protectedProcedure
      .input(
        z.object({
          query: z.string().min(1).max(200),
          limit: z.number().min(1).max(100).default(30),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input, ctx }) => {
        const { results, total } = await db.searchMessages(input.query, {
          userId: ctx.user.id,
          limit: input.limit,
          offset: input.offset,
        });

        // Filter out private channels the user isn't a member of (unless admin)
        const filtered =
          ctx.user.role === "admin"
            ? results
            : await Promise.all(
                results.map(async (r: any) => {
                  if (!r.isPrivate) return r;
                  const isMember = await db.isUserInChannel(
                    r.channelId,
                    ctx.user.id
                  );
                  return isMember ? r : null;
                })
              ).then(arr => arr.filter(Boolean));

        return { results: filtered, total };
      }),

    posts: protectedProcedure
      .input(
        z.object({
          query: z.string().min(1).max(200),
          postType: z
            .enum(["event", "announcement", "article", "newsletter"])
            .optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        return await db.searchPosts(input.query, {
          postType: input.postType,
          limit: input.limit,
          offset: input.offset,
        });
      }),
  }),

  // Admin user management
  users: router({
    // List all users with pagination, search, and role filter
    list: adminProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(200).default(50),
          offset: z.number().min(0).default(0),
          search: z.string().optional(),
          role: z.enum(["user", "admin", "moderator"]).optional(),
          sortBy: z
            .enum(["created_at", "last_signed_in", "name"])
            .default("created_at"),
          sortOrder: z.enum(["asc", "desc"]).default("desc"),
        })
      )
      .query(async ({ input }) => {
        return await db.getAllUsers(input);
      }),

    // Get detailed user profile
    getById: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const details = await db.getUserDetails(input.userId);
        if (!details) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
        return details;
      }),

    // Suspend a user
    suspend: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          reason: z.string().min(1).max(500),
          until: z.string().datetime().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Prevent suspending admins
        const target = await db.getUserById(input.userId);
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
        if (target.role === "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot suspend admin users",
          });
        }

        await db.suspendUser(
          input.userId,
          ctx.user.id,
          input.reason,
          input.until ? new Date(input.until) : undefined
        );
        return { success: true };
      }),

    // Unsuspend a user
    unsuspend: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await db.unsuspendUser(input.userId);
        return { success: true };
      }),

    // Promote a user to admin
    promoteToAdmin: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const target = await db.getUserById(input.userId);
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
        if (target.role === "admin") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User is already an admin",
          });
        }
        await db.updateUserRole(input.userId, "admin");
        return { success: true };
      }),

    // Demote an admin to regular user
    demoteToUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You cannot demote yourself",
          });
        }
        const target = await db.getUserById(input.userId);
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
        if (target.role !== "admin") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User is not an admin",
          });
        }
        await db.updateUserRole(input.userId, "user");
        return { success: true };
      }),
  }),

  // Platform settings (admin only)
  settings: router({
    // Get all platform settings
    get: adminProcedure.query(async () => {
      return await db.getPlatformSettings();
    }),

    // Update platform settings
    update: adminProcedure
      .input(
        z.object({
          platformName: z.string().optional(),
          adminEmail: z.string().email().optional(),
          emailNotificationsEnabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const settings: Record<string, string> = {};
        if (input.platformName !== undefined)
          settings.platform_name = input.platformName;
        if (input.adminEmail !== undefined)
          settings.admin_email = input.adminEmail;
        if (input.emailNotificationsEnabled !== undefined) {
          settings.email_notifications_enabled = input.emailNotificationsEnabled
            ? "true"
            : "false";
        }
        await db.updatePlatformSettings(settings, ctx.user.id);
        return { success: true };
      }),

    // Dashboard stats for admin overview
    dashboardStats: adminProcedure.query(async () => {
      const [totalUsers, messagesToday, emailsSentThisWeek] = await Promise.all(
        [
          db.getTotalUserCount(),
          db.getMessagesTodayCount(),
          db.getEmailsSentThisWeekCount(),
        ]
      );
      return { totalUsers, messagesToday, emailsSentThisWeek };
    }),

    // Get admin users with their display names
    getAdmins: adminProcedure.query(async () => {
      return await db.getAdminUsers();
    }),

    // Update admin display name
    updateAdminDisplayName: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          displayName: z.string().min(1).max(100),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateUserDisplayName(input.userId, input.displayName);
        return { success: true };
      }),

    // Update admin hours settings
    updateAdminHours: adminProcedure
      .input(
        z.object({
          enabled: z.boolean(),
          timezone: z.string().min(1),
          startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
          endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
          days: z.string().min(1),
          avgResponseMinutes: z.number().min(1).max(1440),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const settings: Record<string, string> = {
          admin_hours_enabled: input.enabled ? "true" : "false",
          admin_hours_timezone: input.timezone,
          admin_hours_start: input.startTime,
          admin_hours_end: input.endTime,
          admin_hours_days: input.days,
          admin_avg_response_minutes: String(input.avgResponseMinutes),
        };
        await db.updatePlatformSettings(settings, ctx.user.id);
        return { success: true };
      }),

    // Public endpoint: get admin availability status (for members to see)
    getAdminAvailability: publicProcedure.query(async () => {
      const settings = await db.getPlatformSettings();
      const enabled = settings.admin_hours_enabled === "true";
      if (!enabled) {
        return { available: true, message: "Team MojiTax is available" };
      }

      const timezone = settings.admin_hours_timezone || "Europe/London";
      const startTime = settings.admin_hours_start || "09:00";
      const endTime = settings.admin_hours_end || "17:00";
      const days = (settings.admin_hours_days || "mon,tue,wed,thu,fri").split(
        ","
      );
      const avgMins = parseInt(settings.admin_avg_response_minutes || "60", 10);

      // Calculate current time in admin timezone
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const weekday = parts
        .find(p => p.type === "weekday")
        ?.value?.toLowerCase()
        .slice(0, 3);
      const hour = parseInt(
        parts.find(p => p.type === "hour")?.value || "0",
        10
      );
      const minute = parseInt(
        parts.find(p => p.type === "minute")?.value || "0",
        10
      );
      const currentMinutes = hour * 60 + minute;

      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      const isWorkDay = days.includes(weekday || "");
      const isWorkHours =
        currentMinutes >= startMinutes && currentMinutes < endMinutes;
      const available = isWorkDay && isWorkHours;

      return {
        available,
        message: available
          ? `Team MojiTax is online. Average response time: ~${avgMins} minutes.`
          : `Team MojiTax is currently offline. Hours: ${startTime}-${endTime} (${timezone}). Average response time: ~${avgMins} minutes.`,
        avgResponseMinutes: avgMins,
        hours: `${startTime}-${endTime}`,
        timezone,
        days: days.join(", "),
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
