"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { OnboardingData } from "@/app/onboarding/page";
import type { EvalTemplate, EvalTemplateCriteria } from "@/lib/supabase/types";

export function StepEvalSetup({
  data,
  updateData,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  updateData: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [templates, setTemplates] = useState<EvalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetch("/api/eval-templates")
      .then((r) => r.json())
      .then((tpls) => {
        setTemplates(Array.isArray(tpls) ? tpls : []);
        setLoading(false);

        // Auto-select best template for industry if no criteria yet
        if (data.criteria.length === 0 && Array.isArray(tpls)) {
          const match =
            tpls.find(
              (t: EvalTemplate) => t.industry === data.industry
            ) || tpls.find((t: EvalTemplate) => t.is_default);
          if (match) {
            setSelectedTemplateId(match.id);
            updateData({ criteria: match.criteria });
          }
        }
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTemplate(tpl: EvalTemplate) {
    setSelectedTemplateId(tpl.id);
    updateData({ criteria: tpl.criteria });
  }

  function addCriterion() {
    updateData({
      criteria: [
        ...data.criteria,
        { name: "", description: "", category: "general" },
      ],
    });
  }

  function updateCriterion(
    index: number,
    field: keyof EvalTemplateCriteria,
    value: string
  ) {
    const updated = [...data.criteria];
    updated[index] = { ...updated[index], [field]: value };
    updateData({ criteria: updated });
  }

  function removeCriterion(index: number) {
    updateData({ criteria: data.criteria.filter((_, i) => i !== index) });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      {templates.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Start from a template</p>
          <div className="flex flex-wrap gap-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => selectTemplate(tpl)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  selectedTemplateId === tpl.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {tpl.name}
                {tpl.industry && (
                  <Badge variant="secondary" className="ml-2 text-xs capitalize">
                    {tpl.industry}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Criteria Editor */}
      <div className="space-y-3">
        <p className="text-sm font-medium">
          Evaluation Criteria ({data.criteria.length})
        </p>
        {data.criteria.map((criterion, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <Input
                  placeholder="Criterion name"
                  value={criterion.name}
                  onChange={(e) => updateCriterion(i, "name", e.target.value)}
                  className="font-medium"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCriterion(i)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                placeholder="What should the AI check for?"
                value={criterion.description}
                onChange={(e) =>
                  updateCriterion(i, "description", e.target.value)
                }
                rows={2}
              />
              <Badge variant="secondary" className="text-xs capitalize">
                {criterion.category}
              </Badge>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={addCriterion} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Criterion
        </Button>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={data.criteria.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  );
}
