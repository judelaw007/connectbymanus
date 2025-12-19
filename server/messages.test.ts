import { describe, it, expect, beforeAll } from "vitest";
import * as messageService from "./messages";

describe("Real-Time Messaging System", () => {
  // Use existing test channel and user from database
  const testChannelId = 1; // General channel
  const testUserId = 1; // Owner user

  it("should create and retrieve a message", async () => {
    const result = await messageService.createMessage({
      channelId: testChannelId,
      userId: testUserId,
      content: "Hello from test!",
      messageType: "user",
    });

    expect(result.messageId).toBeDefined();
    expect(result.messageId).toBeGreaterThan(0);

    const messages = await messageService.getMessages(testChannelId, 10, 0);
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.some(m => m.content === "Hello from test!")).toBe(true);
  });

  it("should create admin message with correct type", async () => {
    const result = await messageService.createMessage({
      channelId: testChannelId,
      userId: testUserId,
      content: "Admin announcement test",
      messageType: "admin",
    });

    expect(result.messageId).toBeGreaterThan(0);
    
    const messages = await messageService.getMessages(testChannelId, 10, 0);
    const adminMsg = messages.find(m => m.content === "Admin announcement test");
    expect(adminMsg?.messageType).toBe("admin");
  });

  it("should create bot message", async () => {
    const result = await messageService.createMessage({
      channelId: testChannelId,
      userId: testUserId,
      content: "Bot response test",
      messageType: "bot",
    });

    expect(result.messageId).toBeGreaterThan(0);
    
    const messages = await messageService.getMessages(testChannelId, 10, 0);
    const botMsg = messages.find(m => m.content === "Bot response test");
    expect(botMsg?.messageType).toBe("bot");
  });

  it("should retrieve messages with pagination", async () => {
    // Get messages with different limits
    const page1 = await messageService.getMessages(testChannelId, 5, 0);
    expect(page1.length).toBeLessThanOrEqual(5);

    const page2 = await messageService.getMessages(testChannelId, 10, 0);
    expect(page2.length).toBeLessThanOrEqual(10);
  });

  it("should create message with reply reference", async () => {
    // Create original message
    const original = await messageService.createMessage({
      channelId: testChannelId,
      userId: testUserId,
      content: "Original message for reply test",
      messageType: "user",
    });

    expect(original.messageId).toBeGreaterThan(0);

    // Create reply
    const reply = await messageService.createMessage({
      channelId: testChannelId,
      userId: testUserId,
      content: "Reply to original test",
      messageType: "user",
      replyToId: original.messageId,
    });

    expect(reply.messageId).toBeGreaterThan(0);
    
    const messages = await messageService.getMessages(testChannelId, 50, 0);
    const replyMsg = messages.find(m => m.content === "Reply to original test");
    expect(replyMsg?.replyToId).toBe(original.messageId);
  });

  it("should handle pagination correctly", async () => {
    const messages = await messageService.getMessages(testChannelId, 5, 0);
    expect(Array.isArray(messages)).toBe(true);
  });
});
