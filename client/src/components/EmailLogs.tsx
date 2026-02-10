import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function EmailLogs() {
  const {
    data: emailLogs,
    isLoading,
    error,
  } = trpc.emailLogs.getAll.useQuery({ limit: 100 });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Notification Logs</CardTitle>
          <CardDescription>Track all emails sent to users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-destructive py-8">
            Error loading email logs: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Notification Logs</CardTitle>
        <CardDescription>Track all emails sent to users</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading email logs...
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs && emailLogs.length > 0 ? (
                  emailLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {log.recipientName || "Unknown"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.recipientEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.subject}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.emailType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === "sent"
                              ? "default"
                              : log.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {log.status}
                        </Badge>
                        {log.status === "failed" && log.errorMessage && (
                          <div className="text-xs text-destructive mt-1">
                            {log.errorMessage}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
                      No email logs yet. Emails will appear here when sent.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
