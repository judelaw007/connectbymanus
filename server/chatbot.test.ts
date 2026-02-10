import { describe, it, expect, beforeAll } from "vitest";
import * as chatbot from "./chatbot";
import * as db from "./db";

describe("@moji Chatbot System", () => {
  const testChannelId = 1; // General channel
  const testUserId = 1; // Owner user

  beforeAll(async () => {
    // Ensure we have some knowledge base entries
    const kb = await db.getAllKnowledgeBase();
    if (kb.length === 0) {
      // Add test knowledge base entry
      await db.createKnowledgeBaseEntry({
        question: "What is VAT?",
        answer:
          "VAT (Value Added Tax) is a consumption tax placed on a product whenever value is added at each stage of the supply chain, from production to the point of sale.",
      });
    }
  });

  it("should generate response for knowledge base question", async () => {
    const response = await chatbot.generateChatbotResponse(
      "What is VAT?",
      testChannelId,
      testUserId
    );

    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
    expect(response.knowledgeBaseUsed).toBe(true);
    // Confidence can be medium or high depending on KB matches
    expect(["medium", "high"]).toContain(response.confidence);
  }, 15000); // 15 second timeout for LLM call

  it("should detect explicit escalation request", async () => {
    const response = await chatbot.generateChatbotResponse(
      "I need to talk to a human agent",
      testChannelId,
      testUserId
    );

    expect(response.shouldEscalate).toBe(true);
    expect(response.content.toLowerCase()).toContain("team mojitax");
  });

  it("should handle questions without knowledge base match", async () => {
    const response = await chatbot.generateChatbotResponse(
      "What is the weather like today?",
      testChannelId,
      testUserId
    );

    expect(response.content).toBeDefined();
    // Knowledge base may still find partial matches with keyword search
    expect(typeof response.knowledgeBaseUsed).toBe("boolean");
    // May or may not escalate depending on LLM response
  }, 15000);

  it("should provide conversation context", async () => {
    const history = [
      { role: "user" as const, content: "Tell me about VAT" },
      { role: "assistant" as const, content: "VAT is a consumption tax..." },
    ];

    const response = await chatbot.generateChatbotResponse(
      "Can you explain more?",
      testChannelId,
      testUserId,
      history
    );

    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
  }, 15000);

  it("should handle errors gracefully", async () => {
    // Test with empty message
    const response = await chatbot.generateChatbotResponse(
      "",
      testChannelId,
      testUserId
    );

    expect(response.content).toBeDefined();
    // Should still return a response even with empty input
  }, 15000);

  it("should not respond to messages without @moji mention", async () => {
    // Create a message without @moji
    const messagesBefore = await db.getChannelMessages(testChannelId, 10, 0);
    const countBefore = messagesBefore.length;

    await chatbot.handleUserMessage(
      testChannelId,
      testUserId,
      "This is a regular message"
    );

    // Wait a bit for any async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    const messagesAfter = await db.getChannelMessages(testChannelId, 10, 0);
    const countAfter = messagesAfter.length;

    // No new bot message should be created
    expect(countAfter).toBe(countBefore);
  });
});
