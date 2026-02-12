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
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createTestUser(
  role: "user" | "admin" = "user",
  overrides?: Partial<AuthenticatedUser>
): AuthenticatedUser {
  return {
    id: role === "admin" ? 1 : 2,
    openId: `test-${role}`,
    email: `${role}@test.com`,
    name: `Test ${role}`,
    displayName: null,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    lastSignedIn: new Date(),
    isSuspended: false,
    suspensionReason: null,
    suspendedAt: null,
    suspendedUntil: null,
    suspendedBy: null,
    ...overrides,
  };
}

// =====================================================================
// S5.1 — @moji boundaries & KB management
// =====================================================================
describe("S5.1: @moji boundaries & KB management", () => {
  it("knowledge base CRUD requires admin role — regular user is blocked", async () => {
    const user = createTestUser("user");
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    // Regular user cannot list all KB entries (admin-only procedure)
    await expect(caller.mojiKnowledge.getAll()).rejects.toThrow(/admin/i);

    // Regular user cannot create KB entries
    await expect(
      caller.mojiKnowledge.create({
        question: "Test Q",
        answer: "Test A",
      })
    ).rejects.toThrow(/admin/i);

    // Regular user cannot delete KB entries
    await expect(caller.mojiKnowledge.delete({ id: 1 })).rejects.toThrow(
      /admin/i
    );
  });

  it("knowledge base bulk upload requires admin role", async () => {
    const user = createTestUser("user");
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.mojiKnowledge.bulkUpload({
        entries: [{ question: "Q", answer: "A" }],
      })
    ).rejects.toThrow(/admin/i);
  });

  it("unauthenticated user cannot create KB entries", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.mojiKnowledge.create({
        question: "Q",
        answer: "A",
      })
    ).rejects.toThrow();
  });
});

// =====================================================================
// S5.2 — @moji role clarity (chatbot system prompt boundaries)
// =====================================================================
describe("S5.2: @moji role clarity", () => {
  it("chatbot module exports generateChatbotResponse and handleUserMessage", async () => {
    const chatbot = await import("./chatbot");
    expect(typeof chatbot.generateChatbotResponse).toBe("function");
    expect(typeof chatbot.handleUserMessage).toBe("function");
  });

  it("chatbot system prompt includes CAN/CANNOT boundary rules", async () => {
    // Read chatbot.ts source directly to verify the system prompt content
    const fs = await import("fs");
    const path = await import("path");
    const chatbotSource = fs.readFileSync(
      path.resolve(import.meta.dirname, "chatbot.ts"),
      "utf-8"
    );

    // Verify the system prompt includes boundary sections
    expect(chatbotSource).toContain("WHAT YOU CAN DO");
    expect(chatbotSource).toContain("WHAT YOU CANNOT DO");
    expect(chatbotSource).toContain("CANNOT give specific tax advice");
    expect(chatbotSource).toContain("CANNOT access or modify user accounts");
    expect(chatbotSource).toContain("CANNOT provide legal advice");
    expect(chatbotSource).toContain("first point of contact");
    expect(chatbotSource).toContain("Escalate to Team MojiTax");
  });
});

// =====================================================================
// S5.3 — Admin availability hours & response time
// =====================================================================
describe("S5.3: Admin availability hours & response time", () => {
  it("updateAdminHours requires admin role — regular user is blocked", async () => {
    const user = createTestUser("user");
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.settings.updateAdminHours({
        enabled: true,
        timezone: "Europe/London",
        startTime: "09:00",
        endTime: "17:00",
        days: "mon,tue,wed,thu,fri",
        avgResponseMinutes: 30,
      })
    ).rejects.toThrow(/admin/i);
  });

  it("updateAdminHours rejects unauthenticated users", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.settings.updateAdminHours({
        enabled: true,
        timezone: "Europe/London",
        startTime: "09:00",
        endTime: "17:00",
        days: "mon,tue,wed,thu,fri",
        avgResponseMinutes: 30,
      })
    ).rejects.toThrow();
  });

  it("updateAdminHours validates time format", async () => {
    const admin = createTestUser("admin");
    const ctx = createMockContext(admin);
    const caller = appRouter.createCaller(ctx);

    // Invalid time format should fail Zod validation
    await expect(
      caller.settings.updateAdminHours({
        enabled: true,
        timezone: "Europe/London",
        startTime: "9am", // Invalid format, needs HH:MM
        endTime: "17:00",
        days: "mon,tue,wed,thu,fri",
        avgResponseMinutes: 30,
      })
    ).rejects.toThrow();
  });
});

// =====================================================================
// S5.4 — Groups private, channels purpose-linked
// =====================================================================
describe("S5.4: Groups private, channels purpose-linked", () => {
  it("topic channel creation without Learnworlds link is rejected", async () => {
    const admin = createTestUser("admin");
    const ctx = createMockContext(admin);
    const caller = appRouter.createCaller(ctx);

    // Admin tries to create topic channel without any Learnworlds link
    await expect(
      caller.channels.create({
        name: "Unlinked Topic",
        type: "topic",
        isPrivate: false,
      })
    ).rejects.toThrow(/must be linked/i);
  });

  it("regular user cannot create topic channels", async () => {
    const user = createTestUser("user");
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.channels.create({
        name: "User Topic",
        type: "topic",
        isPrivate: false,
        learnworldsCourseId: "course_123",
      })
    ).rejects.toThrow(/Only admins/i);
  });

  it("group suspend endpoint requires admin role", async () => {
    const user = createTestUser("user");
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    // Regular user cannot suspend a group
    await expect(
      caller.studyGroups.suspend({
        id: 1,
        reason: "Complaint received",
      })
    ).rejects.toThrow(/admin/i);
  });

  it("group unsuspend endpoint requires admin role", async () => {
    const user = createTestUser("user");
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.studyGroups.unsuspend({ id: 1 })).rejects.toThrow(
      /admin/i
    );
  });
});

// =====================================================================
// S5.5 — Username privacy — display name self-service
// =====================================================================
describe("S5.5: Username privacy — display name self-service", () => {
  it("display name rejects names shorter than 2 characters", async () => {
    const user = createTestUser("user");
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.memberAuth.updateDisplayName({ displayName: "A" })
    ).rejects.toThrow();
  });

  it("display name rejects names with special characters (XSS prevention)", async () => {
    const user = createTestUser("user");
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    // Script tags
    await expect(
      caller.memberAuth.updateDisplayName({
        displayName: "<script>alert(1)</script>",
      })
    ).rejects.toThrow();

    // SQL-like characters
    await expect(
      caller.memberAuth.updateDisplayName({ displayName: "'; DROP TABLE--" })
    ).rejects.toThrow();
  });

  it("display name rejects names exceeding 30 characters", async () => {
    const user = createTestUser("user");
    const ctx = createMockContext(user);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.memberAuth.updateDisplayName({
        displayName: "A".repeat(31),
      })
    ).rejects.toThrow();
  });

  it("display name requires authentication", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.memberAuth.updateDisplayName({ displayName: "ValidName" })
    ).rejects.toThrow();
  });
});

// =====================================================================
// S5.6 — Non-logged-in access tightened
// =====================================================================
describe("S5.6: Non-logged-in access tightened", () => {
  it("unauthenticated users cannot send messages", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.messages.send({
        channelId: 1,
        content: "Unauthorized message attempt",
      })
    ).rejects.toThrow();
  });

  it("unauthenticated users cannot create study groups", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.studyGroups.create({
        name: "Unauthorized Group",
        description: "Should fail",
      })
    ).rejects.toThrow();
  });

  it("unauthenticated users cannot access settings update", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.settings.update({
        platformName: "Hacked",
      })
    ).rejects.toThrow();
  });

  it("unauthenticated users cannot update display names", async () => {
    const ctx = createMockContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.memberAuth.updateDisplayName({ displayName: "Anon" })
    ).rejects.toThrow();
  });
});
