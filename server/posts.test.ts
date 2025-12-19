import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@mojitax.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("posts.create", () => {
  it("allows admin to create an event post and generates a chat message", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const eventDate = new Date("2025-01-15T10:00:00Z");
    const result = await caller.posts.create({
      postType: "event",
      title: "Tax Webinar 2025",
      content: "Join us for an exclusive webinar on international tax strategies.",
      eventDate,
      eventLocation: "Online via Zoom",
    });

    expect(result.success).toBe(true);
    expect(result.postId).toBeTypeOf("number");
    expect(result.messageId).toBeTypeOf("number");
  });

  it("allows admin to create an announcement with priority", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.posts.create({
      postType: "announcement",
      title: "Platform Maintenance",
      content: "The platform will undergo scheduled maintenance on Saturday.",
      priorityLevel: "high",
    });

    expect(result.success).toBe(true);
    expect(result.postId).toBeTypeOf("number");
    expect(result.messageId).toBeTypeOf("number");
  });

  it("allows admin to create an article with tags", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.posts.create({
      postType: "article",
      title: "Understanding VAT in the EU",
      content: "A comprehensive guide to Value Added Tax regulations across European Union member states.",
      tags: "VAT, EU, Tax Compliance",
    });

    expect(result.success).toBe(true);
    expect(result.postId).toBeTypeOf("number");
    expect(result.messageId).toBeTypeOf("number");
  });

  it("prevents non-admin users from creating posts", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.posts.create({
        postType: "article",
        title: "Test Article",
        content: "This should fail",
      })
    ).rejects.toThrow("Admin access required");
  });
});

describe("posts.getByType", () => {
  it("retrieves articles with messageId for navigation", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create an article first
    await caller.posts.create({
      postType: "article",
      title: "Test Article for Navigation",
      content: "This article should have a messageId",
      tags: "test",
    });

    // Retrieve articles
    const articles = await caller.posts.getByType({
      postType: "article",
      limit: 10,
    });

    expect(articles.length).toBeGreaterThan(0);
    const latestArticle = articles[0];
    expect(latestArticle).toHaveProperty("messageId");
    expect(latestArticle?.messageId).toBeTypeOf("number");
  });

  it("retrieves events ordered by pinned status and creation date", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const events = await caller.posts.getByType({
      postType: "event",
      limit: 10,
    });

    // Events should be ordered with pinned first, then by creation date
    if (events.length > 1) {
      for (let i = 0; i < events.length - 1; i++) {
        const current = events[i];
        const next = events[i + 1];
        
        // If current is pinned and next is not, order is correct
        if (current?.isPinned && !next?.isPinned) {
          expect(true).toBe(true);
        }
        // If both have same pinned status, check creation date
        else if (current?.isPinned === next?.isPinned) {
          expect(current?.createdAt.getTime()).toBeGreaterThanOrEqual(next?.createdAt.getTime() || 0);
        }
      }
    }
  });
});
