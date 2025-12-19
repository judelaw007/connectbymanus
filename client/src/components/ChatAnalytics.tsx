import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Search,
  Filter,
  TrendingUp,
  MessageSquare,
  Bot,
  User,
  AlertCircle,
  ArrowUpCircle,
  Calendar,
  Tag,
} from "lucide-react";

export default function ChatAnalytics() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [resolutionType, setResolutionType] = useState<string>("");
  const [enquiryType, setEnquiryType] = useState("");
  const [status, setStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const { data: summaryStats } = trpc.analytics.getSummaryStats.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: analyticsData, refetch } = trpc.analytics.getSupportAnalytics.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    resolutionType: resolutionType as any || undefined,
    enquiryType: enquiryType || undefined,
    status: status as any || undefined,
    searchQuery: searchQuery || undefined,
    limit: 100,
    offset: 0,
  });

  const { data: exportData } = trpc.analytics.exportToCSV.useQuery(
    {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      resolutionType: resolutionType as any || undefined,
      enquiryType: enquiryType || undefined,
      status: status as any || undefined,
    },
    { enabled: false }
  );

  const updateCategoryMutation = trpc.analytics.updateTicketCategory.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleExportCSV = () => {
    if (!analyticsData || analyticsData.length === 0) return;

    const headers = [
      "ID",
      "Date",
      "User",
      "Email",
      "Subject",
      "Status",
      "Resolution Type",
      "Enquiry Type",
      "Tags",
      "Bot Interactions",
      "Human Interactions",
      "Satisfaction",
      "Closed At",
    ];

    const rows = analyticsData.map((ticket) => [
      ticket.id,
      new Date(ticket.createdAt).toLocaleDateString(),
      ticket.userName || "Unknown",
      ticket.userEmail || "",
      ticket.subject,
      ticket.status,
      ticket.resolutionType || "N/A",
      ticket.enquiryType || "N/A",
      ticket.tags || "",
      ticket.botInteractionCount,
      ticket.humanInteractionCount,
      ticket.satisfactionRating || "N/A",
      ticket.closedAt ? new Date(ticket.closedAt).toLocaleDateString() : "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `moji-chat-analytics-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setResolutionType("");
    setEnquiryType("");
    setStatus("");
    setSearchQuery("");
  };

  const getResolutionBadge = (type: string | null) => {
    if (!type) return <Badge variant="outline">Uncategorized</Badge>;
    
    switch (type) {
      case "bot-answered":
        return <Badge className="bg-green-500 text-white">Bot Answered</Badge>;
      case "human-answered":
        return <Badge className="bg-blue-500 text-white">Human Answered</Badge>;
      case "no-answer":
        return <Badge className="bg-gray-500 text-white">No Answer</Badge>;
      case "escalated":
        return <Badge className="bg-orange-500 text-white">Escalated</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-yellow-500 text-white">Open</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-500 text-white">In Progress</Badge>;
      case "closed":
        return <Badge className="bg-gray-500 text-white">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6 bg-background">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Chat Analytics</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Analyze Moji chatbot interactions for insights and marketing
            </p>
          </div>
          <Button onClick={handleExportCSV} disabled={!analyticsData || analyticsData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary Stats */}
        {summaryStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Conversations</p>
                  <p className="text-2xl font-bold">{summaryStats.totalConversations}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Bot className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Bot Answered</p>
                  <p className="text-2xl font-bold">{summaryStats.botAnswered}</p>
                  <p className="text-xs text-muted-foreground">
                    {summaryStats.totalConversations > 0
                      ? `${Math.round((summaryStats.botAnswered / summaryStats.totalConversations) * 100)}%`
                      : "0%"}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Human Answered</p>
                  <p className="text-2xl font-bold">{summaryStats.humanAnswered}</p>
                  <p className="text-xs text-muted-foreground">
                    {summaryStats.totalConversations > 0
                      ? `${Math.round((summaryStats.humanAnswered / summaryStats.totalConversations) * 100)}%`
                      : "0%"}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <ArrowUpCircle className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Escalated</p>
                  <p className="text-2xl font-bold">{summaryStats.escalated}</p>
                  <p className="text-xs text-muted-foreground">
                    Avg: {summaryStats.avgHumanInteractions} human msgs
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="text-xs font-medium mb-1 block">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Resolution Type</label>
            <Select value={resolutionType} onValueChange={setResolutionType}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="bot-answered">Bot Answered</SelectItem>
                <SelectItem value="human-answered">Human Answered</SelectItem>
                <SelectItem value="no-answer">No Answer</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Enquiry Type</label>
            <Input
              value={enquiryType}
              onChange={(e) => setEnquiryType(e.target.value)}
              placeholder="e.g., VAT, ADIT"
              className="h-9"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="h-9 pl-8"
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead>Enquiry Type</TableHead>
                <TableHead>Bot/Human</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyticsData && analyticsData.length > 0 ? (
                analyticsData.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-xs">{ticket.id}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{ticket.userName || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{ticket.userEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm truncate">{ticket.subject}</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{getResolutionBadge(ticket.resolutionType)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ticket.enquiryType || "N/A"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex gap-2">
                        <span className="text-green-600">🤖 {ticket.botInteractionCount}</span>
                        <span className="text-blue-600">👤 {ticket.humanInteractionCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ticket.tags?.split(",").map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTicketId(ticket.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations found matching your filters</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
}
