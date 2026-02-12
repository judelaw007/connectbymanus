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
import { Label } from "@/components/ui/label";
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
import {
  Search,
  Users,
  ShieldBan,
  ShieldCheck,
  Archive,
  Eye,
  AlertTriangle,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import GroupMembersModal from "@/components/GroupMembersModal";

type FilterStatus = "all" | "active" | "suspended" | "closed";

export default function GroupModeration() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendTargetId, setSuspendTargetId] = useState<number | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [membersGroupId, setMembersGroupId] = useState<number | null>(null);
  const [membersGroupName, setMembersGroupName] = useState("");

  const utils = trpc.useUtils();

  const { data: groups, isLoading } = trpc.studyGroups.listAll.useQuery();

  const suspendMutation = trpc.studyGroups.suspend.useMutation({
    onSuccess: () => {
      toast.success("Group suspended");
      setSuspendDialogOpen(false);
      setSuspendReason("");
      setSuspendTargetId(null);
      utils.studyGroups.listAll.invalidate();
    },
    onError: error => {
      toast.error(`Failed to suspend group: ${error.message}`);
    },
  });

  const unsuspendMutation = trpc.studyGroups.unsuspend.useMutation({
    onSuccess: () => {
      toast.success("Group unsuspended");
      utils.studyGroups.listAll.invalidate();
    },
    onError: error => {
      toast.error(`Failed to unsuspend group: ${error.message}`);
    },
  });

  const archiveMutation = trpc.studyGroups.archive.useMutation({
    onSuccess: () => {
      toast.success("Group archived");
      utils.studyGroups.listAll.invalidate();
    },
    onError: error => {
      toast.error(`Failed to archive group: ${error.message}`);
    },
  });

  const handleSuspend = () => {
    if (!suspendTargetId || !suspendReason.trim()) return;
    suspendMutation.mutate({
      id: suspendTargetId,
      reason: suspendReason.trim(),
    });
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const filtered = (groups || []).filter((g: any) => {
    // Status filter
    if (filterStatus === "active" && (g.isClosed || g.isSuspended))
      return false;
    if (filterStatus === "suspended" && !g.isSuspended) return false;
    if (filterStatus === "closed" && !g.isClosed) return false;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      return (
        g.name?.toLowerCase().includes(q) ||
        g.creatorName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusBadge = (group: any) => {
    if (group.isSuspended) {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (group.isClosed) {
      return <Badge variant="secondary">Archived</Badge>;
    }
    return (
      <Badge variant="outline" className="text-green-600 border-green-200">
        Active
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Study Group Moderation</CardTitle>
          <CardDescription>
            View, suspend, and manage all user-created study groups (
            {groups?.length ?? 0} total)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by group name or creator..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              {(
                [
                  { value: "all", label: "All" },
                  { value: "active", label: "Active" },
                  { value: "suspended", label: "Suspended" },
                  { value: "closed", label: "Archived" },
                ] as const
              ).map(f => (
                <Button
                  key={f.value}
                  variant={filterStatus === f.value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilterStatus(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading groups...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group Name</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      {search
                        ? "No groups match your search."
                        : "No study groups found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((group: any) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">
                        <div>
                          {group.name}
                          {group.isPrivate && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-[10px]"
                            >
                              Private
                            </Badge>
                          )}
                        </div>
                        {group.isSuspended && group.suspensionReason && (
                          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {group.suspensionReason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {group.creatorName || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{group.memberCount ?? 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(group)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(group.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="View Members"
                            onClick={() => {
                              setMembersGroupId(group.id);
                              setMembersGroupName(group.name);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {group.isSuspended ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600 hover:text-green-700"
                              title="Unsuspend Group"
                              onClick={() =>
                                unsuspendMutation.mutate({ id: group.id })
                              }
                              disabled={unsuspendMutation.isPending}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </Button>
                          ) : !group.isClosed ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                title="Suspend Group"
                                onClick={() => {
                                  setSuspendTargetId(group.id);
                                  setSuspendReason("");
                                  setSuspendDialogOpen(true);
                                }}
                              >
                                <ShieldBan className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                                title="Archive Group"
                                onClick={() =>
                                  archiveMutation.mutate({ id: group.id })
                                }
                                disabled={archiveMutation.isPending}
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : null}
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

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Study Group</DialogTitle>
            <DialogDescription>
              Suspended groups cannot be used for messaging. Members will see a
              notice explaining the suspension.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">Reason for suspension</Label>
              <Textarea
                id="suspend-reason"
                placeholder="Enter the reason for this suspension..."
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSuspendDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={!suspendReason.trim() || suspendMutation.isPending}
            >
              {suspendMutation.isPending ? "Suspending..." : "Suspend Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Modal */}
      {membersGroupId && (
        <GroupMembersModal
          open={!!membersGroupId}
          onOpenChange={open => {
            if (!open) {
              setMembersGroupId(null);
              setMembersGroupName("");
            }
          }}
          groupId={membersGroupId}
          groupName={membersGroupName}
          currentUserRole={null}
          isAdmin={true}
        />
      )}
    </div>
  );
}
