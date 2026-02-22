import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { createMessage } from "./messages";

interface ChatbotResponse {
  content: string;
  confidence: "high" | "medium" | "low";
  shouldEscalate: boolean;
  knowledgeBaseUsed: boolean;
  sources?: string[];
}

/**
 * Search knowledge base for relevant information
 */
async function searchKnowledgeBase(
  query: string
): Promise<{ question: string; answer: string }[]> {
  const allKB = await db.getAllKnowledgeBase();

  // Simple keyword matching - can be enhanced with vector search later
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter(w => w.length > 3);

  const matches = allKB
    .map(entry => {
      const questionLower = entry.question.toLowerCase();
      const answerLower = entry.answer.toLowerCase();

      // Calculate relevance score
      let score = 0;
      keywords.forEach(keyword => {
        if (questionLower.includes(keyword)) score += 3;
        if (answerLower.includes(keyword)) score += 1;
      });

      return { entry, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => ({
      question: item.entry.question,
      answer: item.entry.answer,
    }));

  return matches;
}

/**
 * Generate chatbot response using knowledge base and LLM
 */
export async function generateChatbotResponse(
  userMessage: string,
  channelId: number,
  userId: number,
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> = []
): Promise<ChatbotResponse> {
  try {
    // Search knowledge base
    const kbMatches = await searchKnowledgeBase(userMessage);

    // Check for explicit escalation requests
    const escalationKeywords = [
      "human",
      "agent",
      "person",
      "talk to someone",
      "speak to team",
      "real person",
    ];
    const requestsHuman = escalationKeywords.some(keyword =>
      userMessage.toLowerCase().includes(keyword)
    );

    if (requestsHuman) {
      return {
        content:
          "I understand you'd like to speak with a human team member. Let me connect you with Team MojiTax. They'll be able to assist you shortly.\n\nIn the meantime, feel free to describe your question in detail so they have context when they respond.",
        confidence: "high",
        shouldEscalate: true,
        knowledgeBaseUsed: false,
      };
    }

    // No KB matches = no answer. Do not call the LLM at all.
    // @moji only speaks from its knowledge base.
    if (kbMatches.length === 0) {
      const noMatchResponse =
        "I don't have information about that in my knowledge base yet. Let me connect you with Team MojiTax who can provide expert guidance on this topic.\n\nYou can use the Chat with Team MojiTax feature to create a support ticket, or I can escalate this for you right away. Would you like me to do that?";

      // Flag for admin to review and potentially add to KB
      db.createFlaggedQuestion({
        question: userMessage,
        userId: userId || null,
        channelId: channelId || null,
        botResponse: null,
        confidence: "low",
      }).catch(err => console.error("[Chatbot] Error flagging question:", err));

      return {
        content: noMatchResponse,
        confidence: "low",
        shouldEscalate: true,
        knowledgeBaseUsed: false,
      };
    }

    // Build context for LLM — only called when we have KB matches
    const systemPrompt = `You are @moji, the AI assistant for MojiTax Connect — a community platform for tax professionals studying for ADIT (Advanced Diploma in International Taxation) and other tax qualifications offered by MojiTax.

## CRITICAL RULE — KNOWLEDGE BASE ONLY
You can ONLY answer using the knowledge base entries provided below. You must NEVER add information from your own general knowledge. Do not recommend external websites, organizations, or professionals. Do not provide generic advice. Stick strictly to what the knowledge base says.

## FORMATTING — PLAIN TEXT ONLY
You MUST respond in plain text. Do NOT use markdown formatting:
- No **bold** or *italic* (no asterisks for emphasis)
- No # headings
- No markdown link syntax like [text](url)
- If you need to share a URL, paste it as a plain URL (e.g. https://example.com)
- Use simple dashes (-) for bullet lists
- Use line breaks to separate paragraphs

## RESPONSE STYLE
- Keep responses concise (2-3 paragraphs max)
- Use simple dashes for lists
- Be friendly, professional, and encouraging
- Rephrase knowledge base answers naturally but do not add new information
- Always end with an offer to help further or to escalate to Team MojiTax

## KNOWLEDGE BASE (use ONLY this information to answer):
${kbMatches.map((match, i) => `${i + 1}. Q: ${match.question}\n   A: ${match.answer}`).join("\n\n")}

Use ONLY the above information to answer. Do not add anything beyond what is provided.`;

    // Build conversation history for context
    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-4), // Last 4 messages for context
      { role: "user", content: userMessage },
    ];

    // Call LLM
    const response = await invokeLLM({ messages });
    const messageContent = response.choices[0]?.message?.content;
    const botResponse =
      typeof messageContent === "string"
        ? messageContent
        : "I'm sorry, I couldn't generate a response. Please try again or contact Team MojiTax for assistance.";

    // Determine confidence based on knowledge base match count
    const confidence: "high" | "medium" | "low" =
      kbMatches.length >= 2 ? "high" : "medium";

    return {
      content: botResponse,
      confidence,
      shouldEscalate: false,
      knowledgeBaseUsed: true,
      sources: kbMatches.map(m => m.question),
    };
  } catch (error) {
    console.error("[Chatbot] Error generating response:", error);

    return {
      content:
        "I'm experiencing technical difficulties right now. Please try again in a moment, or contact Team MojiTax directly for immediate assistance.",
      confidence: "low",
      shouldEscalate: true,
      knowledgeBaseUsed: false,
    };
  }
}

/**
 * Handle incoming message and generate bot response if needed
 */
export async function handleUserMessage(
  channelId: number,
  userId: number,
  messageContent: string
): Promise<void> {
  // Check if message mentions @moji
  const mentionsMoji = messageContent.toLowerCase().includes("@moji");

  if (!mentionsMoji) {
    return; // Don't respond if not mentioned
  }

  // Get recent conversation history
  const recentMessages = await db.getChannelMessages(channelId, 10, 0);
  const conversationHistory = recentMessages
    .reverse()
    .filter(m => m.userId === userId || m.messageType === "bot")
    .slice(-4)
    .map(m => ({
      role: (m.messageType === "bot" ? "assistant" : "user") as
        | "user"
        | "assistant",
      content: m.content,
    }));

  // Generate bot response
  const response = await generateChatbotResponse(
    messageContent,
    channelId,
    userId,
    conversationHistory
  );

  // Send bot message
  await createMessage({
    channelId,
    userId,
    content: response.content,
    messageType: "bot",
  });

  // If should escalate, create support ticket
  if (response.shouldEscalate) {
    const user = await db.getUserById(userId);
    await db.createSupportTicket({
      userId,
      subject: "Escalated from @moji chatbot",
      status: "open",
      priority: "medium",
      resolutionType: "escalated",
      enquiryType: "general",
      botInteractionCount: 1,
    });

    // Send initial support message
    const tickets = await db.getAllSupportTickets();
    const ticket = tickets.find(
      t => t.userId === userId && t.subject === "Escalated from @moji chatbot"
    );
    if (ticket) {
      await db.createSupportMessage({
        ticketId: ticket.id,
        senderId: userId,
        senderType: "user",
        content: messageContent,
      });
    }
  }
}
