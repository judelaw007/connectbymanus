import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Trash2,
  Flag,
  FlagOff,
  MessageSquare,
  Hash,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

type View = "channels" | "messages" | "flagged";

// Shared helpers
const formatDate = (date: string | Date | null) => {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const truncate = (text: string, maxLen: number = 120) => {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
};

// ============= Channel Messages Sub-Component =============
// Extracted so the query runs unconditionally when mounted.
function ChannelMessagesView({
  channel,
  onBack,
}: {
  channel: { id: number; name: string };
  onBack: () => void;
}) {
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagTargetId, setFlagTargetId] = useState<number | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  const {
    data: channelMessages,
    isLoading: messagesLoading,
    isFetching,
    error: messagesError,
  } = trpc.chatModeration.getChannelMessages.useQuery({
    channelId: channel.id,
    limit: 100,
  });

  const clearMutation = trpc.chatModeration.clearChannel.useMutation({
    onSuccess: result => {
      toast.success(
        `Cleared ${result.deletedCount} messages from #${result.channelName}`
      );
      setClearDialogOpen(false);
      utils.chatModeration.getChannelMessages.invalidate();
      utils.chatModeration.getChannels.invalidate();
      utils.chatModeration.getFlagged.invalidate();
    },
    onError: error => {
      toast.error(`Failed to clear channel: ${error.message}`);
    },
  });

  const deleteMutation = trpc.chatModeration.deleteMessage.useMutation({
    onSuccess: () => {
      toast.success("Message deleted");
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
      utils.chatModeration.getChannelMessages.invalidate();
      utils.chatModeration.getFlagged.invalidate();
      utils.chatModeration.getChannels.invalidate();
    },
    onError: error => {
      toast.error(`Failed to delete message: ${error.message}`);
    },
  });

  const flagMutation = trpc.chatModeration.flagMessage.useMutation({
    onSuccess: () => {
      toast.success("Message flagged");
      setFlagDialogOpen(false);
      setFlagReason("");
      setFlagTargetId(null);
      utils.chatModeration.getChannelMessages.invalidate();
      utils.chatModeration.getFlagged.invalidate();
      utils.chatModeration.getChannels.invalidate();
    },
    onError: error => {
      toast.error(`Failed to flag message: ${error.message}`);
    },
  });

  const unflagMutation = trpc.chatModeration.unflagMessage.useMutation({
    onSuccess: () => {
      toast.success("Message unflagged");
      utils.chatModeration.getChannelMessages.invalidate();
      utils.chatModeration.getFlagged.invalidate();
      utils.chatModeration.getChannels.invalidate();
    },
    onError: error => {
      toast.error(`Failed to unflag message: ${error.message}`);
    },
  });

  const messages = channelMessages || [];
  const loading = messagesLoading || isFetching;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Hash className="h-4 w-4" />
                {channel.name} — Messages
              </CardTitle>
              <CardDescription className="mt-1 ml-9">
                {loading ? "Loading..." : `${messages.length} messages loaded.`}{" "}
                Flag messages for review or delete individual messages.
              </CardDescription>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setClearDialogOpen(true)}
              disabled={messages.length === 0 || loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Chat
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {messagesError ? (
            <div className="py-12 text-center text-destructive">
              Error loading messages: {messagesError.message}
            </div>
          ) : loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No messages in this channel.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">User</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-[80px]">Type</TableHead>
                  <TableHead className="w-[150px]">Date</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((msg: any) => (
                  <TableRow
                    key={msg.id}
                    className={
                      msg.isFlagged ? "bg-red-50 dark:bg-red-950/20" : ""
                    }
                  >
                    <TableCell className="font-medium text-sm">
                      <div>
                        {msg.userName || "System"}
                        {msg.userRole === "admin" && (
                          <Badge variant="outline" className="ml-1 text-[10px]">
                            Admin
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        {truncate(msg.content)}
                        {msg.isFlagged && msg.flaggedReason && (
                          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <Flag className="h-3 w-3" />
                            {msg.flaggedReason}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {msg.messageType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(msg.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {msg.isFlagged ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-700"
                            title="Unflag Message"
                            onClick={() =>
                              unflagMutation.mutate({ messageId: msg.id })
                            }
                            disabled={unflagMutation.isPending}
                          >
                            <FlagOff className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-orange-500 hover:text-orange-600"
                            title="Flag Message"
                            onClick={() => {
                              setFlagTargetId(msg.id);
                              setFlagReason("");
                              setFlagDialogOpen(true);
                            }}
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete Message"
                          onClick={() => {
                            setDeleteTargetId(msg.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Message</DialogTitle>
            <DialogDescription>
              Flag this message for review. Optionally add a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flag-reason">Reason (optional)</Label>
              <Textarea
                id="flag-reason"
                placeholder="Why is this message being flagged?"
                value={flagReason}
                onChange={e => setFlagReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (flagTargetId) {
                  flagMutation.mutate({
                    messageId: flagTargetId,
                    reason: flagReason.trim() || undefined,
                  });
                }
              }}
              disabled={flagMutation.isPending}
            >
              {flagMutation.isPending ? "Flagging..." : "Flag Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Message Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this message. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTargetId) {
                  deleteMutation.mutate({ messageId: deleteTargetId });
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Channel Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear All Messages
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>all messages</strong> from{" "}
              <strong>#{channel.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                clearMutation.mutate({ channelId: channel.id });
              }}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? "Clearing..." : "Clear All Messages"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============= Flagged Messages Sub-Component =============
function FlaggedMessagesView({
  channels,
  onBack,
}: {
  channels: any[];
  onBack: () => void;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: flaggedMessages, isLoading: flaggedLoading } =
    trpc.chatModeration.getFlagged.useQuery();

  const deleteMutation = trpc.chatModeration.deleteMessage.useMutation({
    onSuccess: () => {
      toast.success("Message deleted");
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
      utils.chatModeration.getChannelMessages.invalidate();
      utils.chatModeration.getFlagged.invalidate();
      utils.chatModeration.getChannels.invalidate();
    },
    onError: error => {
      toast.error(`Failed to delete message: ${error.message}`);
    },
  });

  const unflagMutation = trpc.chatModeration.unflagMessage.useMutation({
    onSuccess: () => {
      toast.success("Message unflagged");
      utils.chatModeration.getChannelMessages.invalidate();
      utils.chatModeration.getFlagged.invalidate();
      utils.chatModeration.getChannels.invalidate();
    },
    onError: error => {
      toast.error(`Failed to unflag message: ${error.message}`);
    },
  });

  const flagged = flaggedMessages || [];
  const channelMap = new Map(channels.map((ch: any) => [ch.id, ch.name]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Flag className="h-4 w-4 text-destructive" />
                Flagged Messages
              </CardTitle>
              <CardDescription className="mt-1 ml-9">
                {flagged.length} flagged message
                {flagged.length !== 1 ? "s" : ""} across all channels
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {flaggedLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading flagged messages...
            </div>
          ) : flagged.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No flagged messages. Messages flagged by admins will appear here.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Channel</TableHead>
                  <TableHead className="w-[120px]">User</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-[150px]">Reason</TableHead>
                  <TableHead className="w-[130px]">Flagged</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flagged.map((msg: any) => (
                  <TableRow
                    key={msg.id}
                    className="bg-red-50 dark:bg-red-950/20"
                  >
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        {channelMap.get(msg.channelId) || `#${msg.channelId}`}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {msg.userName || "System"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {truncate(msg.content)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {msg.flaggedReason || "\u2014"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(msg.flaggedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-green-600 hover:text-green-700"
                          title="Unflag Message"
                          onClick={() =>
                            unflagMutation.mutate({ messageId: msg.id })
                          }
                          disabled={unflagMutation.isPending}
                        >
                          <FlagOff className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Delete Message"
                          onClick={() => {
                            setDeleteTargetId(msg.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Message Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this message. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTargetId) {
                  deleteMutation.mutate({ messageId: deleteTargetId });
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============= Main ChatModeration Component =============
export default function ChatModeration() {
  const [view, setView] = useState<View>("channels");
  const [search, setSearch] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearTargetChannel, setClearTargetChannel] = useState<{
    id: number;
    name: string;
    messageCount: number;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data: channels, isLoading: channelsLoading } =
    trpc.chatModeration.getChannels.useQuery();

  const clearMutation = trpc.chatModeration.clearChannel.useMutation({
    onSuccess: result => {
      toast.success(
        `Cleared ${result.deletedCount} messages from #${result.channelName}`
      );
      setClearDialogOpen(false);
      setClearTargetChannel(null);
      utils.chatModeration.getChannels.invalidate();
      utils.chatModeration.getFlagged.invalidate();
    },
    onError: error => {
      toast.error(`Failed to clear channel: ${error.message}`);
    },
  });

  const filteredChannels = (channels || []).filter((ch: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return ch.name?.toLowerCase().includes(q);
  });

  const totalFlagged = (channels || []).reduce(
    (sum: number, ch: any) => sum + (ch.flaggedCount || 0),
    0
  );

  const handleBack = () => {
    setView("channels");
    setSelectedChannel(null);
  };

  // Render sub-views as separate components so their queries run unconditionally
  if (view === "messages" && selectedChannel) {
    return (
      <ChannelMessagesView channel={selectedChannel} onBack={handleBack} />
    );
  }

  if (view === "flagged") {
    return (
      <FlaggedMessagesView channels={channels || []} onBack={handleBack} />
    );
  }

  // Channel list view
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Chat Moderation</CardTitle>
          <CardDescription>
            Manage messages across all channels. Clear chats, flag or delete
            individual messages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Top actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search channels..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={totalFlagged > 0 ? "destructive" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedChannel(null);
                setView("flagged");
              }}
            >
              <Flag className="h-4 w-4 mr-2" />
              Flagged Messages
              {totalFlagged > 0 && (
                <Badge className="ml-2 bg-white text-destructive text-xs px-1.5">
                  {totalFlagged}
                </Badge>
              )}
            </Button>
          </div>

          {/* Channel table */}
          {channelsLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading channels...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Flagged</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChannels.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
                      {search
                        ? "No channels match your search."
                        : "No channels found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredChannels.map((ch: any) => (
                    <TableRow key={ch.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          {ch.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {ch.type === "study_group" ? "Study Group" : "Topic"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{ch.messageCount ?? 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {ch.flaggedCount > 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            {ch.flaggedCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            0
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setSelectedChannel({
                                id: ch.id,
                                name: ch.name,
                              });
                              setView("messages");
                            }}
                          >
                            View Messages
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Clear All Messages"
                            onClick={() => {
                              setClearTargetChannel({
                                id: ch.id,
                                name: ch.name,
                                messageCount: ch.messageCount || 0,
                              });
                              setClearDialogOpen(true);
                            }}
                            disabled={ch.messageCount === 0}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Clear Channel Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear All Messages
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>
                all {clearTargetChannel?.messageCount ?? 0} messages
              </strong>{" "}
              from <strong>#{clearTargetChannel?.name}</strong>. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (clearTargetChannel) {
                  clearMutation.mutate({
                    channelId: clearTargetChannel.id,
                  });
                }
              }}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? "Clearing..." : "Clear All Messages"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
