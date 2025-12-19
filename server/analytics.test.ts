import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("Chat Analytics System", () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let testUserId: number;
  let testAdminId: number;

  beforeEach(async () => {
    // Create test user
    await db.upsertUser({
      openId: "test-user-analytics",
      name: "Test User",
      email: "testuser@example.com",
      role: "user",
    });

    // Create test admin
    await db.upsertUser({
      openId: "test-admin-analytics",
      name: "Test Admin",
      email: "testadmin@example.com",
      role: "admin",
    });

    const user = await db.getUserByOpenId("test-user-analytics");
    const admin = await db.getUserByOpenId("test-admin-analytics");

    testUserId = user!.id;
    testAdminId = admin!.id;

    // Create admin caller
    adminCaller = appRouter.createCaller({
      user: {
        id: testAdminId,
        openId: "test-admin-analytics",
        name: "Test Admin",
        email: "testadmin@example.com",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });
  });

  it("should get analytics summary stats", async () => {
    const stats = await adminCaller.analytics.getSummaryStats({});

    expect(stats).toBeDefined();
    expect(stats.totalConversations).toBeTypeOf("number");
    expect(stats.botAnswered).toBeTypeOf("number");
    expect(stats.humanAnswered).toBeTypeOf("number");
    expect(stats.noAnswer).toBeTypeOf("number");
    expect(stats.escalated).toBeTypeOf("number");
    expect(stats.avgBotInteractions).toBeTypeOf("number");
    expect(stats.avgHumanInteractions).toBeTypeOf("number");
  });

  it("should filter analytics by resolution type", async () => {
    // Create user caller
    const userCaller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-user-analytics",
        name: "Test User",
        email: "testuser@example.com",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Create a ticket
    const ticket = await userCaller.support.create({
      subject: "Test ticket for analytics",
      initialMessage: "Test message",
    });

    // Update ticket with resolution type
    await adminCaller.analytics.updateTicketCategory({
      ticketId: ticket.ticketId,
      resolutionType: "bot-answered",
      enquiryType: "VAT",
      tags: "test,analytics",
    });

    // Get analytics filtered by bot-answered
    const results = await adminCaller.analytics.getSupportAnalytics({
      resolutionType: "bot-answered",
    });

    expect(Array.isArray(results)).toBe(true);
    const foundTicket = results.find((t) => t.id === ticket.ticketId);
    expect(foundTicket).toBeDefined();
    expect(foundTicket?.resolutionType).toBe("bot-answered");
    expect(foundTicket?.enquiryType).toBe("VAT");
    expect(foundTicket?.tags).toBe("test,analytics");
  });

  it("should filter analytics by enquiry type", async () => {
    const userCaller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-user-analytics",
        name: "Test User",
        email: "testuser@example.com",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Create ticket
    const ticket = await userCaller.support.create({
      subject: "VAT question",
      initialMessage: "Question about VAT",
    });

    // Categorize
    await adminCaller.analytics.updateTicketCategory({
      ticketId: ticket.ticketId,
      enquiryType: "VAT",
    });

    // Filter by enquiry type
    const results = await adminCaller.analytics.getSupportAnalytics({
      enquiryType: "VAT",
    });

    expect(results.length).toBeGreaterThan(0);
    const foundTicket = results.find((t) => t.id === ticket.ticketId);
    expect(foundTicket?.enquiryType).toBe("VAT");
  });

  it("should filter analytics by status", async () => {
    const results = await adminCaller.analytics.getSupportAnalytics({
      status: "open",
    });

    expect(Array.isArray(results)).toBe(true);
    // All results should have status "open"
    results.forEach((ticket) => {
      expect(ticket.status).toBe("open");
    });
  });

  it("should filter analytics by search query", async () => {
    const userCaller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-user-analytics",
        name: "Test User",
        email: "testuser@example.com",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Create ticket with specific subject
    const ticket = await userCaller.support.create({
      subject: "Unique search term XYZ123",
      initialMessage: "Test message",
    });

    // Search for it
    const results = await adminCaller.analytics.getSupportAnalytics({
      searchQuery: "XYZ123",
    });

    expect(results.length).toBeGreaterThan(0);
    const foundTicket = results.find((t) => t.id === ticket.ticketId);
    expect(foundTicket).toBeDefined();
    expect(foundTicket?.subject).toContain("XYZ123");
  });

  it("should export data to CSV format", async () => {
    const exportData = await adminCaller.analytics.exportToCSV({});

    expect(exportData).toBeDefined();
    expect(exportData.tickets).toBeDefined();
    expect(Array.isArray(exportData.tickets)).toBe(true);
    expect(exportData.count).toBeTypeOf("number");
  });

  it("should update ticket categorization", async () => {
    const userCaller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-user-analytics",
        name: "Test User",
        email: "testuser@example.com",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Create ticket
    const ticket = await userCaller.support.create({
      subject: "Test ticket",
      initialMessage: "Test message",
    });

    // Update categorization
    const result = await adminCaller.analytics.updateTicketCategory({
      ticketId: ticket.ticketId,
      resolutionType: "human-answered",
      enquiryType: "Transfer Pricing",
      tags: "urgent,complex",
    });

    expect(result.success).toBe(true);

    // Verify update
    const ticketDetails = await db.getSupportTicketById(ticket.ticketId);
    expect(ticketDetails?.resolutionType).toBe("human-answered");
    expect(ticketDetails?.enquiryType).toBe("Transfer Pricing");
    expect(ticketDetails?.tags).toBe("urgent,complex");
  });

  it("should calculate correct summary statistics", async () => {
    const userCaller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: "test-user-analytics",
        name: "Test User",
        email: "testuser@example.com",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    });

    // Create multiple tickets with different resolution types
    const ticket1 = await userCaller.support.create({
      subject: "Ticket 1",
      initialMessage: "Message 1",
    });
    await adminCaller.analytics.updateTicketCategory({
      ticketId: ticket1.ticketId,
      resolutionType: "bot-answered",
    });

    const ticket2 = await userCaller.support.create({
      subject: "Ticket 2",
      initialMessage: "Message 2",
    });
    await adminCaller.analytics.updateTicketCategory({
      ticketId: ticket2.ticketId,
      resolutionType: "human-answered",
    });

    const ticket3 = await userCaller.support.create({
      subject: "Ticket 3",
      initialMessage: "Message 3",
    });
    await adminCaller.analytics.updateTicketCategory({
      ticketId: ticket3.ticketId,
      resolutionType: "escalated",
    });

    // Get summary stats
    const stats = await adminCaller.analytics.getSummaryStats({});

    expect(stats.totalConversations).toBeGreaterThanOrEqual(3);
    expect(stats.botAnswered).toBeGreaterThanOrEqual(1);
    expect(stats.humanAnswered).toBeGreaterThanOrEqual(1);
    expect(stats.escalated).toBeGreaterThanOrEqual(1);
  });
});
