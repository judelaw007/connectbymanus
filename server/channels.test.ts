import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createTestUser(role: "user" | "admin" = "user"): AuthenticatedUser {
  return {
    id: role === "admin" ? 1 : 2,
    openId: `test-${role}`,
    email: `${role}@test.com`,
    name: `Test ${role}`,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

describe("channels.getPublic", () => {
  it("returns public channels without authentication", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const channels = await caller.channels.getPublic();

    expect(Array.isArray(channels)).toBe(true);
    expect(channels.length).toBeGreaterThan(0);
    expect(channels.every(c => !c.isPrivate)).toBe(true);
  });
});

describe("channels.getMy", () => {
  it("requires authentication", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.channels.getMy()).rejects.toThrow();
  });

  it("returns user's channels when authenticated", async () => {
    const user = createTestUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    const channels = await caller.channels.getMy();

    expect(Array.isArray(channels)).toBe(true);
  });
});

describe("channels.create", () => {
  it("requires authentication", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.channels.create({
        name: "Test Group",
        type: "study_group",
        isPrivate: false,
      })
    ).rejects.toThrow();
  });

  it("allows users to create study groups", async () => {
    const user = createTestUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.channels.create({
      name: "Test Study Group",
      description: "A test study group",
      type: "study_group",
      isPrivate: false,
    });

    expect(result.channelId).toBeGreaterThan(0);
  });

  it("generates invite code for private groups", async () => {
    const user = createTestUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.channels.create({
      name: "Private Study Group",
      type: "study_group",
      isPrivate: true,
    });

    expect(result.inviteCode).toBeDefined();
    expect(typeof result.inviteCode).toBe("string");
    expect(result.inviteCode!.length).toBeGreaterThan(0);
  });

  it("only allows admins to create topic channels", async () => {
    const user = createTestUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.channels.create({
        name: "New Topic",
        type: "topic",
        isPrivate: false,
      })
    ).rejects.toThrow();
  });

  it("allows admins to create topic channels", async () => {
    const admin = createTestUser("admin");
    const ctx = createMockContext(admin);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.channels.create({
      name: "Admin Topic",
      type: "topic",
      isPrivate: false,
    });

    expect(result.channelId).toBeGreaterThan(0);
  });
});

describe("messages.send", () => {
  it("requires authentication", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.messages.send({
        channelId: 1,
        content: "Test message",
      })
    ).rejects.toThrow();
  });

  it("requires channel membership to send messages", async () => {
    const user = createTestUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    // Trying to send to a channel the user is not a member of
    await expect(
      caller.messages.send({
        channelId: 999999,
        content: "Test message",
      })
    ).rejects.toThrow();
  });
});

describe("posts.create", () => {
  it("requires admin role", async () => {
    const user = createTestUser();
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.posts.create({
        postType: "announcement",
        title: "Test Announcement",
        content: "This is a test",
      })
    ).rejects.toThrow();
  });

  it("allows admins to create posts", async () => {
    const admin = createTestUser("admin");
    const ctx = createMockContext(admin);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.posts.create({
      postType: "announcement",
      title: "Important Announcement",
      content: "This is an important announcement",
      priorityLevel: "high",
    });

    expect(result.postId).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });

  it("allows admins to create events with date", async () => {
    const admin = createTestUser("admin");
    const ctx = createMockContext(admin);
    const caller = appRouter.createCaller(ctx);

    const eventDate = new Date("2025-06-15T10:00:00Z");

    const result = await caller.posts.create({
      postType: "event",
      title: "Tax Webinar",
      content: "Join us for an interactive tax webinar",
      eventDate,
      eventLocation: "https://zoom.us/meeting",
    });

    expect(result.postId).toBeGreaterThan(0);
  });

  it("allows admins to create articles with tags", async () => {
    const admin = createTestUser("admin");
    const ctx = createMockContext(admin);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.posts.create({
      postType: "article",
      title: "Understanding VAT",
      content: "A comprehensive guide to VAT regulations",
      tags: "vat,tax,regulations",
      featuredImage: "https://example.com/image.jpg",
    });

    expect(result.postId).toBeGreaterThan(0);
  });
});

describe("posts.getByType", () => {
  it("returns posts of specified type", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const announcements = await caller.posts.getByType({
      postType: "announcement",
      limit: 10,
    });

    expect(Array.isArray(announcements)).toBe(true);
  });
});
