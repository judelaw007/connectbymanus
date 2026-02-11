import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Hash, Link, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CreateChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateChannelModal({
  open,
  onOpenChange,
}: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [linkType, setLinkType] = useState<
    "none" | "course" | "bundle" | "subscription"
  >("none");
  const [selectedEntityId, setSelectedEntityId] = useState("");

  const utils = trpc.useUtils();

  const { data: catalog, isLoading: catalogLoading } =
    trpc.channels.getLearnworldsCatalog.useQuery(undefined, {
      enabled: open,
    });

  const createChannelMutation = trpc.channels.create.useMutation({
    onSuccess: () => {
      toast.success("Channel created successfully!");
      resetForm();
      onOpenChange(false);
      utils.channels.getPublic.invalidate();
      utils.channels.getMy.invalidate();
    },
    onError: error => {
      toast.error(`Failed to create channel: ${error.message}`);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setLinkType("none");
    setSelectedEntityId("");
  };

  // Reset entity selection when link type changes
  useEffect(() => {
    setSelectedEntityId("");
  }, [linkType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const input: any = {
      name,
      description,
      type: "topic" as const,
      isPrivate: false,
    };

    if (linkType === "course" && selectedEntityId) {
      input.learnworldsCourseId = selectedEntityId;
    } else if (linkType === "bundle" && selectedEntityId) {
      input.learnworldsBundleId = selectedEntityId;
    } else if (linkType === "subscription" && selectedEntityId) {
      input.learnworldsSubscriptionId = selectedEntityId;
    }

    await createChannelMutation.mutateAsync(input);
  };

  const entityOptions =
    linkType === "course"
      ? catalog?.courses || []
      : linkType === "bundle"
        ? catalog?.bundles || []
        : linkType === "subscription"
          ? catalog?.subscriptions || []
          : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Create Channel
          </DialogTitle>
          <DialogDescription>
            Create a topic channel. Optionally link it to a Learnworlds entity
            for automatic user enrollment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="channel-name">Channel Name *</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Transfer Pricing"
              required
            />
          </div>

          <div>
            <Label htmlFor="channel-desc">Description</Label>
            <Textarea
              id="channel-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              rows={3}
            />
          </div>

          {/* Learnworlds Linking */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">
                Learnworlds Integration
              </Label>
              <Badge variant="outline" className="text-xs">
                Optional
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Link to a Learnworlds entity to auto-enroll users who have
              purchased that course, bundle, or subscription.
            </p>

            <Select
              value={linkType}
              onValueChange={v =>
                setLinkType(v as "none" | "course" | "bundle" | "subscription")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select link type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linking</SelectItem>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="bundle">Bundle</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
              </SelectContent>
            </Select>

            {linkType !== "none" && (
              <div>
                {catalogLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading catalog...
                  </div>
                ) : entityOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No {linkType}s found in Learnworlds. Check your API
                    credentials.
                  </p>
                ) : (
                  <Select
                    value={selectedEntityId}
                    onValueChange={setSelectedEntityId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select a ${linkType}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {entityOptions.map(entity => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createChannelMutation.isPending || !name.trim()}
            >
              {createChannelMutation.isPending
                ? "Creating..."
                : "Create Channel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
