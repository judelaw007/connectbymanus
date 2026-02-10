import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Lock, Users, Copy, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateGroupModal({
  open,
  onOpenChange,
}: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();
  const createChannelMutation = trpc.channels.create.useMutation({
    onSuccess: data => {
      if (data.inviteCode) {
        setInviteCode(data.inviteCode);
        toast.success(
          "Study group created! Share the invite code with members."
        );
      } else {
        toast.success("Study group created successfully!");
        resetForm();
        onOpenChange(false);
      }
      utils.channels.getMy.invalidate();
      utils.channels.getPublic.invalidate();
    },
    onError: error => {
      toast.error(`Failed to create group: ${error.message}`);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setIsPrivate(false);
    setInviteCode("");
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createChannelMutation.mutateAsync({
      name,
      description,
      type: "study_group",
      isPrivate,
    });
  };

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Invite code copied to clipboard!");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // If invite code is generated, show it
  if (inviteCode) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Study Group Created!</DialogTitle>
            <DialogDescription>
              Share this invite code with members to join your private group
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Invite Code
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-lg font-mono bg-background px-3 py-2 rounded">
                  {inviteCode}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyInviteCode}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Members can join by clicking "Join Group" and entering this code,
              or you can share a direct link.
            </p>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Study Group</DialogTitle>
          <DialogDescription>
            Create a space for collaborative learning and discussion
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., ADIT June 2025 Study Group"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this group about?"
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Privacy</Label>
            <RadioGroup
              value={isPrivate ? "private" : "public"}
              onValueChange={value => setIsPrivate(value === "private")}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <RadioGroupItem
                    value="public"
                    id="public"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="public"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Users className="mb-3 h-6 w-6" />
                    <div className="text-center">
                      <div className="font-semibold">Public</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Anyone can discover and join
                      </div>
                    </div>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem
                    value="private"
                    id="private"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="private"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Lock className="mb-3 h-6 w-6" />
                    <div className="text-center">
                      <div className="font-semibold">Private</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Invite-only with code
                      </div>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createChannelMutation.isPending}>
              {createChannelMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
