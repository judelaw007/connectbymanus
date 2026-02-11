import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Send,
  X,
  Headset,
  Bot,
  Plus,
  ArrowLeft,
  Clock,
  Loader2,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSocket } from "@/contexts/SocketContext";

interface MojiChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface UserSupportChatProps {
  onClose: () => void;
}

export default function UserSupportChat({ onClose }: UserSupportChatProps) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const utils = trpc.useUtils();
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [showMojiChat, setShowMojiChat] = useState(false);
  const [mojiMessages, setMojiMessages] = useState<MojiChatMessage[]>([]);
  const [mojiInput, setMojiInput] = useState("");
  const [mojiLoading, setMojiLoading] = useState(false);
  const [showEscalateHint, setShowEscalateHint] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user's support tickets
  const { data: myTickets, refetch: refetchTickets } =
    trpc.support.getMy.useQuery(undefined, {
      enabled: !!user,
    });

  // Fetch active ticket details
  const { data: ticketDetails, refetch: refetchDetails } =
    trpc.support.getById.useQuery(
      { ticketId: activeTicketId! },
      { enabled: !!activeTicketId }
    );

  const mojiChatMutation = trpc.support.chatWithMoji.useMutation();

  const createTicketMutation = trpc.support.create.useMutation({
    onSuccess: data => {
      setActiveTicketId(data.ticketId);
      setShowMojiChat(false);
      setMojiMessages([]);
      setShowEscalateHint(false);
      refetchTickets();
    },
  });

  const replyMutation = trpc.support.reply.useMutation({
    onSuccess: () => {
      // Refetch from server to confirm and get canonical data
      refetchDetails();
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticketDetails?.messages, mojiMessages]);

  // Join/leave support ticket socket room for real-time messages
  useEffect(() => {
    if (!socket || !activeTicketId) return;
    socket.emit("support:join", activeTicketId);
    return () => {
      socket.emit("support:leave", activeTicketId);
    };
  }, [socket, activeTicketId]);

  // Listen for new messages on the active ticket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: { ticketId: number }) => {
      if (data.ticketId === activeTicketId) {
        refetchDetails();
      }
    };

    const handleTicketUpdated = (data: { ticketId: number }) => {
      refetchTickets();
      if (data.ticketId === activeTicketId) {
        refetchDetails();
      }
    };

    socket.on("support:new-message", handleNewMessage);
    socket.on("support:ticket-updated", handleTicketUpdated);

    return () => {
      socket.off("support:new-message", handleNewMessage);
      socket.off("support:ticket-updated", handleTicketUpdated);
    };
  }, [socket, activeTicketId, refetchDetails, refetchTickets]);

  const handleMojiSend = async () => {
    const text = mojiInput.trim();
    if (!text || mojiLoading) return;

    const userMsg: MojiChatMessage = {
      id: Date.now(),
      role: "user",
      content: text,
    };
    setMojiMessages(prev => [...prev, userMsg]);
    setMojiInput("");
    setMojiLoading(true);

    try {
      const history = mojiMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const result = await mojiChatMutation.mutateAsync({
        message: text,
        conversationHistory: history,
      });

      const botMsg: MojiChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: result.content,
      };
      setMojiMessages(prev => [...prev, botMsg]);

      if (result.shouldEscalate) {
        setShowEscalateHint(true);
      }
    } catch {
      const errMsg: MojiChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          "Sorry, I'm having trouble responding right now. You can connect with Team MojiTax below.",
      };
      setMojiMessages(prev => [...prev, errMsg]);
      setShowEscalateHint(true);
    } finally {
      setMojiLoading(false);
    }
  };

  const handleEscalateToHuman = async () => {
    // Build a summary from the first user message
    const firstUserMsg = mojiMessages.find(m => m.role === "user");
    const subject = firstUserMsg
      ? firstUserMsg.content.slice(0, 80)
      : "Support request";

    // Combine conversation as the initial message for context
    const conversationSummary = mojiMessages
      .map(m =>
        m.role === "user" ? `User: ${m.content}` : `@moji: ${m.content}`
      )
      .join("\n\n");

    await createTicketMutation.mutateAsync({
      subject,
      initialMessage: conversationSummary,
    });
  };

  const handleReply = async () => {
    if (!replyMessage.trim() || !activeTicketId) return;
    const content = replyMessage;
    setReplyMessage("");

    // Optimistically add the message to the cache so it appears instantly
    utils.support.getById.setData({ ticketId: activeTicketId }, old => {
      if (!old) return old;
      return {
        ...old,
        messages: [
          ...old.messages,
          {
            id: Date.now(), // temporary ID, replaced on refetch
            ticketId: activeTicketId,
            senderId: user?.id ?? 0,
            senderType: "user" as const,
            senderName: user?.displayName || user?.name || "You",
            content,
            createdAt: new Date(),
          },
        ],
      };
    });

    await replyMutation.mutateAsync({
      ticketId: activeTicketId,
      content,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-yellow-500">Open</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // @moji chat phase (before ticket creation)
  if (showMojiChat) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowMojiChat(false);
                setMojiMessages([]);
                setShowEscalateHint(false);
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold">Chat with @moji</h2>
                <p className="text-xs text-muted-foreground">AI assistant</p>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-3xl mx-auto">
            {/* Initial @moji greeting */}
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[70%] rounded-lg p-3 bg-muted">
                <p className="text-sm whitespace-pre-wrap">
                  Hi! I'm @moji, your MojiTax AI assistant. How can I help you
                  today? Ask me anything about international tax, VAT, ADIT
                  exams, or your account.
                </p>
              </div>
            </div>

            {/* Conversation messages */}
            {mojiMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>You</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {mojiLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-lg p-3 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Escalation hint */}
            {showEscalateHint && (
              <div className="flex justify-center">
                <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 max-w-md">
                  <CardContent className="p-3 text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Would you like to speak with a human team member?
                    </p>
                    <Button
                      size="sm"
                      onClick={handleEscalateToHuman}
                      disabled={createTicketMutation.isPending}
                    >
                      <UserRound className="h-4 w-4 mr-1" />
                      {createTicketMutation.isPending
                        ? "Connecting..."
                        : "Connect with Team MojiTax"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input + escalation button */}
        <div className="border-t p-4">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Textarea
              placeholder="Type your message..."
              value={mojiInput}
              onChange={e => setMojiInput(e.target.value)}
              className="flex-1 min-h-[44px] max-h-32"
              rows={1}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleMojiSend();
                }
              }}
            />
            <Button
              onClick={handleMojiSend}
              disabled={!mojiInput.trim() || mojiLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {mojiMessages.length > 0 && (
            <div className="flex justify-center mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleEscalateToHuman}
                disabled={createTicketMutation.isPending}
              >
                <UserRound className="h-3 w-3 mr-1" />
                Talk to a human instead
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active ticket conversation
  if (activeTicketId && ticketDetails && ticketDetails.ticket) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveTicketId(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="font-semibold">{ticketDetails.ticket.subject}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getStatusBadge(ticketDetails.ticket.status)}
                <span>
                  Created {formatDate(ticketDetails.ticket.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-3xl mx-auto">
            {ticketDetails.messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.senderType === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {message.senderType !== "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {message.senderType === "admin" ? "MT" : "AI"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.senderType === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      message.senderType === "user"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatDate(message.createdAt)}
                  </p>
                </div>
                {message.senderType === "user" && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>You</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Reply Input */}
        {ticketDetails.ticket.status !== "closed" && (
          <div className="border-t p-4">
            <div className="flex gap-2 max-w-3xl mx-auto">
              <Textarea
                placeholder="Type your reply..."
                value={replyMessage}
                onChange={e => setReplyMessage(e.target.value)}
                className="flex-1 min-h-[44px] max-h-32"
                rows={1}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
              />
              <Button
                onClick={handleReply}
                disabled={!replyMessage.trim() || replyMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {ticketDetails.ticket.status === "closed" && (
          <div className="border-t p-4 bg-muted/50">
            <p className="text-center text-sm text-muted-foreground">
              This conversation has been closed.
              <Button
                variant="link"
                className="p-0 h-auto ml-1"
                onClick={() => setShowMojiChat(true)}
              >
                Start a new conversation
              </Button>
            </p>
          </div>
        )}
      </div>
    );
  }

  // Ticket list / Welcome screen
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Headset className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Chat with Team MojiTax</h2>
            <p className="text-sm text-muted-foreground">We're here to help</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          {/* Welcome message */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Hi there! I'm @moji</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    I'm the MojiTax AI assistant. Ask me anything about
                    international tax, VAT, transfer pricing, or your MojiTax
                    account. If I can't help, I'll connect you with our human
                    support team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New conversation button */}
          <Button
            className="w-full"
            size="lg"
            onClick={() => setShowMojiChat(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Start New Conversation
          </Button>

          {/* Previous conversations */}
          {myTickets && myTickets.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Your Conversations</h3>
              <div className="space-y-2">
                {myTickets.map(ticket => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setActiveTicketId(ticket.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {ticket.subject}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(
                              ticket.lastMessageAt || ticket.createdAt
                            )}
                          </p>
                        </div>
                        {getStatusBadge(ticket.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
