"use client";

import { useState, useCallback, useRef } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { EvalCriteria, FewShotExample } from "@/lib/supabase/types";

const CATEGORIES = [
  { value: "greeting", label: "Greeting" },
  { value: "diagnosis", label: "Diagnosis" },
  { value: "sales_technique", label: "Sales Technique" },
  { value: "compliance", label: "Compliance" },
  { value: "closing", label: "Closing" },
  { value: "follow_up", label: "Follow Up" },
];

type CriterionWithExamples = EvalCriteria & {
  few_shot_examples: FewShotExample[];
};

interface Props {
  orgId: string;
  initialCriteria: CriterionWithExamples[];
}

export function CriteriaManager({ orgId, initialCriteria }: Props) {
  const [criteria, setCriteria] = useState<CriterionWithExamples[]>(initialCriteria);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const saveCriterion = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      setSaving((prev) => ({ ...prev, [id]: true }));
      try {
        const response = await fetch(`/api/eval-criteria/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error("Failed to save");
      } catch {
        toast.error("Failed to save changes");
      } finally {
        setSaving((prev) => ({ ...prev, [id]: false }));
      }
    },
    []
  );

  const debouncedSave = useCallback(
    (id: string, updates: Record<string, unknown>) => {
      const key = `${id}-${Object.keys(updates).join(",")}`;
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }
      debounceTimers.current[key] = setTimeout(() => {
        saveCriterion(id, updates);
        delete debounceTimers.current[key];
      }, 500);
    },
    [saveCriterion]
  );

  const updateLocalCriterion = (id: string, updates: Partial<CriterionWithExamples>) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleFieldChange = (
    id: string,
    field: string,
    value: string | boolean | number
  ) => {
    updateLocalCriterion(id, { [field]: value } as Partial<CriterionWithExamples>);
    // Instant save for toggles/selects, debounced for text
    if (typeof value === "boolean" || field === "status" || field === "category") {
      saveCriterion(id, { [field]: value });
    } else {
      debouncedSave(id, { [field]: value });
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const oldIndex = criteria.findIndex((c) => c.id === draggedId);
    const newIndex = criteria.findIndex((c) => c.id === targetId);

    const reordered = [...criteria];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    setCriteria(reordered);
    setDraggedId(null);
    setDragOverId(null);

    // Persist reorder
    try {
      const response = await fetch("/api/eval-criteria/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
      });
      if (!response.ok) throw new Error("Failed to reorder");
    } catch {
      toast.error("Failed to save new order");
      setCriteria(initialCriteria);
    }
  };

  const handleDelete = async (id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
    try {
      const response = await fetch(`/api/eval-criteria/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Criterion deleted");
    } catch {
      toast.error("Failed to delete criterion");
      setCriteria(initialCriteria);
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Eval Criteria</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define what your calls are evaluated against. Drag to reorder.
          </p>
        </div>
        <AddCriterionDialog
          orgId={orgId}
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          sortOrder={criteria.length}
          onCreated={(newCriterion) => {
            setCriteria((prev) => [...prev, { ...newCriterion, few_shot_examples: [] }]);
            setAddDialogOpen(false);
          }}
        />
      </div>

      {criteria.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-medium mb-2">No eval criteria yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Add criteria to define how your calls will be evaluated by AI.
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Criterion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {criteria.map((criterion) => (
            <CriterionCard
              key={criterion.id}
              criterion={criterion}
              isExpanded={expandedId === criterion.id}
              isDragging={draggedId === criterion.id}
              isDragOver={dragOverId === criterion.id}
              isSaving={saving[criterion.id] || false}
              onToggleExpand={() => handleToggleExpand(criterion.id)}
              onFieldChange={(field, value) =>
                handleFieldChange(criterion.id, field, value)
              }
              onDelete={() => handleDelete(criterion.id)}
              onDragStart={() => handleDragStart(criterion.id)}
              onDragOver={(e) => handleDragOver(e, criterion.id)}
              onDrop={() => handleDrop(criterion.id)}
              onDragEnd={() => {
                setDraggedId(null);
                setDragOverId(null);
              }}
              onExamplesChange={(examples) =>
                updateLocalCriterion(criterion.id, {
                  few_shot_examples: examples,
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Criterion Card
// ============================================================

function CriterionCard({
  criterion,
  isExpanded,
  isDragging,
  isDragOver,
  isSaving,
  onToggleExpand,
  onFieldChange,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onExamplesChange,
}: {
  criterion: CriterionWithExamples;
  isExpanded: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isSaving: boolean;
  onToggleExpand: () => void;
  onFieldChange: (field: string, value: string | boolean | number) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onExamplesChange: (examples: FewShotExample[]) => void;
}) {
  const categoryLabel = CATEGORIES.find((c) => c.value === criterion.category)?.label;

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`transition-all ${isDragging ? "opacity-50" : ""} ${
        isDragOver ? "border-primary border-2" : ""
      }`}
    >
      <CardContent className="p-0">
        {/* Header row */}
        <div className="flex items-center gap-3 p-4">
          <div
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5" />
          </div>

          <button
            onClick={onToggleExpand}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="font-medium truncate">{criterion.name}</span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {categoryLabel && (
              <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                {categoryLabel}
              </Badge>
            )}
            <Badge
              variant={criterion.status === "published" ? "default" : "outline"}
              className="text-xs"
            >
              {criterion.status === "published" ? "Published" : "Draft"}
            </Badge>
            {criterion.few_shot_examples.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1 hidden sm:inline-flex">
                <BookOpen className="h-3 w-3" />
                {criterion.few_shot_examples.length}
              </Badge>
            )}
            {isSaving && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
            <Switch
              checked={criterion.is_active}
              onCheckedChange={(checked) => onFieldChange("is_active", checked)}
              aria-label="Toggle active"
            />
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t px-4 pb-4 pt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`name-${criterion.id}`}>Name</Label>
                <Input
                  id={`name-${criterion.id}`}
                  value={criterion.name}
                  onChange={(e) => onFieldChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`category-${criterion.id}`}>Category</Label>
                <Select
                  value={criterion.category || ""}
                  onValueChange={(val) => onFieldChange("category", val)}
                >
                  <SelectTrigger id={`category-${criterion.id}`}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`desc-${criterion.id}`}>
                Description — what should the AI check for?
              </Label>
              <Textarea
                id={`desc-${criterion.id}`}
                value={criterion.description}
                onChange={(e) => onFieldChange("description", e.target.value)}
                rows={3}
                className="resize-y"
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Label htmlFor={`status-${criterion.id}`} className="text-sm">
                  Status
                </Label>
                <Select
                  value={criterion.status}
                  onValueChange={(val) => onFieldChange("status", val)}
                >
                  <SelectTrigger id={`status-${criterion.id}`} className="w-[130px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Few-shot examples */}
            <FewShotExamplesSection
              criterionId={criterion.id}
              examples={criterion.few_shot_examples}
              onExamplesChange={onExamplesChange}
            />

            <div className="flex justify-end pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete criterion?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &ldquo;{criterion.name}&rdquo; and
                      all associated few-shot examples. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Few-Shot Examples Section
// ============================================================

function FewShotExamplesSection({
  criterionId,
  examples,
  onExamplesChange,
}: {
  criterionId: string;
  examples: FewShotExample[];
  onExamplesChange: (examples: FewShotExample[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newExample, setNewExample] = useState({
    example_type: "pass" as "pass" | "fail",
    transcript_snippet: "",
    explanation: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!newExample.transcript_snippet.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/eval-criteria/${criterionId}/examples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExample),
      });
      if (!response.ok) throw new Error("Failed to add example");
      const created = await response.json();
      onExamplesChange([...examples, created]);
      setNewExample({ example_type: "pass", transcript_snippet: "", explanation: "" });
      setAdding(false);
      toast.success("Example added");
    } catch {
      toast.error("Failed to add example");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (exampleId: string) => {
    const previousExamples = examples;
    onExamplesChange(examples.filter((e) => e.id !== exampleId));
    try {
      const response = await fetch(
        `/api/eval-criteria/${criterionId}/examples/${exampleId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete");
    } catch {
      toast.error("Failed to delete example");
      onExamplesChange(previousExamples);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Few-Shot Examples</Label>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Example
          </Button>
        )}
      </div>

      {examples.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">
          Add examples to improve AI accuracy. Examples show the AI what passing and
          failing looks like for this criterion.
        </p>
      )}

      {examples.map((example) => (
        <div
          key={example.id}
          className="rounded-md border p-3 space-y-2 text-sm"
        >
          <div className="flex items-center justify-between">
            <Badge
              variant={example.example_type === "pass" ? "default" : "destructive"}
              className="text-xs gap-1"
            >
              {example.example_type === "pass" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {example.example_type === "pass" ? "Pass" : "Fail"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(example.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-muted-foreground italic text-xs leading-relaxed">
            &ldquo;{example.transcript_snippet}&rdquo;
          </p>
          {example.explanation && (
            <p className="text-xs text-muted-foreground">
              {example.explanation}
            </p>
          )}
        </div>
      ))}

      {adding && (
        <div className="rounded-md border p-3 space-y-3">
          <div className="flex gap-2">
            <Button
              variant={newExample.example_type === "pass" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setNewExample((prev) => ({ ...prev, example_type: "pass" }))
              }
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Pass
            </Button>
            <Button
              variant={newExample.example_type === "fail" ? "destructive" : "outline"}
              size="sm"
              onClick={() =>
                setNewExample((prev) => ({ ...prev, example_type: "fail" }))
              }
            >
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Fail
            </Button>
          </div>
          <Textarea
            placeholder="Paste a transcript snippet..."
            value={newExample.transcript_snippet}
            onChange={(e) =>
              setNewExample((prev) => ({
                ...prev,
                transcript_snippet: e.target.value,
              }))
            }
            rows={3}
            className="text-sm"
          />
          <Textarea
            placeholder="Explanation (optional) — why is this a pass/fail?"
            value={newExample.explanation}
            onChange={(e) =>
              setNewExample((prev) => ({ ...prev, explanation: e.target.value }))
            }
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setNewExample({
                  example_type: "pass",
                  transcript_snippet: "",
                  explanation: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newExample.transcript_snippet.trim() || submitting}
            >
              {submitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Add Criterion Dialog
// ============================================================

function AddCriterionDialog({
  orgId,
  open,
  onOpenChange,
  sortOrder,
  onCreated,
}: {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sortOrder: number;
  onCreated: (criterion: EvalCriteria) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/eval-criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: orgId,
          name: name.trim(),
          description: description.trim(),
          category: category || null,
          sort_order: sortOrder,
          status,
        }),
      });
      if (!response.ok) throw new Error("Failed to create");
      const created = await response.json();
      onCreated(created);
      toast.success("Criterion created");
      // Reset form
      setName("");
      setDescription("");
      setCategory("");
      setStatus("draft");
    } catch {
      toast.error("Failed to create criterion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Criterion
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Eval Criterion</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-name">Name</Label>
            <Input
              id="new-name"
              placeholder="e.g., Proper Introduction"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-description">
              Description — what should the AI check for?
            </Label>
            <Textarea
              id="new-description"
              placeholder="e.g., Did the technician introduce themselves by name and company?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="new-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "published")}>
                <SelectTrigger id="new-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !description.trim() || submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
