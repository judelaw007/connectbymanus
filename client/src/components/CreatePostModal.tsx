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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Megaphone,
  FileText,
  Mail,
  FlaskConical,
  AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId?: number;
}

const TEST_EMAIL_VALUE = "__test__";

export default function CreatePostModal({
  open,
  onOpenChange,
  channelId,
}: CreatePostModalProps) {
  const [postType, setPostType] = useState<
    "event" | "announcement" | "article" | "newsletter"
  >("announcement");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [tags, setTags] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [priorityLevel, setPriorityLevel] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [selectedChannel, setSelectedChannel] = useState<string>(
    channelId ? String(channelId) : TEST_EMAIL_VALUE
  );
  const [testEmail, setTestEmail] = useState("");

  const isTestMode = selectedChannel === TEST_EMAIL_VALUE;

  const { data: channels } = trpc.channels.getPublic.useQuery();

  const utils = trpc.useUtils();
  const createPostMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      toast.success("Post created and emails sent!");
      utils.posts.getByType.invalidate();
      resetForm();
      onOpenChange(false);
    },
    onError: error => {
      toast.error(`Failed to create post: ${error.message}`);
    },
  });

  const testSendMutation = trpc.posts.testSend.useMutation({
    onSuccess: data => {
      if (data.success) {
        toast.success(`Test email sent to ${data.sentTo}`);
      } else {
        toast.error(`Test email failed: ${data.error || "Unknown error"}`);
      }
    },
    onError: error => {
      toast.error(`Test send failed: ${error.message}`);
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
    setSelectedChannel(channelId ? String(channelId) : TEST_EMAIL_VALUE);
    setTestEmail("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isTestMode) {
      // Test send — only email, no channel post
      if (!testEmail) {
        toast.error("Please enter a test email address");
        return;
      }

      const testData: Parameters<typeof testSendMutation.mutateAsync>[0] = {
        postType,
        title,
        content,
        testEmail,
      };

      if (postType === "event") {
        testData.eventDate = eventDate ? new Date(eventDate) : undefined;
        testData.eventLocation = eventLocation;
      } else if (postType === "article") {
        testData.tags = tags;
      } else if (postType === "announcement") {
        testData.priorityLevel = priorityLevel;
      }

      await testSendMutation.mutateAsync(testData);
      return;
    }

    // Real post — channel message + email distribution
    const postData: Parameters<typeof createPostMutation.mutateAsync>[0] = {
      postType,
      title,
      content,
      channelId: Number(selectedChannel),
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

  const isPending = createPostMutation.isPending || testSendMutation.isPending;

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
            Choose a post type, select a channel, and fill in the details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Post Type Selection */}
          <div className="space-y-3">
            <Label>Post Type</Label>
            <RadioGroup
              value={postType}
              onValueChange={(value: any) => setPostType(value)}
            >
              <div className="grid grid-cols-2 gap-3">
                {postTypes.map(type => (
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

          {/* Channel / Test Email Dropdown */}
          <div className="space-y-2">
            <Label>Send To</Label>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TEST_EMAIL_VALUE}>
                  <span className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-amber-500" />
                    Test Email (preview only)
                  </span>
                </SelectItem>
                <SelectSeparator />
                {channels?.map((ch: any) => (
                  <SelectItem key={ch.id} value={String(ch.id)}>
                    #{ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isTestMode && (
              <div className="space-y-2 mt-3">
                <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                  <FlaskConical className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Test mode: sends the real email template to your test email
                    only. Nothing is posted to any channel and no other users
                    are emailed.
                  </p>
                </div>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="Enter your test email address"
                  required={isTestMode}
                />
              </div>
            )}

            {!isTestMode && (
              <div className="flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 mt-2">
                <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This will post to the channel and send emails to{" "}
                  {selectedChannel === "1" ? (
                    <strong>all users</strong>
                  ) : (
                    "all channel members"
                  )}
                  .
                </p>
              </div>
            )}
          </div>

          {/* Common Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter post title"
                required
              />
            </div>

            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={e => setContent(e.target.value)}
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
                  onChange={e => setEventDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="eventLocation">Location / Link</Label>
                <Input
                  id="eventLocation"
                  value={eventLocation}
                  onChange={e => setEventLocation(e.target.value)}
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
                  onChange={e => setTags(e.target.value)}
                  placeholder="tax, vat, international (comma-separated)"
                />
              </div>
              {!isTestMode && (
                <div>
                  <Label htmlFor="featuredImage">Featured Image URL</Label>
                  <Input
                    id="featuredImage"
                    value={featuredImage}
                    onChange={e => setFeaturedImage(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              )}
            </div>
          )}

          {/* Announcement-specific Fields */}
          {postType === "announcement" && (
            <div className="space-y-3">
              <Label>Priority Level</Label>
              <RadioGroup
                value={priorityLevel}
                onValueChange={(value: any) => setPriorityLevel(value)}
              >
                <div className="grid grid-cols-4 gap-2">
                  {["low", "medium", "high", "urgent"].map(level => (
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              variant={isTestMode ? "outline" : "default"}
              className={
                isTestMode
                  ? "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/30"
                  : ""
              }
            >
              {isPending
                ? isTestMode
                  ? "Sending test..."
                  : "Publishing..."
                : isTestMode
                  ? "Send Test Email"
                  : "Publish Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
