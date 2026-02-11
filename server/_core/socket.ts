import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { jwtVerify } from "jose";
import { ENV } from "./env";
import { COOKIE_NAME } from "@shared/const";
import * as db from "../db";

let io: SocketIOServer | null = null;

// Track online users: userId -> { name, socketIds }
const onlineUsers = new Map<number, { name: string; socketIds: Set<string> }>();

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
      socket.data.userName =
        user.displayName || user.name || user.email || "User";
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", socket => {
    const userId = socket.data.userId;
    const userName = socket.data.userName;
    console.log(`[Socket] User ${userId} connected (${socket.id})`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, { name: userName, socketIds: new Set() });
    }
    onlineUsers.get(userId)!.socketIds.add(socket.id);

    // Broadcast online status with name
    io!.emit("user:online", { userId, name: userName });

    // Send the current list of online users to the newly connected socket
    const currentOnline = Array.from(onlineUsers.entries()).map(
      ([id, info]) => ({ userId: id, name: info.name })
    );
    socket.emit("users:online-list", currentOnline);

    // Join user's personal room for direct notifications
    socket.join(`user:${userId}`);

    // Admins auto-join the support admin room for global ticket notifications
    if (socket.data.userRole === "admin") {
      socket.join("support:admin");
    }

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

      // Mark channel as read when user views it
      db.updateChannelLastRead(userId, channelId).catch(err => {
        console.error("[Socket] Error marking channel read:", err);
      });

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

      const userEntry = onlineUsers.get(userId);
      if (userEntry) {
        userEntry.socketIds.delete(socket.id);

        // If user has no more connections, mark as offline
        if (userEntry.socketIds.size === 0) {
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

export function getOnlineUsersWithNames(): { userId: number; name: string }[] {
  return Array.from(onlineUsers.entries()).map(([id, info]) => ({
    userId: id,
    name: info.name,
  }));
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

// Emit unread count update to a specific user
export function emitUnreadUpdate(
  userId: number,
  channelId: number,
  unreadCount: number
) {
  if (io) {
    io.to(`user:${userId}`).emit("channel:unread-update", {
      channelId,
      unreadCount,
    });
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

// Emit new support message to the ticket room, admins, and the ticket owner
export function emitSupportMessage(
  ticketId: number,
  message: any,
  ticketOwnerId?: number
) {
  if (io) {
    const payload = { ticketId, message };
    // Notify everyone viewing this ticket
    io.to(`support:${ticketId}`).emit("support:new-message", payload);
    // Notify all admins (for inbox list refresh)
    io.to("support:admin").emit("support:new-message", payload);
    // Notify the ticket owner directly (in case they haven't joined the room yet)
    if (ticketOwnerId) {
      io.to(`user:${ticketOwnerId}`).emit("support:new-message", payload);
    }
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
