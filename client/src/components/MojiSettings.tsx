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
import { toast } from "sonner";
import {
  Upload,
  Save,
  Search,
  Edit,
  Trash2,
  Plus,
  Download,
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
  const [newEntry, setNewEntry] = useState({
    question: "",
    answer: "",
    category: "",
    tags: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: knowledgeBase, refetch } = trpc.mojiKnowledge.getAll.useQuery();
  const createMutation = trpc.mojiKnowledge.create.useMutation();
  const updateMutation = trpc.mojiKnowledge.update.useMutation();
  const deleteMutation = trpc.mojiKnowledge.delete.useMutation();
  const bulkUploadMutation = trpc.mojiKnowledge.bulkUpload.useMutation();

  const handleDownloadTemplate = () => {
    const csvContent = `"question","answer","category","tags"
"What is ADIT?","ADIT stands for Advanced Diploma in International Taxation, offered by the Chartered Institute of Taxation (CIOT). It is the leading international tax qualification.","Exams","ADIT,qualification,CIOT"
"What services does MojiTax offer?","MojiTax provides ADIT exam preparation courses, study materials, and a community platform for tax professionals. Visit mojitax.co.uk for details.","Services","MojiTax,courses,services"
"How do I contact support?","You can chat with @moji for quick help, or use the 'Chat with Team MojiTax' feature to create a support ticket for human assistance.","Platform Help","support,help,contact"`;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "moji_knowledge_base_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredKnowledge = knowledgeBase?.filter(
    entry =>
      entry.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.tags &&
        entry.tags.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
          const [question, answer, category, tags] = line
            .split(",")
            .map(s => s.trim().replace(/^"|"$/g, ""));
          return { question, answer, category, tags };
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
  };

  const handleAddEntry = async () => {
    if (!newEntry.question || !newEntry.answer) {
      toast.error("Question and answer are required");
      return;
    }

    try {
      await createMutation.mutateAsync(newEntry);
      toast.success("Knowledge base entry added");
      setShowAddDialog(false);
      setNewEntry({ question: "", answer: "", category: "", tags: "" });
      refetch();
    } catch (error) {
      toast.error("Failed to add entry");
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;

    try {
      await updateMutation.mutateAsync(editingEntry);
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
              <strong>CSV format:</strong> question, answer, category, tags (one
              entry per line, quoted strings)
            </p>
            <p>
              <strong>Categories:</strong> Services, Platform Help, Exams, VAT,
              Transfer Pricing, International Tax
            </p>
            <p>
              Add service info, subscription details, and boundary rules here.
              @moji uses this knowledge base to answer member questions.
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
                  <TableHead className="w-[30%]">Question</TableHead>
                  <TableHead className="w-[40%]">Answer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKnowledge && filteredKnowledge.length > 0 ? (
                  filteredKnowledge.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.question}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.answer.substring(0, 100)}...
                      </TableCell>
                      <TableCell>{entry.category || "-"}</TableCell>
                      <TableCell>{entry.tags || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingEntry(entry)}
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
    </div>
  );
}
