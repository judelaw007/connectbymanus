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

    // Build context for LLM
    let systemPrompt = `You are @moji, the AI assistant for MojiTax Connect — a community platform for tax professionals studying for ADIT (Advanced Diploma in International Taxation) and other tax qualifications offered by MojiTax.

## CRITICAL RULE — KNOWLEDGE BASE ONLY
You can ONLY answer questions using the information provided below from the MojiTax knowledge base. You must NEVER make up, invent, or infer answers from your own general knowledge. If the knowledge base below does not contain relevant information, you MUST say you don't have that information and offer to connect the user with Team MojiTax.

DO NOT:
- Recommend external websites, organizations, or professionals (e.g. AICPA, NATP, LinkedIn, Google)
- Provide generic advice sourced from your training data
- Answer questions about topics not covered in the knowledge base
- Give tax advice, legal advice, or professional referrals
- Discuss any topic unrelated to MojiTax services or the platform

## YOUR ROLE
You are the first point of contact for members. You can ONLY:
1. Answer questions using the knowledge base provided below
2. Help members navigate the MojiTax Connect platform (channels, groups, support)
3. Direct users to MojiTax courses at mojitax.learnworlds.com
4. Explain MojiTax-specific services and offerings from the knowledge base
5. Escalate to Team MojiTax when the knowledge base does not cover the question

## WHAT YOU CANNOT DO — HARD BOUNDARIES
- You CANNOT give specific tax advice for individual situations — escalate to Team MojiTax
- You CANNOT answer course-specific questions (exam answers, study material content) — escalate
- You CANNOT access or modify user accounts, subscriptions, or billing — escalate
- You CANNOT provide legal advice or professional referrals — escalate
- You CANNOT discuss topics not in the knowledge base — say you don't have that information
- You CANNOT recommend external organizations, websites, or services outside MojiTax

## RESPONSE STYLE
- Keep responses concise (2-3 paragraphs max)
- Use bullet points for lists
- Be friendly, professional, and encouraging
- When the knowledge base doesn't cover a topic, say: "I don't have specific information about that in my knowledge base. Let me connect you with Team MojiTax who can help."
- Always end with an offer to help further or to escalate`;

    if (kbMatches.length > 0) {
      systemPrompt += `\n\n## KNOWLEDGE BASE (use ONLY this information to answer):\n`;
      kbMatches.forEach((match, i) => {
        systemPrompt += `\n${i + 1}. Q: ${match.question}\n   A: ${match.answer}\n`;
      });
      systemPrompt += `\nUse ONLY the above information to answer. Rephrase naturally but do not add information beyond what is provided.`;
    } else {
      systemPrompt += `\n\n## KNOWLEDGE BASE: No matching information found.\nYou have NO relevant knowledge base entries for this question. You MUST tell the user you don't have that information and offer to connect them with Team MojiTax. Do NOT attempt to answer from your own knowledge.`;
    }

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

    // Determine confidence based on knowledge base matches and response
    let confidence: "high" | "medium" | "low" = "medium";
    if (kbMatches.length >= 2) {
      confidence = "high";
    } else if (kbMatches.length === 0) {
      confidence = "low";
    }

    // Check if response indicates uncertainty
    const uncertaintyPhrases = [
      "i'm not sure",
      "i don't know",
      "unclear",
      "uncertain",
      "not confident",
    ];
    if (
      uncertaintyPhrases.some(phrase =>
        botResponse.toLowerCase().includes(phrase)
      )
    ) {
      confidence = "low";
    }

    // Decide if we should escalate
    const shouldEscalate = confidence === "low" && kbMatches.length === 0;

    let finalResponse = botResponse;

    // When there are no KB matches, check if the LLM hallucinated external advice
    // (mentioning organizations, websites, or services outside MojiTax)
    if (kbMatches.length === 0) {
      const hallucinationPatterns = [
        /\b(AICPA|NATP|IRS|HMRC|LinkedIn|Google|Indeed|Yelp)\b/i,
        /\b(professional association|certified professional|tax advisor|tax consultant)\b/i,
        /\b(search online|online search|check with|look for|find a)\b/i,
        /\b(referral|directory|directories)\b/i,
        /\bhttps?:\/\/(?!mojitax)/i,
      ];

      const isHallucinating = hallucinationPatterns.some(pattern =>
        pattern.test(botResponse)
      );

      if (isHallucinating) {
        finalResponse =
          "I don't have specific information about that in my knowledge base. I'd recommend reaching out to Team MojiTax who can provide expert guidance on this topic.\n\nYou can use the **Chat with Team MojiTax** feature to create a support ticket, or I can escalate this for you right away. Would you like me to do that?";
      } else if (shouldEscalate) {
        finalResponse +=
          "\n\n_If you'd like more detailed assistance, I can connect you with Team MojiTax who can provide expert guidance._";
      }
    } else if (shouldEscalate) {
      finalResponse +=
        "\n\n_If you'd like more detailed assistance, I can connect you with Team MojiTax who can provide expert guidance._";
    }

    // Flag questions @moji struggled with for admin review
    if (confidence === "low" && kbMatches.length === 0) {
      db.createFlaggedQuestion({
        question: userMessage,
        userId: userId || null,
        channelId: channelId || null,
        botResponse: botResponse.substring(0, 500),
        confidence,
      }).catch(err => console.error("[Chatbot] Error flagging question:", err));
    }

    return {
      content: finalResponse,
      confidence,
      shouldEscalate,
      knowledgeBaseUsed: kbMatches.length > 0,
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
