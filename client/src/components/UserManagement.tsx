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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Hash,
  MessageSquare,
  HelpCircle,
  ArrowLeft,
  Clock,
  Calendar,
  ShieldBan,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";

const PAGE_SIZE = 25;

interface Props {
  moderationMode?: boolean;
}

export default function UserManagement({ moderationMode = false }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<
    "created_at" | "last_signed_in" | "name"
  >("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Suspend dialog state
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendTargetId, setSuspendTargetId] = useState<number | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDuration, setSuspendDuration] = useState("permanent");

  // Debounce search input
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 300);
    setSearchTimeout(timeout);
  };

  const utils = trpc.useUtils();

  // User list query
  const { data: usersData, isLoading: usersLoading } = trpc.users.list.useQuery(
    {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      search: debouncedSearch || undefined,
      role:
        roleFilter === "all"
          ? undefined
          : (roleFilter as "user" | "admin" | "moderator"),
      sortBy,
      sortOrder,
    }
  );

  // User detail query (only when a user is selected)
  const { data: userDetail, isLoading: detailLoading } =
    trpc.users.getById.useQuery(
      { userId: selectedUserId! },
      { enabled: selectedUserId !== null }
    );

  // Suspend / unsuspend mutations
  const suspendMutation = trpc.users.suspend.useMutation({
    onSuccess: () => {
      setSuspendDialogOpen(false);
      setSuspendReason("");
      setSuspendDuration("permanent");
      setSuspendTargetId(null);
      utils.users.list.invalidate();
      if (selectedUserId)
        utils.users.getById.invalidate({ userId: selectedUserId });
    },
  });

  const unsuspendMutation = trpc.users.unsuspend.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      if (selectedUserId)
        utils.users.getById.invalidate({ userId: selectedUserId });
    },
  });

  const promoteMutation = trpc.users.promoteToAdmin.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      if (selectedUserId)
        utils.users.getById.invalidate({ userId: selectedUserId });
    },
  });

  const demoteMutation = trpc.users.demoteToUser.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      if (selectedUserId)
        utils.users.getById.invalidate({ userId: selectedUserId });
    },
  });

  const totalPages = Math.ceil((usersData?.total ?? 0) / PAGE_SIZE);

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">Admin</Badge>;
      case "moderator":
        return <Badge variant="secondary">Moderator</Badge>;
      default:
        return <Badge variant="outline">User</Badge>;
    }
  };

  const handleSuspend = () => {
    if (!suspendTargetId || !suspendReason.trim()) return;

    let until: string | undefined;
    if (suspendDuration !== "permanent") {
      const days = parseInt(suspendDuration);
      const date = new Date();
      date.setDate(date.getDate() + days);
      until = date.toISOString();
    }

    suspendMutation.mutate({
      userId: suspendTargetId,
      reason: suspendReason.trim(),
      until,
    });
  };

  const openSuspendDialog = (userId: number) => {
    setSuspendTargetId(userId);
    setSuspendReason("");
    setSuspendDuration("permanent");
    setSuspendDialogOpen(true);
  };

  // Suspend dialog
  const suspendDialog = (
    <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend User</DialogTitle>
          <DialogDescription>
            Suspended users cannot send messages or create support tickets. They
            remain MojiTax customers and can still log in and read content.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for suspension</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for this suspension..."
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={suspendDuration} onValueChange={setSuspendDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">1 week</SelectItem>
                <SelectItem value="14">2 weeks</SelectItem>
                <SelectItem value="30">1 month</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSuspend}
            disabled={!suspendReason.trim() || suspendMutation.isPending}
          >
            {suspendMutation.isPending ? "Suspending..." : "Suspend User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // User detail view
  if (selectedUserId !== null) {
    return (
      <div className="space-y-6">
        {suspendDialog}
        <Button
          variant="ghost"
          onClick={() => setSelectedUserId(null)}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>

        {detailLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading user details...
            </CardContent>
          </Card>
        ) : userDetail ? (
          <>
            {/* Suspension Banner */}
            {userDetail.isSuspended && (
              <Card className="border-destructive bg-destructive/5">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <div>
                        <p className="font-medium text-destructive">
                          User is suspended
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Reason: {userDetail.suspensionReason}
                        </p>
                        {userDetail.suspendedUntil && (
                          <p className="text-sm text-muted-foreground">
                            Until: {formatDate(userDetail.suspendedUntil)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        unsuspendMutation.mutate({ userId: userDetail.id })
                      }
                      disabled={unsuspendMutation.isPending}
                    >
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      {unsuspendMutation.isPending
                        ? "Removing..."
                        : "Remove Suspension"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User Profile Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>
                        {userDetail.displayName ||
                          userDetail.name ||
                          "Unnamed User"}
                      </CardTitle>
                      <CardDescription>{userDetail.email}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {roleBadge(userDetail.role)}
                    {userDetail.role !== "admin" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          promoteMutation.mutate({ userId: userDetail.id })
                        }
                        disabled={promoteMutation.isPending}
                      >
                        <ShieldAlert className="h-4 w-4 mr-2" />
                        {promoteMutation.isPending
                          ? "Promoting..."
                          : "Promote to Admin"}
                      </Button>
                    )}
                    {userDetail.role === "admin" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          demoteMutation.mutate({ userId: userDetail.id })
                        }
                        disabled={demoteMutation.isPending}
                      >
                        <ShieldBan className="h-4 w-4 mr-2" />
                        {demoteMutation.isPending
                          ? "Demoting..."
                          : "Demote to User"}
                      </Button>
                    )}
                    {userDetail.role !== "admin" && !userDetail.isSuspended && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openSuspendDialog(userDetail.id)}
                      >
                        <ShieldBan className="h-4 w-4 mr-2" />
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Joined:</span>
                    <span>{formatDate(userDetail.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last active:</span>
                    <span>{formatDate(userDetail.lastSignedIn)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Messages:</span>
                    <span className="font-medium">
                      {userDetail.messageCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Tickets:</span>
                    <span className="font-medium">
                      {userDetail.ticketCount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Channels Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Channels ({userDetail.channels?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userDetail.channels?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userDetail.channels.map(
                        (ch: {
                          id: number;
                          name: string;
                          type: string;
                          role: string;
                          joinedAt: string;
                        }) => (
                          <TableRow key={ch.id}>
                            <TableCell className="flex items-center gap-2">
                              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                              {ch.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {ch.type.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize">
                              {ch.role}
                            </TableCell>
                            <TableCell>{formatDate(ch.joinedAt)}</TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Not a member of any channels.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              User not found.
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Filter to only suspended users in moderation mode
  const displayUsers = moderationMode
    ? (usersData?.users.filter(u => u.isSuspended) ?? [])
    : (usersData?.users ?? []);

  const title = moderationMode ? "User Moderation" : "Users";
  const description = moderationMode
    ? "Suspended users who cannot send messages or create tickets"
    : `${usersData?.total ?? 0} registered users`;

  // User list view
  return (
    <div className="space-y-6">
      {suspendDialog}
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            {!moderationMode && (
              <>
                <Select
                  value={roleFilter}
                  onValueChange={v => {
                    setRoleFilter(v);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="user">Users</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={sortBy}
                  onValueChange={v => {
                    setSortBy(v as typeof sortBy);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Sort by joined</SelectItem>
                    <SelectItem value="last_signed_in">
                      Sort by active
                    </SelectItem>
                    <SelectItem value="name">Sort by name</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setSortOrder(prev => (prev === "asc" ? "desc" : "asc"))
                  }
                  title={sortOrder === "asc" ? "Ascending" : "Descending"}
                >
                  {sortOrder === "asc" ? "\u2191" : "\u2193"}
                </Button>
              </>
            )}
          </div>

          {/* Table */}
          {usersLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading users...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  {moderationMode ? (
                    <>
                      <TableHead>Reason</TableHead>
                      <TableHead>Until</TableHead>
                      <TableHead>Actions</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Active</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      {moderationMode
                        ? "No suspended users."
                        : debouncedSearch
                          ? "No users match your search."
                          : "No users found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayUsers.map(user => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <TableCell className="font-medium">
                        {user.displayName || user.name || "Unnamed"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email || "-"}
                      </TableCell>
                      <TableCell>{roleBadge(user.role)}</TableCell>
                      {moderationMode ? (
                        <>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {user.suspensionReason || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.suspendedUntil
                              ? formatDate(user.suspendedUntil)
                              : "Permanent"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                unsuspendMutation.mutate({ userId: user.id });
                              }}
                              disabled={unsuspendMutation.isPending}
                            >
                              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                              Unsuspend
                            </Button>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            {user.isSuspended ? (
                              <Badge variant="destructive">Suspended</Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-green-600 border-green-200"
                              >
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(user.createdAt)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(user.lastSignedIn)}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination (not shown in moderation mode since it filters client-side) */}
          {!moderationMode && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
