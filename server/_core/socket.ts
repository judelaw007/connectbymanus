import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { jwtVerify } from "jose";
import { ENV } from "./env";
import { COOKIE_NAME } from "@shared/const";
import * as db from "../db";

let io: SocketIOServer | null = null;

// Track online users
const onlineUsers = new Map<number, Set<string>>(); // userId -> Set of socketIds

export function initializeSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? [process.env.VITE_APP_URL || ""]
          : ["http://localhost:5173", "http://localhost:3000"],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      // Try auth token first, then fall back to httpOnly cookie from headers
      let token = socket.handshake.auth.token;
      if (!token) {
        const cookieHeader = socket.handshake.headers.cookie || "";
        const match = cookieHeader.match(
          new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`)
        );
        token = match?.[1];
      }
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const secretKey = new TextEncoder().encode(ENV.cookieSecret);
      const { payload } = await jwtVerify(token, secretKey);

      if (!payload || !payload.openId) {
        return next(new Error("Invalid token"));
      }

      // Get user from database
      const user = await db.getUserByOpenId(payload.openId as string);
      if (!user) {
        return next(new Error("User not found"));
      }

      // Attach user info to socket
      socket.data.userId = user.id;
      socket.data.userRole = user.role;
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", socket => {
    const userId = socket.data.userId;
    console.log(`[Socket] User ${userId} connected (${socket.id})`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Broadcast online status
    io!.emit("user:online", { userId });

    // Join user's personal room for direct notifications
    socket.join(`user:${userId}`);

    // Handle joining channels
    socket.on("channel:join", async (channelId: number) => {
      // Verify user has access to channel
      const channel = await db.getChannelById(channelId);
      if (!channel) {
        socket.emit("error", { message: "Channel not found" });
        return;
      }

      // For private channels, check membership
      if (channel.isPrivate) {
        const members = await db.getChannelMembers(channelId);
        const isMember = members.some(m => m.id === userId);
        if (!isMember) {
          socket.emit("error", { message: "Access denied" });
          return;
        }
      }

      socket.join(`channel:${channelId}`);
      console.log(`[Socket] User ${userId} joined channel ${channelId}`);
    });

    // Handle leaving channels
    socket.on("channel:leave", (channelId: number) => {
      socket.leave(`channel:${channelId}`);
      console.log(`[Socket] User ${userId} left channel ${channelId}`);
    });

    // Handle typing indicators
    socket.on("typing:start", (channelId: number) => {
      socket
        .to(`channel:${channelId}`)
        .emit("user:typing", { userId, channelId });
    });

    socket.on("typing:stop", (channelId: number) => {
      socket
        .to(`channel:${channelId}`)
        .emit("user:stopped-typing", { userId, channelId });
    });

    // Handle support ticket rooms
    socket.on("support:join", (ticketId: number) => {
      socket.join(`support:${ticketId}`);
      console.log(`[Socket] User ${userId} joined support ticket ${ticketId}`);
    });

    socket.on("support:leave", (ticketId: number) => {
      socket.leave(`support:${ticketId}`);
      console.log(`[Socket] User ${userId} left support ticket ${ticketId}`);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`[Socket] User ${userId} disconnected (${socket.id})`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);

        // If user has no more connections, mark as offline
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io!.emit("user:offline", { userId });
        }
      }
    });
  });

  console.log("[Socket.io] Server initialized");
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initializeSocket first.");
  }
  return io;
}

export function getOnlineUsers(): number[] {
  return Array.from(onlineUsers.keys());
}

export function isUserOnline(userId: number): boolean {
  return onlineUsers.has(userId);
}

// Emit new message to channel
export function emitMessageToChannel(channelId: number, message: any) {
  if (io) {
    io.to(`channel:${channelId}`).emit("message:new", message);
  }
}

// Emit notification to specific user
export function emitNotificationToUser(userId: number, notification: any) {
  if (io) {
    io.to(`user:${userId}`).emit("notification:new", notification);
  }
}

// Emit support ticket update to admins
export function emitSupportTicketToAdmins(ticket: any) {
  if (io) {
    io.emit("support:new-ticket", ticket);
  }
}

// Emit new support message to everyone in the ticket room
export function emitSupportMessage(ticketId: number, message: any) {
  if (io) {
    io.to(`support:${ticketId}`).emit("support:new-message", {
      ticketId,
      message,
    });
  }
}

// Emit support ticket status change to the ticket owner
export function emitSupportTicketUpdate(
  userId: number,
  ticketId: number,
  update: any
) {
  if (io) {
    io.to(`user:${userId}`).emit("support:ticket-updated", {
      ticketId,
      ...update,
    });
  }
}
