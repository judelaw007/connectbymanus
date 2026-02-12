import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSocket } from "@/contexts/SocketContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  LogIn,
  Bot,
  GraduationCap,
  Package,
  CreditCard,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface MessageInputProps {
  channelId: number;
  isPublicView?: boolean; // When true, show sign-in prompt instead of input
}

type MentionItem = {
  type: "moji" | "course" | "bundle" | "subscription";
  id: string;
  title: string;
  label: string;
};

const MENTION_ICONS = {
  moji: Bot,
  course: GraduationCap,
  bundle: Package,
  subscription: CreditCard,
};

const MENTION_COLORS = {
  moji: "text-blue-500",
  course: "text-emerald-500",
  bundle: "text-purple-500",
  subscription: "text-amber-500",
};

export function MessageInput({
  channelId,
  isPublicView = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Fetch catalog for admin users (cached by React Query)
  const { data: catalog } = trpc.channels.getLearnworldsCatalog.useQuery(
    undefined,
    { enabled: isAdmin, staleTime: 5 * 60 * 1000 }
  );

  const sendMessageMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      setMessage("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      // Refetch messages so the new message appears even if socket event is missed
      utils.messages.getByChannel.invalidate({ channelId });
    },
    onError: error => {
      console.error("Failed to send message:", error.message);
      toast.error("Failed to send message", { description: error.message });
    },
  });

  // Handle typing indicators
  useEffect(() => {
    if (!socket || isPublicView) return;

    if (isTyping) {
      socket.emit("typing:start", channelId);
    } else {
      socket.emit("typing:stop", channelId);
    }
  }, [isTyping, channelId, socket, isPublicView]);

  // Build mention items from catalog
  const mentionItems = useMemo<MentionItem[]>(() => {
    const items: MentionItem[] = [
      {
        type: "moji",
        id: "moji",
        title: "@moji",
        label: "Ask the AI assistant",
      },
    ];

    if (isAdmin && catalog) {
      for (const c of catalog.courses) {
        items.push({
          type: "course",
          id: c.id,
          title: c.title,
          label: "Course",
        });
      }
      for (const b of catalog.bundles) {
        items.push({
          type: "bundle",
          id: b.id,
          title: b.title,
          label: "Bundle",
        });
      }
      for (const s of catalog.subscriptions) {
        items.push({
          type: "subscription",
          id: s.id,
          title: s.title,
          label: "Subscription",
        });
      }
    }
    return items;
  }, [isAdmin, catalog]);

  // Filter mentions based on query
  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return [];
    if (mentionQuery === "") return mentionItems.slice(0, 8);
    const q = mentionQuery.toLowerCase();
    return mentionItems
      .filter(
        item =>
          item.title.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q) ||
          item.label.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [mentionQuery, mentionItems]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredMentions.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (!dropdownRef.current) return;
    const items = dropdownRef.current.querySelectorAll("[data-mention-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const detectMention = useCallback(
    (value: string, cursorPos: number) => {
      const textBeforeCursor = value.slice(0, cursorPos);
      const atMatch = textBeforeCursor.match(/(^|\s)@([^\s]*)$/);
      if (atMatch) {
        const query = atMatch[2];
        // For non-admin, only show @moji
        if (!isAdmin && query.length <= 4) {
          setMentionQuery(query);
        } else if (isAdmin) {
          setMentionQuery(query);
        } else {
          setMentionQuery(null);
        }
      } else {
        setMentionQuery(null);
      }
    },
    [isAdmin]
  );

  const insertMention = useCallback(
    (item: MentionItem) => {
      if (!textareaRef.current) return;
      const cursorPos = textareaRef.current.selectionStart;
      const text = message;
      const beforeCursor = text.slice(0, cursorPos);
      const atIndex = beforeCursor.lastIndexOf("@");
      if (atIndex === -1) return;

      let insertText: string;
      if (item.type === "moji") {
        insertText = "@moji ";
      } else {
        // Insert as @[Type: Title] format for catalog mentions
        insertText = `@[${item.label}: ${item.title}] `;
      }

      const newMessage =
        text.slice(0, atIndex) + insertText + text.slice(cursorPos);
      setMessage(newMessage);
      setMentionQuery(null);

      // Focus and set cursor after the inserted text
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = atIndex + insertText.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    },
    [message]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;

    // Detect @mention
    const cursorPos = e.target.selectionStart;
    detectMention(value, cursorPos);

    // Typing indicator logic
    if (!isTyping) {
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    sendMessageMutation.mutate({
      channelId,
      content: trimmedMessage,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mention dropdown navigation
    if (mentionQuery !== null && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => (i < filteredMentions.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(i => (i > 0 ? i - 1 : filteredMentions.length - 1));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMentions[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Show sign-in prompt for public/guest users
  if (isPublicView) {
    return (
      <div className="border-t bg-muted/50 p-4">
        <div className="flex items-center justify-center gap-4">
          <p className="text-muted-foreground text-sm">
            Sign in with your MojiTax account to join the conversation
          </p>
          <Button
            onClick={() => setLocation("/login")}
            size="sm"
            className="gap-2"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t bg-background p-4">
      {/* @mention autocomplete dropdown */}
      {mentionQuery !== null && filteredMentions.length > 0 && (
        <div
          ref={dropdownRef}
          className="mb-2 max-h-[240px] overflow-y-auto rounded-lg border bg-card shadow-md"
        >
          {filteredMentions.map((item, idx) => {
            const Icon = MENTION_ICONS[item.type];
            return (
              <button
                key={`${item.type}-${item.id}`}
                data-mention-item
                onClick={() => insertMention(item)}
                className={`flex items-center gap-3 w-full text-left px-3 py-2 text-sm transition-colors ${
                  idx === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                }`}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${MENTION_COLORS[item.type]}`}
                />
                <span className="font-medium truncate">{item.title}</span>
                <Badge
                  variant="secondary"
                  className="ml-auto text-xs flex-shrink-0"
                >
                  {item.label}
                </Badge>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isAdmin
              ? "Type a message... (use @ to mention courses, bundles, or @moji)"
              : "Type a message... (use @moji to ask AI)"
          }
          className="min-h-[44px] max-h-[200px] resize-none"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sendMessageMutation.isPending}
          size="icon"
          className="h-[44px] w-[44px] flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
