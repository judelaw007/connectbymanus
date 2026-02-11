import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Calendar, MapPin, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function EventInterest() {
  const params = useParams<{ id: string }>();
  const postId = Number(params.id);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: event, isLoading } = trpc.events.getPublicEvent.useQuery(
    { postId },
    { enabled: postId > 0 }
  );

  const submitMutation = trpc.events.submitInterest.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMutation.mutateAsync({
      postId,
      name,
      email,
      phone: phone || undefined,
      company: company || undefined,
      notes: notes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Event not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Thank You!</h2>
            <p className="text-muted-foreground">
              Your interest in <strong>{event.title}</strong> has been recorded.
              We'll send you a confirmation email with the full event details
              closer to the date.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Event Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-600 text-sm font-medium mb-2">
              <Calendar className="h-4 w-4" />
              MojiTax Event
            </div>
            <CardTitle className="text-2xl">{event.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {event.eventDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span>
                  {format(
                    new Date(event.eventDate),
                    "EEEE, MMMM d, yyyy 'at' h:mm a"
                  )}
                </span>
              </div>
            )}
            {event.eventLocation && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span>{event.eventLocation}</span>
              </div>
            )}
            <div
              className="text-foreground/80 mt-4 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: event.content }}
            />
          </CardContent>
        </Card>

        {/* Interest Form */}
        <Card>
          <CardHeader>
            <CardTitle>Indicate Your Interest</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fill in your details below and we'll send you the full event
              information and reminders.
            </p>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="company">Company / Organisation</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="notes">Any Questions or Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional"
                  rows={3}
                />
              </div>
              {submitMutation.error && (
                <p className="text-sm text-red-600">
                  {submitMutation.error.message}
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting..." : "I'm Interested!"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          MojiTax Connect &mdash; connect.mojitax.co.uk
        </p>
      </div>
    </div>
  );
}
