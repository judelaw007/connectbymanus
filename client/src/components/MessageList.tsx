import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/contexts/SocketContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: number;
  channelId: number;
  userId: number | null;
  content: string;
  messageType:
    | "user"
    | "admin"
    | "bot"
    | "system"
    | "event"
    | "announcement"
    | "article"
    | "newsletter";
  isPinned: boolean;
  replyToId: number | null;
  createdAt: Date;
  userName: string | null;
  userRole: "user" | "admin" | null;
}

interface MessageListProps {
  channelId: number;
  isPublicView?: boolean; // When true, hide real usernames for privacy
}

export function MessageList({
  channelId,
  isPublicView = false,
}: MessageListProps) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: initialMessages, isLoading } =
    trpc.messages.getByChannel.useQuery({
      channelId,
      limit: 50,
      offset: 0,
    });

  // Load initial messages
  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages.reverse()); // Reverse to show oldest first
    }
  }, [initialMessages]);

  // Join channel room and listen for new messages
  useEffect(() => {
    if (!socket) return;

    // Join the channel room
    socket.emit("channel:join", channelId);

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      if (message.channelId === channelId) {
        setMessages(prev => [...prev, message]);
      }
    };

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.emit("channel:leave", channelId);
      socket.off("message:new", handleNewMessage);
    };
  }, [socket, channelId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Be the first to start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map(message => (
        <MessageItem
          key={message.id}
          message={message}
          isPublicView={isPublicView}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

interface MessageItemProps {
  message: Message;
  isPublicView?: boolean;
}

function MessageItem({ message, isPublicView = false }: MessageItemProps) {
  const isBot = message.messageType === "bot";
  const isSystem = message.messageType === "system";
  const isAdmin = message.userRole === "admin";

  // For public view, hide real names and show generic "Member" or "Admin"
  const getDisplayName = () => {
    if (isBot) return "@moji";
    if (isPublicView) {
      // Show role but not actual name for privacy
      return isAdmin ? "Admin" : "Member";
    }
    return message.userName || "Unknown";
  };

  const getInitials = (name: string | null) => {
    if (isBot) return "🤖";
    if (isPublicView) {
      // Generic initials for public view
      return isAdmin ? "A" : "M";
    }
    if (!name) return "?";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMessageBgColor = () => {
    if (isBot) return "bg-blue-50 dark:bg-blue-950/20";
    if (isSystem) return "bg-muted";
    return "";
  };

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-muted text-muted-foreground text-sm px-4 py-2 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 ${getMessageBgColor()} ${isBot ? "p-3 rounded-lg" : ""}`}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback
          className={isAdmin ? "bg-primary text-primary-foreground" : ""}
        >
          {getInitials(message.userName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm">{getDisplayName()}</span>
          {isAdmin && !isBot && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              Admin
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>

        <div className="text-sm mt-1 whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </div>
  );
}
