import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import * as messageService from "./messages";
import * as chatbot from "./chatbot";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  channels: router({
    // Get all public channels
    getPublic: publicProcedure.query(async () => {
      return await db.getPublicChannels();
    }),

    // Get user's channels (requires auth)
    getMy: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserChannels(ctx.user.id);
    }),

    // Get channel by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const channel = await db.getChannelById(input.id);
        if (!channel) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' });
        }
        
        // Check if user has access to private channels
        if (channel.isPrivate) {
          const isMember = await db.isUserInChannel(input.id, ctx.user.id);
          if (!isMember) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }
        
        return channel;
      }),

    // Create a new channel (admin can create topic channels, users can create study groups)
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        type: z.enum(["topic", "study_group"]),
        isPrivate: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        // Only admins can create topic channels
        if (input.type === "topic" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can create topic channels' });
        }

        const inviteCode = input.isPrivate ? nanoid(16) : undefined;
        
        const channelId = await db.createChannel({
          name: input.name,
          description: input.description || null,
          type: input.type,
          isPrivate: input.isPrivate,
          inviteCode: inviteCode || null,
          createdBy: ctx.user.id,
        });

        // Add creator as owner
        await db.addChannelMember({
          channelId,
          userId: ctx.user.id,
          role: "owner",
        });

        return { channelId, inviteCode };
      }),

    // Join a channel
    join: protectedProcedure
      .input(z.object({
        channelId: z.number().optional(),
        inviteCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        let channelId = input.channelId;

        // If invite code provided, find channel by code
        if (input.inviteCode && !channelId) {
          const channels = await db.getAllChannels();
          const channel = channels.find(c => c.inviteCode === input.inviteCode);
          if (!channel) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid invite code' });
          }
          channelId = channel.id;
        }

        if (!channelId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Channel ID or invite code required' });
        }

        const channel = await db.getChannelById(channelId);
        if (!channel) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' });
        }

        // Check if already a member
        const isMember = await db.isUserInChannel(channelId, ctx.user.id);
        if (isMember) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already a member' });
        }

        // For private channels, require invite code
        if (channel.isPrivate && channel.inviteCode !== input.inviteCode) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Invite code required for private channels' });
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
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }

        return await db.getChannelMembers(input.channelId);
      }),

    // Close a channel (owner only)
    close: protectedProcedure
      .input(z.object({ channelId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const members = await db.getChannelMembers(input.channelId);
        const userMember = members.find(m => m.id === ctx.user.id);
        
        if (userMember?.memberRole !== "owner" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only channel owner can close the channel' });
        }

        await db.updateChannel(input.channelId, { isClosed: true });
        return { success: true };
      }),
  }),

  messages: router({
    // Get messages for a channel
    getByChannel: protectedProcedure
      .input(z.object({
        channelId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input, ctx }) => {
        // Check if user has access
        const channel = await db.getChannelById(input.channelId);
        if (!channel) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' });
        }

        if (channel.isPrivate) {
          const isMember = await db.isUserInChannel(input.channelId, ctx.user.id);
          if (!isMember) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }

        return await db.getChannelMessages(input.channelId, input.limit, input.offset);
      }),

    // Get pinned messages
    getPinned: protectedProcedure
      .input(z.object({ channelId: z.number() }))
      .query(async ({ input, ctx }) => {
        const channel = await db.getChannelById(input.channelId);
        if (!channel) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' });
        }

        if (channel.isPrivate) {
          const isMember = await db.isUserInChannel(input.channelId, ctx.user.id);
          if (!isMember) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
          }
        }

        return await db.getPinnedMessages(input.channelId);
      }),

    // Send a message
    send: protectedProcedure
      .input(z.object({
        channelId: z.number(),
        content: z.string().min(1),
        replyToId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if user has access
        const isMember = await db.isUserInChannel(input.channelId, ctx.user.id);
        if (!isMember) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Must be a channel member to send messages' });
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

        // Trigger chatbot if @moji is mentioned
        if (input.content.toLowerCase().includes('@moji')) {
          // Run chatbot response in background (don't await)
          chatbot.handleUserMessage(input.channelId, ctx.user.id, input.content)
            .catch(err => console.error('[Chatbot] Error handling message:', err));
        }

        // TODO: Handle other @mentions and trigger notifications

        return result;
      }),

    // Toggle pin on a message (admin only)
    togglePin: adminProcedure
      .input(z.object({
        messageId: z.number(),
        isPinned: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.togglePinMessage(input.messageId, input.isPinned);
        return { success: true };
      }),
  }),

  posts: router({
    // Create a post (admin only)
    create: adminProcedure
      .input(z.object({
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
      }))
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
        });

        // Create a chat message in the General channel (or specified channel) for this post
        const targetChannelId = input.channelId || 1; // Default to General channel (id: 1)
        
        // Format the post content as a rich message
        let messageContent = `**${input.title}**\n\n${input.content}`;
        
        // Add metadata based on post type
        if (input.postType === "event" && input.eventDate) {
          const dateStr = input.eventDate.toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          });
          messageContent += `\n\n📅 **Event Date:** ${dateStr}`;
          if (input.eventLocation) {
            messageContent += `\n📍 **Location:** ${input.eventLocation}`;
          }
        } else if (input.postType === "article" && input.tags) {
          messageContent += `\n\n🏷️ **Tags:** ${input.tags}`;
        } else if (input.postType === "announcement" && input.priorityLevel) {
          const priorityEmoji = {
            low: '📌',
            medium: '📢',
            high: '⚠️',
            urgent: '🚨'
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

        // TODO: Handle email distribution for newsletters and announcements

        return { postId, messageId, success: true };
      }),

    // Get posts by type
    getByType: publicProcedure
      .input(z.object({
        postType: z.enum(["event", "announcement", "article", "newsletter"]),
        limit: z.number().default(20),
      }))
      .query(async ({ input }) => {
        return await db.getPostsByType(input.postType, input.limit);
      }),

    // Get post by ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const post = await db.getPostById(input.id);
        if (!post) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
        }
        return post;
      }),

    // Toggle pin on a post (admin only)
    togglePin: adminProcedure
      .input(z.object({
        postId: z.number(),
        isPinned: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.togglePinPost(input.postId, input.isPinned);
        return { success: true };
      }),
  }),

  support: router({
    // Create a support ticket
    create: protectedProcedure
      .input(z.object({ subject: z.string(), initialMessage: z.string() }))
      .mutation(async ({ ctx, input }) => {
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

        // TODO: Send email notification to admin@mojitax.com

        return { ticketId, success: true };
      }),

    // Get all support tickets (admin only)
    getAll: adminProcedure.query(async () => {
      return await db.getAllSupportTickets();
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
        const messageId = await db.createSupportMessage({
          ticketId: input.ticketId,
          senderId: ctx.user.id,
          senderType: ctx.user.role === "admin" ? "admin" : "user",
          content: input.content,
        });

        // Update ticket's lastMessageAt
        await db.updateSupportTicket(input.ticketId, {
          lastMessageAt: new Date(),
        });

        // TODO: Send email notification if recipient is offline

        return { messageId, success: true };
      }),

    // Assign a ticket to an admin
    assign: adminProcedure
      .input(z.object({ ticketId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateSupportTicket(input.ticketId, {
          status: "in-progress",
          assignedToAdminId: ctx.user.id,
        });
        return { success: true };
      }),

    // Close a support ticket
    close: adminProcedure
      .input(z.object({ ticketId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateSupportTicket(input.ticketId, {
          status: "closed",
          closedAt: new Date(),
        });
        // TODO: Send email transcript to user
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
      .input(z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
        category: z.string().optional(),
        tags: z.string().optional(),
      }))
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
      .input(z.object({
        id: z.number(),
        question: z.string().optional(),
        answer: z.string().optional(),
        category: z.string().optional(),
        tags: z.string().optional(),
      }))
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
      .input(z.object({
        entries: z.array(z.object({
          question: z.string(),
          answer: z.string(),
          category: z.string().optional(),
          tags: z.string().optional(),
        }))
      }))
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
      .input(z.object({
        recipientEmail: z.string().email(),
        recipientName: z.string().optional(),
        subject: z.string(),
        content: z.string(),
        emailType: z.enum(["announcement", "reply", "mention", "ticket", "group_notification", "newsletter"]),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createEmailLog({
          recipientEmail: input.recipientEmail,
          recipientName: input.recipientName || null,
          subject: input.subject,
          content: input.content,
          emailType: input.emailType,
          status: "pending",
        });
        return { id, success: true };
      }),
  }),

  analytics: router({
    // Get support ticket analytics with filters
    getSupportAnalytics: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        resolutionType: z.enum(["bot-answered", "human-answered", "no-answer", "escalated"]).optional(),
        enquiryType: z.string().optional(),
        status: z.enum(["open", "in-progress", "closed"]).optional(),
        searchQuery: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return await db.getSupportAnalytics(input);
      }),

    // Get analytics summary stats
    getSummaryStats: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getAnalyticsSummary(input);
      }),

    // Update ticket categorization
    updateTicketCategory: adminProcedure
      .input(z.object({
        ticketId: z.number(),
        resolutionType: z.enum(["bot-answered", "human-answered", "no-answer", "escalated"]).optional(),
        enquiryType: z.string().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { ticketId, ...updates } = input;
        await db.updateSupportTicket(ticketId, updates);
        return { success: true };
      }),

    // Export filtered conversations to CSV
    exportToCSV: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        resolutionType: z.enum(["bot-answered", "human-answered", "no-answer", "escalated"]).optional(),
        enquiryType: z.string().optional(),
        status: z.enum(["open", "in-progress", "closed"]).optional(),
      }))
      .query(async ({ input }) => {
        const tickets = await db.getSupportAnalytics({ ...input, limit: 10000, offset: 0 });
        return { tickets, count: tickets.length };
      }),
  }),
});

export type AppRouter = typeof appRouter;
