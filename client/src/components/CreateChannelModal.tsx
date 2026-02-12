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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Hash,
  Link,
  Loader2,
  GraduationCap,
  Package,
  CreditCard,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CreateChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SelectedLink = {
  entityType: "course" | "bundle" | "subscription";
  entityId: string;
  entityTitle: string;
};

const SECTION_ICONS = {
  course: GraduationCap,
  bundle: Package,
  subscription: CreditCard,
};

const SECTION_COLORS = {
  course: "text-emerald-600 dark:text-emerald-400",
  bundle: "text-purple-600 dark:text-purple-400",
  subscription: "text-amber-600 dark:text-amber-400",
};

const BADGE_COLORS = {
  course:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  bundle:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  subscription:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

export default function CreateChannelModal({
  open,
  onOpenChange,
}: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLinks, setSelectedLinks] = useState<SelectedLink[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

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
    setSelectedLinks([]);
    setExpandedSections(new Set());
  };

  const toggleLink = (link: SelectedLink) => {
    setSelectedLinks(prev => {
      const exists = prev.some(
        l => l.entityType === link.entityType && l.entityId === link.entityId
      );
      if (exists) {
        return prev.filter(
          l =>
            !(l.entityType === link.entityType && l.entityId === link.entityId)
        );
      }
      return [...prev, link];
    });
  };

  const removeLink = (link: SelectedLink) => {
    setSelectedLinks(prev =>
      prev.filter(
        l => !(l.entityType === link.entityType && l.entityId === link.entityId)
      )
    );
  };

  const isSelected = (entityType: string, entityId: string) =>
    selectedLinks.some(
      l => l.entityType === entityType && l.entityId === entityId
    );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createChannelMutation.mutateAsync({
      name,
      description,
      type: "topic" as const,
      isPrivate: false,
      learnworldsLinks: selectedLinks.map(l => ({
        entityType: l.entityType,
        entityId: l.entityId,
        entityTitle: l.entityTitle,
      })),
    });
  };

  const sections = [
    {
      type: "course" as const,
      label: "Courses",
      items: catalog?.courses || [],
    },
    {
      type: "bundle" as const,
      label: "Bundles",
      items: catalog?.bundles || [],
    },
    {
      type: "subscription" as const,
      label: "Subscriptions",
      items: catalog?.subscriptions || [],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Create Channel
          </DialogTitle>
          <DialogDescription>
            Create a topic channel and link it to one or more Learnworlds
            courses, bundles, or subscriptions for automatic user enrollment.
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

          {/* Selected entities chips */}
          {selectedLinks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedLinks.map(link => {
                const Icon = SECTION_ICONS[link.entityType];
                return (
                  <Badge
                    key={`${link.entityType}-${link.entityId}`}
                    variant="secondary"
                    className={`gap-1 pr-1 ${BADGE_COLORS[link.entityType]}`}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="max-w-[150px] truncate">
                      {link.entityTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLink(link)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Learnworlds Linking */}
          <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">
                Learnworlds Integration
              </Label>
              {selectedLinks.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {selectedLinks.length} selected
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Select courses, bundles, or subscriptions. Users enrolled in any
              selected entity will be auto-added to this channel.
            </p>

            {catalogLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading catalog...
              </div>
            ) : (
              <div className="space-y-1">
                {sections.map(section => {
                  const Icon = SECTION_ICONS[section.type];
                  const isExpanded = expandedSections.has(section.type);
                  const selectedCount = selectedLinks.filter(
                    l => l.entityType === section.type
                  ).length;

                  if (section.items.length === 0) return null;

                  return (
                    <div key={section.type}>
                      <button
                        type="button"
                        onClick={() => toggleSection(section.type)}
                        className="flex items-center gap-2 w-full text-left py-1.5 px-1 rounded hover:bg-accent/50 text-sm"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <Icon
                          className={`h-4 w-4 ${SECTION_COLORS[section.type]}`}
                        />
                        <span className="font-medium">{section.label}</span>
                        <span className="text-muted-foreground text-xs">
                          ({section.items.length})
                        </span>
                        {selectedCount > 0 && (
                          <Badge
                            variant="secondary"
                            className={`ml-auto text-xs ${BADGE_COLORS[section.type]}`}
                          >
                            {selectedCount}
                          </Badge>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="ml-5 space-y-1 py-1">
                          {section.items.map(item => (
                            <label
                              key={item.id}
                              className="flex items-center gap-2 py-1 px-2 rounded hover:bg-accent/50 cursor-pointer text-sm"
                            >
                              <Checkbox
                                checked={isSelected(section.type, item.id)}
                                onCheckedChange={() =>
                                  toggleLink({
                                    entityType: section.type,
                                    entityId: item.id,
                                    entityTitle: item.title,
                                  })
                                }
                              />
                              <span className="truncate">{item.title}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
