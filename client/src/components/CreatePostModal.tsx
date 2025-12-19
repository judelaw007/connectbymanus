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
import { Calendar, Megaphone, FileText, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId?: number;
}

export default function CreatePostModal({ open, onOpenChange, channelId }: CreatePostModalProps) {
  const [postType, setPostType] = useState<"event" | "announcement" | "article" | "newsletter">("announcement");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [tags, setTags] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [priorityLevel, setPriorityLevel] = useState<"low" | "medium" | "high" | "urgent">("medium");

  const utils = trpc.useUtils();
  const createPostMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      toast.success("Post created successfully!");
      utils.posts.getByType.invalidate();
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to create post: ${error.message}`);
    },
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setEventDate("");
    setEventLocation("");
    setTags("");
    setFeaturedImage("");
    setPriorityLevel("medium");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const postData: any = {
      postType,
      title,
      content,
      channelId,
    };

    if (postType === "event") {
      postData.eventDate = eventDate ? new Date(eventDate) : undefined;
      postData.eventLocation = eventLocation;
    } else if (postType === "article") {
      postData.tags = tags;
      postData.featuredImage = featuredImage;
    } else if (postType === "announcement") {
      postData.priorityLevel = priorityLevel;
    }

    await createPostMutation.mutateAsync(postData);
  };

  const postTypes = [
    {
      value: "event",
      label: "Event",
      icon: Calendar,
      description: "Create an event with date and location",
    },
    {
      value: "announcement",
      label: "Announcement",
      icon: Megaphone,
      description: "Make an important announcement",
    },
    {
      value: "article",
      label: "Article",
      icon: FileText,
      description: "Publish an educational article",
    },
    {
      value: "newsletter",
      label: "Newsletter",
      icon: Mail,
      description: "Send a newsletter to members",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
          <DialogDescription>
            Choose a post type and fill in the details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Post Type Selection */}
          <div className="space-y-3">
            <Label>Post Type</Label>
            <RadioGroup value={postType} onValueChange={(value: any) => setPostType(value)}>
              <div className="grid grid-cols-2 gap-3">
                {postTypes.map((type) => (
                  <div key={type.value}>
                    <RadioGroupItem
                      value={type.value}
                      id={type.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={type.value}
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <type.icon className="mb-3 h-6 w-6" />
                      <div className="text-center">
                        <div className="font-semibold">{type.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {type.description}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Common Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter post title"
                required
              />
            </div>

            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter post content"
                rows={6}
                required
              />
            </div>
          </div>

          {/* Event-specific Fields */}
          {postType === "event" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="eventDate">Event Date</Label>
                <Input
                  id="eventDate"
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="eventLocation">Location / Link</Label>
                <Input
                  id="eventLocation"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Physical location or online meeting link"
                />
              </div>
            </div>
          )}

          {/* Article-specific Fields */}
          {postType === "article" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="tax, vat, international (comma-separated)"
                />
              </div>
              <div>
                <Label htmlFor="featuredImage">Featured Image URL</Label>
                <Input
                  id="featuredImage"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
          )}

          {/* Announcement-specific Fields */}
          {postType === "announcement" && (
            <div className="space-y-3">
              <Label>Priority Level</Label>
              <RadioGroup value={priorityLevel} onValueChange={(value: any) => setPriorityLevel(value)}>
                <div className="grid grid-cols-4 gap-2">
                  {["low", "medium", "high", "urgent"].map((level) => (
                    <div key={level}>
                      <RadioGroupItem
                        value={level}
                        id={`priority-${level}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`priority-${level}`}
                        className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer capitalize"
                      >
                        {level}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPostMutation.isPending}>
              {createPostMutation.isPending ? "Creating..." : "Create Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
