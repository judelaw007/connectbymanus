import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Support Ticket System", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testUserId: number;
  let testAdminId: number;

  beforeEach(async () => {
    // Create test user
    await db.upsertUser({
      openId: "test-user-support",
      name: "Test User",
      email: "testuser@example.com",
      role: "user",
    });

    // Create test admin
    await db.upsertUser({
      openId: "test-admin-support",
      name: "Test Admin",
      email: "testadmin@example.com",
      role: "admin",
    });

    const user = await db.getUserByOpenId("test-user-support");
    const admin = await db.getUserByOpenId("test-admin-support");

    testUserId = user!.id;
    testAdminId = admin!.id;

    // Create caller with user context
    caller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-user-support",
        name: "Test User",
        email: "testuser@example.com",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });
  });

  it("should create a support ticket with initial message", async () => {
    const result = await caller.support.create({
      subject: "Need help with VAT",
      initialMessage: "I have a question about VAT rates in the EU",
    });

    expect(result.success).toBe(true);
    expect(result.ticketId).toBeTypeOf("number");

    // Verify ticket was created
    const ticket = await db.getSupportTicketById(result.ticketId);
    expect(ticket).toBeDefined();
    expect(ticket?.subject).toBe("Need help with VAT");
    expect(ticket?.status).toBe("open");
    expect(ticket?.priority).toBe("medium");

    // Verify initial message was created
    const messages = await db.getSupportMessagesByTicket(result.ticketId);
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe(
      "I have a question about VAT rates in the EU"
    );
    expect(messages[0].senderType).toBe("user");
  });

  it("should allow admin to get all support tickets", async () => {
    // Create admin caller
    const adminCaller = appRouter.createCaller({
      user: {
        id: testAdminId,
        openId: "test-admin-support",
        name: "Test Admin",
        email: "testadmin@example.com",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Create a ticket first
    await caller.support.create({
      subject: "Test ticket",
      initialMessage: "Test message",
    });

    // Admin should be able to get all tickets
    const tickets = await adminCaller.support.getAll();
    expect(Array.isArray(tickets)).toBe(true);
    expect(tickets.length).toBeGreaterThan(0);
  });

  it("should allow user to reply to their ticket", async () => {
    // Create ticket
    const createResult = await caller.support.create({
      subject: "Test ticket",
      initialMessage: "Initial message",
    });

    // Reply to ticket
    const replyResult = await caller.support.reply({
      ticketId: createResult.ticketId,
      content: "Additional information",
    });

    expect(replyResult.success).toBe(true);

    // Verify reply was added
    const messages = await db.getSupportMessagesByTicket(createResult.ticketId);
    expect(messages.length).toBe(2);
    expect(messages[1].content).toBe("Additional information");
    expect(messages[1].senderType).toBe("user");
  });

  it("should allow admin to reply to ticket", async () => {
    // Create ticket as user
    const createResult = await caller.support.create({
      subject: "Test ticket",
      initialMessage: "I need help",
    });

    // Create admin caller
    const adminCaller = appRouter.createCaller({
      user: {
        id: testAdminId,
        openId: "test-admin-support",
        name: "Test Admin",
        email: "testadmin@example.com",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Admin replies
    const replyResult = await adminCaller.support.reply({
      ticketId: createResult.ticketId,
      content: "How can I help you?",
    });

    expect(replyResult.success).toBe(true);

    // Verify admin reply
    const messages = await db.getSupportMessagesByTicket(createResult.ticketId);
    expect(messages.length).toBe(2);
    expect(messages[1].content).toBe("How can I help you?");
    expect(messages[1].senderType).toBe("admin");
  });

  it("should allow admin to assign ticket to themselves", async () => {
    // Create ticket
    const createResult = await caller.support.create({
      subject: "Test ticket",
      initialMessage: "Need help",
    });

    // Create admin caller
    const adminCaller = appRouter.createCaller({
      user: {
        id: testAdminId,
        openId: "test-admin-support",
        name: "Test Admin",
        email: "testadmin@example.com",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Assign ticket
    const assignResult = await adminCaller.support.assign({
      ticketId: createResult.ticketId,
    });

    expect(assignResult.success).toBe(true);

    // Verify assignment
    const ticket = await db.getSupportTicketById(createResult.ticketId);
    expect(ticket?.status).toBe("in-progress");
    expect(ticket?.assignedToAdminId).toBe(testAdminId);
  });

  it("should allow admin to close ticket", async () => {
    // Create ticket
    const createResult = await caller.support.create({
      subject: "Test ticket",
      initialMessage: "Need help",
    });

    // Create admin caller
    const adminCaller = appRouter.createCaller({
      user: {
        id: testAdminId,
        openId: "test-admin-support",
        name: "Test Admin",
        email: "testadmin@example.com",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Close ticket
    const closeResult = await adminCaller.support.close({
      ticketId: createResult.ticketId,
    });

    expect(closeResult.success).toBe(true);

    // Verify ticket is closed
    const ticket = await db.getSupportTicketById(createResult.ticketId);
    expect(ticket?.status).toBe("closed");
    expect(ticket?.closedAt).toBeDefined();
  });

  it("should get ticket by ID with messages", async () => {
    // Create ticket
    const createResult = await caller.support.create({
      subject: "Test ticket",
      initialMessage: "Initial message",
    });

    // Add a reply
    await caller.support.reply({
      ticketId: createResult.ticketId,
      content: "Follow-up message",
    });

    // Get ticket details
    const details = await caller.support.getById({
      ticketId: createResult.ticketId,
    });

    expect(details.ticket).toBeDefined();
    expect(details.ticket?.subject).toBe("Test ticket");
    expect(details.messages).toBeDefined();
    expect(details.messages?.length).toBe(2);
  });

  it("should update lastMessageAt when replying", async () => {
    // Create ticket
    const createResult = await caller.support.create({
      subject: "Test ticket",
      initialMessage: "Initial message",
    });

    const ticketBefore = await db.getSupportTicketById(createResult.ticketId);
    const lastMessageBefore = ticketBefore?.lastMessageAt;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Reply
    await caller.support.reply({
      ticketId: createResult.ticketId,
      content: "New message",
    });

    const ticketAfter = await db.getSupportTicketById(createResult.ticketId);
    const lastMessageAfter = ticketAfter?.lastMessageAt;

    expect(new Date(lastMessageAfter!).getTime()).toBeGreaterThan(
      new Date(lastMessageBefore!).getTime()
    );
  });
});
