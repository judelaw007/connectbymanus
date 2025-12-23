import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Send,
  X,
  Headset,
  Bot,
  MessageSquare,
  Plus,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

interface UserSupportChatProps {
  onClose: () => void;
}

export default function UserSupportChat({ onClose }: UserSupportChatProps) {
  const { user } = useAuth();
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user's support tickets
  const { data: myTickets, refetch: refetchTickets } = trpc.support.getMy.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch active ticket details
  const { data: ticketDetails, refetch: refetchDetails } = trpc.support.getById.useQuery(
    { ticketId: activeTicketId! },
    { enabled: !!activeTicketId }
  );

  const createTicketMutation = trpc.support.create.useMutation({
    onSuccess: (data) => {
      setActiveTicketId(data.ticketId);
      setShowNewTicket(false);
      setNewSubject("");
      setNewMessage("");
      refetchTickets();
    },
  });

  const replyMutation = trpc.support.reply.useMutation({
    onSuccess: () => {
      setReplyMessage("");
      refetchDetails();
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticketDetails?.messages]);

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    await createTicketMutation.mutateAsync({
      subject: newSubject,
      initialMessage: newMessage,
    });
  };

  const handleReply = async () => {
    if (!replyMessage.trim() || !activeTicketId) return;
    await replyMutation.mutateAsync({
      ticketId: activeTicketId,
      content: replyMessage,
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

  // New ticket form
  if (showNewTicket) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowNewTicket(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-semibold">New Support Request</h2>
            <p className="text-sm text-muted-foreground">Get help from Team MojiTax</p>
          </div>
        </div>

        <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Chat with @moji first
              </CardTitle>
              <CardDescription>
                Our AI assistant @moji can help with many questions instantly.
                If @moji can't help, your message will be sent to the team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder="Brief description of your question"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Message</label>
                <Textarea
                  placeholder="Describe your question or issue in detail..."
                  rows={5}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateTicket}
                disabled={!newSubject.trim() || !newMessage.trim() || createTicketMutation.isPending}
              >
                {createTicketMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </CardContent>
          </Card>
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
            <Button variant="ghost" size="icon" onClick={() => setActiveTicketId(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="font-semibold">{ticketDetails.ticket.subject}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getStatusBadge(ticketDetails.ticket.status)}
                <span>Created {formatDate(ticketDetails.ticket.createdAt)}</span>
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
            {ticketDetails.messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.senderType === "user" ? "justify-end" : "justify-start"
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
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
                onChange={(e) => setReplyMessage(e.target.value)}
                className="flex-1 min-h-[44px] max-h-32"
                rows={1}
                onKeyDown={(e) => {
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
              <Button variant="link" className="p-0 h-auto ml-1" onClick={() => setShowNewTicket(true)}>
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
                    I'm the MojiTax AI assistant. Ask me anything about international tax,
                    VAT, transfer pricing, or your MojiTax account. If I can't help,
                    I'll connect you with our human support team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New conversation button */}
          <Button className="w-full" size="lg" onClick={() => setShowNewTicket(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Start New Conversation
          </Button>

          {/* Previous conversations */}
          {myTickets && myTickets.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Your Conversations</h3>
              <div className="space-y-2">
                {myTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setActiveTicketId(ticket.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{ticket.subject}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(ticket.lastMessageAt || ticket.createdAt)}
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
