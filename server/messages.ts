import * as db from "./db";
import { emitMessageToChannel } from "./_core/socket";

export interface CreateMessageInput {
  channelId: number;
  userId: number;
  content: string;
  messageType?: "user" | "admin" | "bot" | "system" | "event" | "announcement" | "article" | "newsletter";
  replyToId?: number;
}

export async function createMessage(input: CreateMessageInput) {
  const { channelId, userId, content, messageType = "user", replyToId } = input;

  // Create message in database
  const messageId = await db.createMessage({
    channelId,
    userId,
    content,
    messageType,
    replyToId: replyToId || null,
  });

  // Get the full message with user info
  const messages = await db.getChannelMessages(channelId, 1, 0);
  const newMessage = messages.find(m => m.id === messageId);

  if (newMessage) {
    // Emit to all users in the channel via Socket.io
    emitMessageToChannel(channelId, newMessage);
  }

  return { messageId, message: newMessage };
}

export async function getMessages(channelId: number, limit: number = 50, offset: number = 0) {
  return await db.getChannelMessages(channelId, limit, offset);
}

export async function pinMessage(messageId: number) {
  // TODO: Implement updateMessage in db.ts
  return { success: true };
}

export async function unpinMessage(messageId: number) {
  // TODO: Implement updateMessage in db.ts
  return { success: true };
}
