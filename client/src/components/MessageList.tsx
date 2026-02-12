import { useEffect, useRef, useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/contexts/SocketContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Loader2, GraduationCap, Package, CreditCard } from "lucide-react";
import { PostCard, type PostData } from "@/components/PostCard";

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
  postId: number | null;
  post: PostData | null;
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
  const [mojiThinking, setMojiThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: initialMessages, isLoading } =
    trpc.messages.getByChannel.useQuery({
      channelId,
      limit: 50,
      offset: 0,
    });

  // Load initial messages (spread to avoid mutating React Query cache)
  useEffect(() => {
    if (initialMessages) {
      setMessages([...initialMessages].reverse());
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
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });

        // Show thinking indicator when a user message mentions @moji
        if (
          message.messageType === "user" &&
          message.content.toLowerCase().includes("@moji")
        ) {
          setMojiThinking(true);
        }

        // Hide thinking indicator when bot responds
        if (message.messageType === "bot") {
          setMojiThinking(false);
        }
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
      {mojiThinking && (
        <div className="flex gap-3 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback>🤖</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            @moji is thinking...
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

interface MessageItemProps {
  message: Message;
  isPublicView?: boolean;
}

const POST_TYPES = ["event", "announcement", "article", "newsletter"] as const;

const CATALOG_MENTION_REGEX = /@\[(Course|Bundle|Subscription):\s*([^\]]+)\]/g;

const MENTION_BADGE_STYLES: Record<
  string,
  { icon: typeof GraduationCap; className: string }
> = {
  Course: {
    icon: GraduationCap,
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
  Bundle: {
    icon: Package,
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  Subscription: {
    icon: CreditCard,
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
};

function renderMessageContent(content: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(CATALOG_MENTION_REGEX);

  while ((match = regex.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const type = match[1]; // Course, Bundle, or Subscription
    const title = match[2].trim();
    const style = MENTION_BADGE_STYLES[type];

    if (style) {
      const Icon = style.icon;
      parts.push(
        <span
          key={match.index}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${style.className}`}
        >
          <Icon className="h-3 w-3" />
          {title}
        </span>
      );
    } else {
      parts.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

function MessageItem({ message, isPublicView = false }: MessageItemProps) {
  const isBot = message.messageType === "bot";
  const isSystem = message.messageType === "system";
  const isAdmin = message.userRole === "admin";
  const isPost = POST_TYPES.includes(message.messageType as any);

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

  // Render rich post cards for post-type messages
  if (isPost && message.post) {
    return (
      <div className="max-w-lg">
        <PostCard
          post={message.post}
          authorName={
            isPublicView ? (isAdmin ? "Admin" : "Member") : message.userName
          }
          createdAt={message.createdAt}
        />
      </div>
    );
  }

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
          {renderMessageContent(message.content)}
        </div>
      </div>
    </div>
  );
}
