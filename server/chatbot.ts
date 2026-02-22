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

// Common stop words to exclude from keyword matching
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "can",
  "shall",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "as",
  "into",
  "through",
  "about",
  "and",
  "but",
  "or",
  "not",
  "no",
  "if",
  "so",
  "it",
  "its",
  "my",
  "your",
  "we",
  "our",
  "you",
  "me",
  "i",
  "he",
  "she",
  "they",
  "them",
  "this",
  "that",
  "what",
  "which",
  "who",
  "how",
  "when",
  "where",
  "why",
  "all",
  "each",
  "any",
  "some",
  "also",
  "just",
  "than",
  "then",
  "very",
  "too",
  "moji",
  "@moji",
]);

/**
 * Extract meaningful words from text, stripping punctuation and stop words.
 */
function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ""))
    .filter(w => w.length > 0 && !STOP_WORDS.has(w));
}

/**
 * Check if two words share a common prefix of at least `minLen` characters.
 * Handles word-root matching: "registering" ↔ "register" ↔ "registration"
 * all share the prefix "regist" (6 chars).
 */
function sharesPrefix(a: string, b: string, minLen: number): boolean {
  const limit = Math.min(a.length, b.length);
  if (limit < minLen) return false;
  for (let i = 0; i < limit; i++) {
    if (a[i] !== b[i]) return i >= minLen;
  }
  return limit >= minLen;
}

/**
 * Search knowledge base for relevant information.
 * Uses keyword + prefix matching with stop-word filtering and a minimum
 * relevance threshold so weak/tangential matches are excluded.
 *
 * Returns { ranked, allKB } so the caller can fall back to the full KB
 * when the ranked list is empty.
 */
async function searchKnowledgeBase(query: string): Promise<{
  ranked: { question: string; answer: string }[];
  allKB: { question: string; answer: string }[];
}> {
  const allKB = await db.getAllKnowledgeBase();
  const allEntries = allKB.map(e => ({
    question: e.question,
    answer: e.answer,
  }));

  const keywords = extractWords(query);

  if (keywords.length === 0) return { ranked: [], allKB: allEntries };

  // Build bigrams for phrase matching (e.g. "study group" as a unit)
  const bigrams: string[] = [];
  for (let i = 0; i < keywords.length - 1; i++) {
    bigrams.push(`${keywords[i]} ${keywords[i + 1]}`);
  }

  const scored = allKB.map(entry => {
    const questionLower = entry.question.toLowerCase();
    const answerLower = entry.answer.toLowerCase();
    const questionWords = extractWords(entry.question);
    const answerWords = extractWords(entry.answer);

    let score = 0;

    // Bigram matches are strong signals
    bigrams.forEach(bigram => {
      if (questionLower.includes(bigram)) score += 6;
      if (answerLower.includes(bigram)) score += 3;
    });

    keywords.forEach(keyword => {
      // Exact substring match (strongest)
      if (questionLower.includes(keyword)) {
        score += 3;
      } else if (questionWords.some(w => sharesPrefix(keyword, w, 4))) {
        // Prefix/root match: "registering" ↔ "register", "courses" ↔ "course"
        score += 2;
      }

      if (answerLower.includes(keyword)) {
        score += 1;
      } else if (answerWords.some(w => sharesPrefix(keyword, w, 4))) {
        score += 1;
      }
    });

    return { entry, score };
  });

  // Minimum threshold: at least one keyword must appear in the question
  // (score >= 2 allows prefix matches) to count as relevant.
  const MIN_SCORE = 2;

  const ranked = scored
    .filter(item => item.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => ({
      question: item.entry.question,
      answer: item.entry.answer,
    }));

  return { ranked, allKB: allEntries };
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
    const { ranked: kbMatches, allKB } = await searchKnowledgeBase(userMessage);

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

    // Decide which KB entries to send to the LLM.
    // If keyword search found good matches, use those.
    // If not, send the ENTIRE knowledge base and let the LLM determine
    // relevance — this avoids missing answers due to keyword mismatch
    // (e.g. user says "registering" but KB says "enroll").
    const kbForLLM = kbMatches.length > 0 ? kbMatches : allKB;
    const usedRankedMatches = kbMatches.length > 0;

    // If the KB is completely empty, escalate immediately
    if (kbForLLM.length === 0) {
      db.createFlaggedQuestion({
        question: userMessage,
        userId: userId || null,
        channelId: channelId || null,
        botResponse: null,
        confidence: "low",
      }).catch(err => console.error("[Chatbot] Error flagging question:", err));

      return {
        content:
          "I don't have information about that in my knowledge base yet. Let me connect you with Team MojiTax who can provide expert guidance on this topic.\n\nYou can use the Chat with Team MojiTax feature to create a support ticket, or I can escalate this for you right away. Would you like me to do that?",
        confidence: "low",
        shouldEscalate: true,
        knowledgeBaseUsed: false,
      };
    }

    // Build context for LLM
    const kbLabel = usedRankedMatches
      ? "KNOWLEDGE BASE (most relevant entries)"
      : "FULL KNOWLEDGE BASE (search through ALL entries to find the answer)";

    const systemPrompt = `You are @moji, the AI assistant for MojiTax Connect — a community platform for tax professionals studying for ADIT (Advanced Diploma in International Taxation) and other tax qualifications offered by MojiTax.

## CRITICAL RULE — KNOWLEDGE BASE ONLY
You can ONLY answer using the knowledge base entries provided below.
- You must NEVER add information from your own general knowledge.
- You must NEVER claim MojiTax does or does not offer something unless the knowledge base explicitly says so.
- You must NEVER make negative claims (e.g. "we don't offer X") unless the knowledge base explicitly states that.
- If the knowledge base entries below do not directly address what the user asked, say: "I don't have specific information about that topic yet, but I'd recommend reaching out to Team MojiTax through the Chat with Team MojiTax feature for detailed guidance."
- Do not recommend external websites, organizations, or professionals.
- Do not infer, extrapolate, or fill gaps. Only relay what the knowledge base says.

## LINKS AND RESOURCES
- If a knowledge base answer contains a URL or link, you MUST include it in your response so the user can access it directly.
- Always paste URLs as plain text (e.g. https://example.com), never use markdown link syntax like [text](url).
- Proactively point users to relevant links from the knowledge base whenever possible.

## FORMATTING — PLAIN TEXT ONLY
You MUST respond in plain text. Do NOT use markdown formatting:
- No **bold** or *italic* (no asterisks for emphasis)
- No # headings
- No markdown link syntax like [text](url)
- Use simple dashes (-) for bullet lists
- Use line breaks to separate paragraphs

## RESPONSE STYLE
- Keep responses concise (2-3 paragraphs max)
- Use simple dashes for lists
- Be friendly, professional, and encouraging
- Rephrase knowledge base answers naturally but do not add new information
- When the knowledge base answer includes links, always include them in your response
- Always end with an offer to help further or to escalate to Team MojiTax

## ${kbLabel}:
${kbForLLM.map((match, i) => `${i + 1}. Q: ${match.question}\n   A: ${match.answer}`).join("\n\n")}

IMPORTANT: Search through ALL the entries above carefully. If any entry is relevant to the user's question, use it to answer. If none of them directly address the question, tell the user you don't have that specific information yet and suggest they reach out to Team MojiTax through the Chat with Team MojiTax feature. Never guess or fabricate an answer.`;

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

    // Flag question for admin review when no keyword matches were found
    // (the LLM used the full KB as a fallback)
    if (!usedRankedMatches) {
      db.createFlaggedQuestion({
        question: userMessage,
        userId: userId || null,
        channelId: channelId || null,
        botResponse,
        confidence: "low",
      }).catch(err => console.error("[Chatbot] Error flagging question:", err));
    }

    // Determine confidence based on knowledge base match quality
    const confidence: "high" | "medium" | "low" = usedRankedMatches
      ? kbMatches.length >= 2
        ? "high"
        : "medium"
      : "low";

    return {
      content: botResponse,
      confidence,
      shouldEscalate: false,
      knowledgeBaseUsed: true,
      sources: usedRankedMatches ? kbMatches.map(m => m.question) : [],
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
