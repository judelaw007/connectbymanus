import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { UserMinus, Crown, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface GroupMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number;
  groupName: string;
  currentUserRole: string | null;
  isAdmin: boolean;
}

export default function GroupMembersModal({
  open,
  onOpenChange,
  groupId,
  groupName,
  currentUserRole,
  isAdmin,
}: GroupMembersModalProps) {
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: members, isLoading } = trpc.studyGroups.getMembers.useQuery(
    { id: groupId },
    { enabled: open }
  );

  const removeMemberMutation = trpc.studyGroups.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Member removed from group");
      setRemovingUserId(null);
      utils.studyGroups.getMembers.invalidate({ id: groupId });
    },
    onError: error => {
      toast.error(`Failed to remove member: ${error.message}`);
      setRemovingUserId(null);
    },
  });

  const canRemoveMembers = currentUserRole === "owner" || isAdmin;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRemoveMember = () => {
    if (!removingUserId) return;
    removeMemberMutation.mutate({ groupId, userId: removingUserId });
  };

  const memberToRemove = members?.find((m: any) => m.id === removingUserId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Members — {groupName}</DialogTitle>
            <DialogDescription>
              {members?.length ?? 0} member
              {(members?.length ?? 0) !== 1 ? "s" : ""} in this group
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Loading members...
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-2">
                {members.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-2 px-1 rounded-md hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(member.displayName || member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {member.displayName || member.name || "Unknown"}
                          </span>
                          {member.memberRole === "owner" && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 gap-1"
                            >
                              <Crown className="h-2.5 w-2.5" />
                              Owner
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {canRemoveMembers && member.memberRole !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setRemovingUserId(member.id)}
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No members found.
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Remove member confirmation */}
      <AlertDialog
        open={removingUserId !== null}
        onOpenChange={open => {
          if (!open) setRemovingUserId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {memberToRemove?.displayName ||
                  memberToRemove?.name ||
                  "this user"}
              </strong>{" "}
              from {groupName}? They will need to rejoin to access the group
              again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMemberMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
