import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar,
  Users,
  Send,
  Bell,
  CheckCircle,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function EventInvitees() {
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [eventLink, setEventLink] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");

  // Get all event posts
  const { data: events } = trpc.posts.getByType.useQuery({
    postType: "event",
    limit: 50,
  });

  // Get invitees for selected event
  const { data: invitees, refetch: refetchInvitees } =
    trpc.events.getInvitees.useQuery(
      { postId: selectedPostId! },
      { enabled: !!selectedPostId }
    );

  const sendConfirmationMutation = trpc.events.sendConfirmation.useMutation({
    onSuccess: data => {
      toast.success(
        `Confirmation sent to ${data.sentCount} invitee${data.sentCount !== 1 ? "s" : ""}`
      );
      setShowConfirmDialog(false);
      setEventLink("");
      setAdditionalInfo("");
      refetchInvitees();
    },
    onError: error => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const sendReminderMutation = trpc.events.sendReminder.useMutation({
    onSuccess: data => {
      toast.success(
        `Reminder sent to ${data.sentCount} invitee${data.sentCount !== 1 ? "s" : ""}`
      );
      setShowReminderDialog(false);
      setReminderMessage("");
      setEventLink("");
      refetchInvitees();
    },
    onError: error => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const statusColors: Record<string, string> = {
    interested: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    confirmed:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    declined: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  // Event list view
  if (!selectedPostId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Event Invitees</h2>
          <p className="text-muted-foreground">
            Track and manage interest for your events
          </p>
        </div>

        {!events || events.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No events created yet. Create an event from Chat Mode.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event: any) => (
              <Card
                key={event.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedPostId(event.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    Event
                  </div>
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <CardDescription>
                    {event.eventDate &&
                      format(
                        new Date(event.eventDate),
                        "EEEE, MMMM d, yyyy 'at' h:mm a"
                      )}
                    {event.eventLocation && ` | ${event.eventLocation}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Users className="h-4 w-4" />
                    View Invitees
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Invitees detail view
  const selectedEvent = events?.find((e: any) => e.id === selectedPostId);
  const interestedCount =
    invitees?.filter((r: any) => r.status === "interested").length || 0;
  const confirmedCount =
    invitees?.filter((r: any) => r.status === "confirmed").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedPostId(null)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{selectedEvent?.title}</h2>
          <p className="text-muted-foreground">
            {selectedEvent?.eventDate &&
              format(
                new Date(selectedEvent.eventDate),
                "EEEE, MMMM d, yyyy 'at' h:mm a"
              )}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{invitees?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Responses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{interestedCount}</p>
              <p className="text-xs text-muted-foreground">
                Awaiting Confirmation
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{confirmedCount}</p>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => setShowConfirmDialog(true)}
          disabled={interestedCount === 0}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          Send Confirmation ({interestedCount})
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowReminderDialog(true)}
          disabled={!invitees || invitees.length === 0}
          className="gap-2"
        >
          <Bell className="h-4 w-4" />
          Send Reminder
        </Button>
      </div>

      {/* Invitees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invitees</CardTitle>
        </CardHeader>
        <CardContent>
          {!invitees || invitees.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No one has indicated interest yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitees.map((rsvp: any) => (
                  <TableRow key={rsvp.id}>
                    <TableCell className="font-medium">{rsvp.name}</TableCell>
                    <TableCell>{rsvp.email}</TableCell>
                    <TableCell>{rsvp.phone || "-"}</TableCell>
                    <TableCell>{rsvp.company || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusColors[rsvp.status] || ""} border-0 capitalize`}
                      >
                        {rsvp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(rsvp.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Event Confirmation</DialogTitle>
            <DialogDescription>
              This will send confirmation emails to all {interestedCount}{" "}
              interested invitee{interestedCount !== 1 ? "s" : ""} with the
              event link and details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="eventLink">
                Event Link (meeting URL, registration page, etc.)
              </Label>
              <Input
                id="eventLink"
                value={eventLink}
                onChange={e => setEventLink(e.target.value)}
                placeholder="https://zoom.us/j/... or event page URL"
              />
            </div>
            <div>
              <Label htmlFor="additionalInfo">
                Additional Information (optional)
              </Label>
              <Textarea
                id="additionalInfo"
                value={additionalInfo}
                onChange={e => setAdditionalInfo(e.target.value)}
                placeholder="Any extra details for attendees..."
                rows={3}
              />
            </div>
            <Button
              onClick={() =>
                sendConfirmationMutation.mutate({
                  postId: selectedPostId!,
                  eventLink: eventLink || undefined,
                  additionalInfo: additionalInfo || undefined,
                })
              }
              disabled={sendConfirmationMutation.isPending}
              className="w-full"
            >
              {sendConfirmationMutation.isPending
                ? "Sending..."
                : `Send Confirmation to ${interestedCount} Invitee${interestedCount !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Event Reminder</DialogTitle>
            <DialogDescription>
              Send a reminder to all confirmed and interested invitees.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reminderLink">Event Link (optional)</Label>
              <Input
                id="reminderLink"
                value={eventLink}
                onChange={e => setEventLink(e.target.value)}
                placeholder="https://zoom.us/j/... or event page URL"
              />
            </div>
            <div>
              <Label htmlFor="reminderMsg">Reminder Message (optional)</Label>
              <Textarea
                id="reminderMsg"
                value={reminderMessage}
                onChange={e => setReminderMessage(e.target.value)}
                placeholder="Custom reminder message..."
                rows={3}
              />
            </div>
            <Button
              onClick={() =>
                sendReminderMutation.mutate({
                  postId: selectedPostId!,
                  eventLink: eventLink || undefined,
                  reminderMessage: reminderMessage || undefined,
                })
              }
              disabled={sendReminderMutation.isPending}
              className="w-full"
            >
              {sendReminderMutation.isPending ? "Sending..." : "Send Reminder"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
