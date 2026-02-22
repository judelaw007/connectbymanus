import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload,
  Save,
  Search,
  Edit,
  Trash2,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MojiSettings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAnswerDialog, setShowAnswerDialog] = useState<any>(null);
  const [newEntry, setNewEntry] = useState({
    question: "",
    answer: "",
    category: "",
    tags: "",
    expiresAt: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: knowledgeBase, refetch } =
    trpc.mojiKnowledge.getAllWithExpired.useQuery();
  const { data: flaggedQuestions, refetch: refetchFlagged } =
    trpc.mojiFlaggedQuestions.getAll.useQuery();
  const createMutation = trpc.mojiKnowledge.create.useMutation();
  const updateMutation = trpc.mojiKnowledge.update.useMutation();
  const deleteMutation = trpc.mojiKnowledge.delete.useMutation();
  const bulkUploadMutation = trpc.mojiKnowledge.bulkUpload.useMutation();
  const addToKBMutation =
    trpc.mojiFlaggedQuestions.addToKnowledgeBase.useMutation();
  const dismissMutation = trpc.mojiFlaggedQuestions.dismiss.useMutation();
  const deleteFlaggedMutation = trpc.mojiFlaggedQuestions.delete.useMutation();

  const handleDownloadTemplate = () => {
    const csvContent = `"question","answer","category","tags","expires_at"
"What is ADIT?","ADIT stands for Advanced Diploma in International Taxation, offered by the Chartered Institute of Taxation (CIOT). It is the leading international tax qualification.","Exams","ADIT,qualification,CIOT",""
"When is the next ADIT exam sitting?","The next ADIT exam sitting is in June 2026. Registration closes 30 April 2026.","Exams","ADIT,exam,dates","2026-06-30"
"How do I contact support?","You can chat with @moji for quick help, or use the 'Chat with Team MojiTax' feature to create a support ticket for human assistance.","Platform Help","support,help,contact",""`;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "moji_knowledge_base_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const filteredKnowledge = knowledgeBase?.filter(
    entry =>
      entry.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.tags &&
        entry.tags.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const parseCSVLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          fields.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const handleCSVUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async e => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim());

      // Skip header row
      const entries = lines
        .slice(1)
        .map(line => {
          const fields = parseCSVLine(line);
          return {
            question: fields[0] || "",
            answer: fields[1] || "",
            category: fields[2] || "",
            tags: fields[3] || "",
            expiresAt: fields[4] || undefined,
          };
        })
        .filter(entry => entry.question && entry.answer);

      try {
        await bulkUploadMutation.mutateAsync({ entries });
        toast.success(`Uploaded ${entries.length} knowledge base entries`);
        refetch();
      } catch (error) {
        toast.error("Failed to upload CSV");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddEntry = async () => {
    if (!newEntry.question || !newEntry.answer) {
      toast.error("Question and answer are required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...newEntry,
        expiresAt: newEntry.expiresAt || undefined,
      });
      toast.success("Knowledge base entry added");
      setShowAddDialog(false);
      setNewEntry({
        question: "",
        answer: "",
        category: "",
        tags: "",
        expiresAt: "",
      });
      refetch();
    } catch (error) {
      toast.error("Failed to add entry");
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;

    try {
      await updateMutation.mutateAsync({
        ...editingEntry,
        expiresAt: editingEntry.expiresAt || null,
      });
      toast.success("Knowledge base entry updated");
      setEditingEntry(null);
      refetch();
    } catch (error) {
      toast.error("Failed to update entry");
    }
  };

  const handleDeleteEntry = async (id: number) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Knowledge base entry deleted");
      refetch();
    } catch (error) {
      toast.error("Failed to delete entry");
    }
  };

  const handleAddFlaggedToKB = async () => {
    if (!showAnswerDialog) return;

    try {
      await addToKBMutation.mutateAsync({
        flaggedId: showAnswerDialog.flaggedId,
        question: showAnswerDialog.question,
        answer: showAnswerDialog.answer,
        category: showAnswerDialog.category || undefined,
        tags: showAnswerDialog.tags || undefined,
        expiresAt: showAnswerDialog.expiresAt || undefined,
      });
      toast.success("Added to knowledge base");
      setShowAnswerDialog(null);
      refetch();
      refetchFlagged();
    } catch (error) {
      toast.error("Failed to add to knowledge base");
    }
  };

  const handleDismissFlagged = async (id: number) => {
    try {
      await dismissMutation.mutateAsync({ id });
      toast.success("Question dismissed");
      refetchFlagged();
    } catch (error) {
      toast.error("Failed to dismiss question");
    }
  };

  const handleDeleteFlagged = async (id: number) => {
    try {
      await deleteFlaggedMutation.mutateAsync({ id });
      refetchFlagged();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const pendingFlagged =
    flaggedQuestions?.filter((q: any) => q.status === "pending") || [];

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Moji Chatbot Configuration</CardTitle>
          <CardDescription>
            Configure @moji's behavior and responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Auto-respond to mentions</p>
              <p className="text-sm text-muted-foreground">
                Respond when @moji is mentioned in chat
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Escalate to human agents</p>
              <p className="text-sm text-muted-foreground">
                Forward to "Chat with Team MojiTax" when Moji can't answer
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Flagged Questions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Flagged Questions
            {pendingFlagged.length > 0 && (
              <Badge variant="destructive">{pendingFlagged.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Questions @moji couldn't answer confidently. Review and add answers
            to improve the knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {flaggedQuestions && flaggedQuestions.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Question</TableHead>
                    <TableHead className="w-[30%]">Bot Response</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flaggedQuestions.map((q: any) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">
                        {q.question.substring(0, 120)}
                        {q.question.length > 120 ? "..." : ""}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {q.botResponse
                          ? q.botResponse.substring(0, 80) + "..."
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {q.status === "pending" && (
                          <Badge variant="outline" className="text-amber-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {q.status === "added" && (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Added
                          </Badge>
                        )}
                        {q.status === "dismissed" && (
                          <Badge variant="outline" className="text-gray-500">
                            <XCircle className="h-3 w-3 mr-1" />
                            Dismissed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {q.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setShowAnswerDialog({
                                    flaggedId: q.id,
                                    question: q.question,
                                    answer: "",
                                    category: "",
                                    tags: "",
                                    expiresAt: "",
                                  })
                                }
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Answer
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDismissFlagged(q.id)}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Dismiss
                              </Button>
                            </>
                          )}
                          {q.status !== "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteFlagged(q.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6">
              No flagged questions yet. Questions @moji can't answer will appear
              here for review.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Knowledge Base Management */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base Management</CardTitle>
          <CardDescription>
            Upload, search, and manage Moji's knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* CSV Upload */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={bulkUploadMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              {bulkUploadMutation.isPending ? "Uploading..." : "Upload CSV"}
            </Button>
            <Button variant="outline" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong>CSV format:</strong> question, answer, category, tags,
              expires_at (one entry per line, quoted strings)
            </p>
            <p>
              <strong>Expires at:</strong> Optional date (YYYY-MM-DD) after
              which the entry is no longer used by @moji. Leave blank for no
              expiry.
            </p>
            <p>
              <strong>Categories:</strong> Services, Platform Help, Exams, VAT,
              Transfer Pricing, International Tax
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Knowledge Base Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Question</TableHead>
                  <TableHead className="w-[35%]">Answer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKnowledge && filteredKnowledge.length > 0 ? (
                  filteredKnowledge.map((entry: any) => (
                    <TableRow
                      key={entry.id}
                      className={isExpired(entry.expiresAt) ? "opacity-50" : ""}
                    >
                      <TableCell className="font-medium">
                        {entry.question}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.answer.substring(0, 100)}...
                      </TableCell>
                      <TableCell>{entry.category || "-"}</TableCell>
                      <TableCell>
                        {entry.expiresAt ? (
                          isExpired(entry.expiresAt) ? (
                            <Badge
                              variant="destructive"
                              className="text-xs whitespace-nowrap"
                            >
                              Expired{" "}
                              {new Date(entry.expiresAt).toLocaleDateString()}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs whitespace-nowrap"
                            >
                              {new Date(entry.expiresAt).toLocaleDateString()}
                            </Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setEditingEntry({
                                ...entry,
                                expiresAt: entry.expiresAt
                                  ? new Date(entry.expiresAt)
                                      .toISOString()
                                      .split("T")[0]
                                  : "",
                              })
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
                      {searchQuery
                        ? "No matching entries found"
                        : "No knowledge base entries yet. Upload a CSV or add entries manually."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Knowledge Base Entry</DialogTitle>
            <DialogDescription>
              Add a new question and answer to Moji's knowledge base
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-question">Question</Label>
              <Input
                id="new-question"
                value={newEntry.question}
                onChange={e =>
                  setNewEntry({ ...newEntry, question: e.target.value })
                }
                placeholder="What is the full meaning of ADIT?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-answer">Answer</Label>
              <Textarea
                id="new-answer"
                value={newEntry.answer}
                onChange={e =>
                  setNewEntry({ ...newEntry, answer: e.target.value })
                }
                placeholder="ADIT stands for Advanced Diploma in International Taxation..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-category">Category (optional)</Label>
              <Input
                id="new-category"
                value={newEntry.category}
                onChange={e =>
                  setNewEntry({ ...newEntry, category: e.target.value })
                }
                placeholder="Exams"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-tags">Tags (optional, comma-separated)</Label>
              <Input
                id="new-tags"
                value={newEntry.tags}
                onChange={e =>
                  setNewEntry({ ...newEntry, tags: e.target.value })
                }
                placeholder="ADIT, exam, qualification"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-expires">Expires at (optional)</Label>
              <Input
                id="new-expires"
                type="date"
                value={newEntry.expiresAt}
                onChange={e =>
                  setNewEntry({ ...newEntry, expiresAt: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                After this date, @moji will stop using this answer. Leave blank
                for no expiry.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddEntry}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Adding..." : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Knowledge Base Entry</DialogTitle>
            <DialogDescription>
              Update the question and answer
            </DialogDescription>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-question">Question</Label>
                <Input
                  id="edit-question"
                  value={editingEntry.question}
                  onChange={e =>
                    setEditingEntry({
                      ...editingEntry,
                      question: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-answer">Answer</Label>
                <Textarea
                  id="edit-answer"
                  value={editingEntry.answer}
                  onChange={e =>
                    setEditingEntry({ ...editingEntry, answer: e.target.value })
                  }
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  value={editingEntry.category || ""}
                  onChange={e =>
                    setEditingEntry({
                      ...editingEntry,
                      category: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tags">Tags</Label>
                <Input
                  id="edit-tags"
                  value={editingEntry.tags || ""}
                  onChange={e =>
                    setEditingEntry({ ...editingEntry, tags: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expires">Expires at</Label>
                <Input
                  id="edit-expires"
                  type="date"
                  value={editingEntry.expiresAt || ""}
                  onChange={e =>
                    setEditingEntry({
                      ...editingEntry,
                      expiresAt: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Clear this field to remove the expiry date.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateEntry}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Answer Flagged Question Dialog */}
      <Dialog
        open={!!showAnswerDialog}
        onOpenChange={() => setShowAnswerDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Answer to Knowledge Base</DialogTitle>
            <DialogDescription>
              Provide an answer for this flagged question to teach @moji
            </DialogDescription>
          </DialogHeader>
          {showAnswerDialog && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="flagged-question">Question</Label>
                <Textarea
                  id="flagged-question"
                  value={showAnswerDialog.question}
                  onChange={e =>
                    setShowAnswerDialog({
                      ...showAnswerDialog,
                      question: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flagged-answer">Answer</Label>
                <Textarea
                  id="flagged-answer"
                  value={showAnswerDialog.answer}
                  onChange={e =>
                    setShowAnswerDialog({
                      ...showAnswerDialog,
                      answer: e.target.value,
                    })
                  }
                  placeholder="Type the answer @moji should give for this question..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flagged-category">Category (optional)</Label>
                <Input
                  id="flagged-category"
                  value={showAnswerDialog.category}
                  onChange={e =>
                    setShowAnswerDialog({
                      ...showAnswerDialog,
                      category: e.target.value,
                    })
                  }
                  placeholder="Exams"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flagged-tags">Tags (optional)</Label>
                <Input
                  id="flagged-tags"
                  value={showAnswerDialog.tags}
                  onChange={e =>
                    setShowAnswerDialog({
                      ...showAnswerDialog,
                      tags: e.target.value,
                    })
                  }
                  placeholder="ADIT, exam"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flagged-expires">Expires at (optional)</Label>
                <Input
                  id="flagged-expires"
                  type="date"
                  value={showAnswerDialog.expiresAt}
                  onChange={e =>
                    setShowAnswerDialog({
                      ...showAnswerDialog,
                      expiresAt: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnswerDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddFlaggedToKB}
              disabled={addToKBMutation.isPending || !showAnswerDialog?.answer}
            >
              {addToKBMutation.isPending
                ? "Adding..."
                : "Add to Knowledge Base"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
