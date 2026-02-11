import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/contexts/SocketContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, LogIn, Bot } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface MessageInputProps {
  channelId: number;
  isPublicView?: boolean; // When true, show sign-in prompt instead of input
}

export function MessageInput({
  channelId,
  isPublicView = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showMojiHint, setShowMojiHint] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const { socket } = useSocket();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;

    // Show @moji autocomplete hint when user types "@" at word boundary
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/(^|\s)@(\w{0,4})$/);
    setShowMojiHint(
      !!atMatch && !textBeforeCursor.toLowerCase().includes("@moji")
    );

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

  const insertMojiMention = () => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart;
    const text = message;
    // Find the @ that triggered the hint
    const beforeCursor = text.slice(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf("@");
    if (atIndex === -1) return;

    const newMessage =
      text.slice(0, atIndex) + "@moji " + text.slice(cursorPos);
    setMessage(newMessage);
    setShowMojiHint(false);
    textareaRef.current.focus();
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
      {/* @moji mention autocomplete hint */}
      {showMojiHint && (
        <button
          onClick={insertMojiMention}
          className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg border bg-card hover:bg-accent text-sm transition-colors w-fit"
        >
          <Bot className="h-4 w-4 text-blue-500" />
          <span className="font-medium">@moji</span>
          <span className="text-muted-foreground">— Ask the AI assistant</span>
        </button>
      )}
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (use @moji to ask AI)"
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
