import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useSocket } from "@/contexts/SocketContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Send,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Search,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SupportInboxProps {
  onClose?: () => void;
}

export default function SupportInbox({ onClose }: SupportInboxProps) {
  const { socket } = useSocket();
  const utils = trpc.useUtils();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConversationUserId, setNewConversationUserId] = useState("");
  const [newConversationSubject, setNewConversationSubject] = useState("");
  const [newConversationMessage, setNewConversationMessage] = useState("");

  const { data: tickets, refetch: refetchTickets } =
    trpc.support.getAll.useQuery();
  const { data: ticketDetails, refetch: refetchTicketDetails } =
    trpc.support.getById.useQuery(
      { ticketId: selectedTicketId! },
      { enabled: !!selectedTicketId }
    );

  const replyMutation = trpc.support.reply.useMutation({
    onSuccess: () => {
      refetchTicketDetails();
      refetchTickets();
    },
  });

  const assignMutation = trpc.support.assign.useMutation({
    onSuccess: () => {
      refetchTickets();
      refetchTicketDetails();
    },
  });

  const closeMutation = trpc.support.close.useMutation({
    onSuccess: () => {
      refetchTickets();
      refetchTicketDetails();
      setSelectedTicketId(null);
    },
  });

  // Join/leave support ticket socket room for real-time messages
  useEffect(() => {
    if (!socket || !selectedTicketId) return;
    socket.emit("support:join", selectedTicketId);
    return () => {
      socket.emit("support:leave", selectedTicketId);
    };
  }, [socket, selectedTicketId]);

  // Listen for new tickets and messages in real-time
  useEffect(() => {
    if (!socket) return;

    const handleNewTicket = () => {
      refetchTickets();
    };

    const handleNewMessage = (data: { ticketId: number }) => {
      if (data.ticketId === selectedTicketId) {
        refetchTicketDetails();
      }
      refetchTickets();
    };

    socket.on("support:new-ticket", handleNewTicket);
    socket.on("support:new-message", handleNewMessage);

    return () => {
      socket.off("support:new-ticket", handleNewTicket);
      socket.off("support:new-message", handleNewMessage);
    };
  }, [socket, selectedTicketId, refetchTickets, refetchTicketDetails]);

  const handleSendReply = async () => {
    if (!replyInput.trim() || !selectedTicketId) return;
    const content = replyInput;
    setReplyInput("");

    // Optimistically add the message to the cache so it appears instantly
    utils.support.getById.setData({ ticketId: selectedTicketId }, old => {
      if (!old) return old;
      return {
        ...old,
        messages: [
          ...(old.messages || []),
          {
            id: Date.now(),
            ticketId: selectedTicketId,
            senderId: 0,
            senderType: "admin" as const,
            senderName: "Admin",
            content,
            createdAt: new Date(),
          },
        ],
      };
    });

    await replyMutation.mutateAsync({
      ticketId: selectedTicketId,
      content,
    });
  };

  const handleAssignToMe = async () => {
    if (!selectedTicketId) return;
    await assignMutation.mutateAsync({ ticketId: selectedTicketId });
  };

  const handleCloseTicket = async () => {
    if (!selectedTicketId) return;
    await closeMutation.mutateAsync({ ticketId: selectedTicketId });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-yellow-500 text-white">Open</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-500 text-white">In Progress</Badge>;
      case "closed":
        return <Badge className="bg-gray-500 text-white">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="outline">Medium</Badge>;
      case "low":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredTickets = tickets?.filter(
    ticket =>
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedTicketId && ticketDetails && ticketDetails.ticket) {
    const { ticket, messages } = ticketDetails;

    return (
      <div className="flex flex-col h-full">
        {/* Ticket Header */}
        <div className="border-b p-4 bg-background">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedTicketId(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold">{ticket.subject}</h2>
                {getStatusBadge(ticket.status)}
                {getPriorityBadge(ticket.priority)}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{ticket.userName || "Unknown User"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Created {formatDate(ticket.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {ticket.status === "open" && (
                <Button variant="outline" size="sm" onClick={handleAssignToMe}>
                  Assign to Me
                </Button>
              )}
              {ticket.status !== "closed" && (
                <Button variant="outline" size="sm" onClick={handleCloseTicket}>
                  Close Ticket
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages?.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.senderType === "admin" ? "flex-row-reverse" : ""
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className={
                      msg.senderType === "admin"
                        ? "bg-accent text-accent-foreground"
                        : ""
                    }
                  >
                    {getInitials(msg.senderName)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`flex-1 ${msg.senderType === "admin" ? "text-right" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {msg.senderType === "user" && (
                      <>
                        <span className="text-sm font-medium">
                          {msg.senderName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(msg.createdAt)}
                        </span>
                      </>
                    )}
                    {msg.senderType === "admin" && (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(msg.createdAt)}
                        </span>
                        <span className="text-sm font-medium">
                          {msg.senderName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Admin
                        </Badge>
                      </>
                    )}
                  </div>
                  <div
                    className={`inline-block rounded-lg p-3 ${
                      msg.senderType === "admin"
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Reply Input */}
        {ticket.status !== "closed" && (
          <div className="border-t p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Textarea
                    value={replyInput}
                    onChange={e => setReplyInput(e.target.value)}
                    placeholder="Type your reply..."
                    className="min-h-[80px] resize-none"
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleSendReply}
                  disabled={!replyInput.trim() || replyMutation.isPending}
                  size="icon"
                  className="h-[80px] w-[80px]"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Ticket List View
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 bg-background">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h2 className="text-xl font-semibold">Support Inbox</h2>
            <Badge className="bg-red-500 text-white">
              {filteredTickets?.filter(t => t.status === "open").length || 0}
            </Badge>
          </div>
          <Dialog
            open={showNewConversation}
            onOpenChange={setShowNewConversation}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Conversation</DialogTitle>
                <DialogDescription>
                  Initiate a support conversation with a user
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    User ID or Email
                  </label>
                  <Input
                    value={newConversationUserId}
                    onChange={e => setNewConversationUserId(e.target.value)}
                    placeholder="Enter user ID or email"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={newConversationSubject}
                    onChange={e => setNewConversationSubject(e.target.value)}
                    placeholder="What is this about?"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    value={newConversationMessage}
                    onChange={e => setNewConversationMessage(e.target.value)}
                    placeholder="Your message to the user..."
                    className="min-h-[100px]"
                  />
                </div>
                <Button className="w-full" disabled>
                  Send Message (Coming Soon)
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tickets..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Ticket List */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {filteredTickets && filteredTickets.length > 0 ? (
            filteredTickets.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className="w-full p-4 hover:bg-accent/10 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getInitials(ticket.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {ticket.userName || "Unknown User"}
                      </span>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <p className="text-sm font-medium truncate mb-1">
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last message: {formatDate(ticket.lastMessageAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No support tickets found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
