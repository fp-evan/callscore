"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Phone,
  Sparkles,
  Mic,
  FileText,
  ExternalLink,
  Zap,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Technician } from "@/lib/supabase/types";
import { toast } from "sonner";
import { PerformanceRadar } from "./performance-radar";
import { ScoresOverTime } from "./scores-over-time";

interface TranscriptItem {
  id: string;
  source: string;
  raw_transcript: string;
  service_type: string | null;
  eval_status: string;
  created_at: string;
  summary: string | null;
}

interface EvalResultItem {
  id: string;
  transcript_id: string;
  eval_criteria_id: string;
  passed: boolean | null;
  confidence: number | null;
  reasoning: string | null;
  created_at: string;
}

interface CriteriaItem {
  id: string;
  name: string;
  category: string | null;
  description: string;
}

interface Props {
  orgId: string;
  technician: Technician;
  orgIndustry: string;
  transcripts: TranscriptItem[];
  evalResults: EvalResultItem[];
  criteria: CriteriaItem[];
  mockTranscripts: TranscriptItem[];
}

const INDUSTRY_SCENARIOS: Record<string, string[]> = {
  hvac: [
    "AC repair upsell to maintenance plan",
    "Emergency heating call with price-sensitive customer",
    "New system installation consultation",
    "Ductwork inspection with mold discovery",
  ],
  plumbing: [
    "Drain cleaning with upsell to camera inspection",
    "Water heater replacement quote",
    "Emergency leak repair",
    "Bathroom renovation plumbing estimate",
  ],
  electrical: [
    "Panel upgrade consultation",
    "Lighting retrofit proposal",
    "Emergency outage call",
    "EV charger installation quote",
  ],
  general: [
    "Standard service call with upsell opportunity",
    "Follow-up on previous estimate",
    "New customer first visit",
    "Warranty service with upgrade discussion",
  ],
};

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof Mic; className: string }> = {
  recording: { label: "Recorded", icon: Mic, className: "bg-blue-50 text-blue-700 border-blue-200" },
  paste: { label: "Pasted", icon: FileText, className: "bg-gray-50 text-gray-700 border-gray-200" },
  mock: { label: "Mock", icon: Sparkles, className: "bg-purple-50 text-purple-700 border-purple-200" },
};

export function TechnicianProfile({
  orgId,
  technician,
  orgIndustry,
  transcripts,
  evalResults,
  criteria,
  mockTranscripts,
}: Props) {
  // Compute overall stats
  const overallStats = useMemo(() => {
    if (evalResults.length === 0) return { passRate: null, total: 0, passed: 0 };
    const passed = evalResults.filter((r) => r.passed === true).length;
    return {
      passRate: passed / evalResults.length,
      total: evalResults.length,
      passed,
    };
  }, [evalResults]);

  // Per-criteria pass rates for radar chart
  const criteriaStats = useMemo(() => {
    return criteria.map((c) => {
      const results = evalResults.filter((r) => r.eval_criteria_id === c.id);
      const passed = results.filter((r) => r.passed === true).length;
      return {
        name: c.name,
        category: c.category || "other",
        passRate: results.length > 0 ? (passed / results.length) * 100 : 0,
        total: results.length,
      };
    });
  }, [criteria, evalResults]);

  // Monthly scores for line chart
  const monthlyScores = useMemo(() => {
    const completedTranscripts = transcripts.filter((t) => t.eval_status === "completed");
    if (completedTranscripts.length === 0) return [];

    const monthMap = new Map<string, { passed: number; total: number }>();

    for (const t of completedTranscripts) {
      const date = new Date(t.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const results = evalResults.filter((r) => r.transcript_id === t.id);
      const passed = results.filter((r) => r.passed === true).length;

      const existing = monthMap.get(key) || { passed: 0, total: 0 };
      existing.passed += passed;
      existing.total += results.length;
      monthMap.set(key, existing);
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        label: new Date(month + "-01").toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        passRate: data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0,
      }));
  }, [transcripts, evalResults]);

  // Per-transcript stats for call history
  const transcriptStats = useMemo(() => {
    const map = new Map<string, { passed: number; total: number }>();
    for (const r of evalResults) {
      const existing = map.get(r.transcript_id) || { passed: 0, total: 0 };
      existing.total += 1;
      if (r.passed) existing.passed += 1;
      map.set(r.transcript_id, existing);
    }
    return map;
  }, [evalResults]);

  const initials = technician.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarColor =
    overallStats.passRate === null
      ? "bg-muted text-muted-foreground"
      : overallStats.passRate >= 0.8
        ? "bg-green-100 text-green-700"
        : overallStats.passRate >= 0.5
          ? "bg-amber-100 text-amber-700"
          : "bg-red-100 text-red-700";

  const passRateColor =
    overallStats.passRate === null
      ? "text-muted-foreground"
      : overallStats.passRate >= 0.8
        ? "text-green-600"
        : overallStats.passRate >= 0.5
          ? "text-amber-600"
          : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/org/${orgId}/technicians`}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          All Technicians
        </Link>
      </Button>

      {/* Hero Section */}
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <div
          className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold ${avatarColor}`}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold">{technician.name}</h1>
          {technician.role && (
            <p className="text-muted-foreground mt-0.5">{technician.role}</p>
          )}
          {technician.specialties && technician.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {technician.specialties.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Member since{" "}
              {new Date(technician.created_at).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {transcripts.length} calls
            </span>
          </div>
        </div>

        {/* Pass rate ring */}
        <div className="shrink-0 text-center">
          <div className="relative inline-flex items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/30"
              />
              {overallStats.passRate !== null && (
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${overallStats.passRate * 264} 264`}
                  strokeLinecap="round"
                  className={passRateColor}
                />
              )}
            </svg>
            <span className={`absolute text-lg font-bold ${passRateColor}`}>
              {overallStats.passRate !== null
                ? `${Math.round(overallStats.passRate * 100)}%`
                : "—"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Overall Pass Rate</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Call History</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance by Criteria</CardTitle>
              </CardHeader>
              <CardContent>
                {criteriaStats.length > 0 && evalResults.length > 0 ? (
                  <PerformanceRadar data={criteriaStats} />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                    No evaluation data yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scores Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scores Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyScores.length > 0 ? (
                  <ScoresOverTime data={monthlyScores} />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                    Not enough data for trend chart
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Criteria breakdown cards */}
          {criteriaStats.length > 0 && evalResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Criteria Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...criteriaStats]
                    .sort((a, b) => a.passRate - b.passRate)
                    .map((c) => (
                      <div
                        key={c.name}
                        className="flex items-center gap-3"
                      >
                        <span className="text-sm w-40 truncate">{c.name}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              c.passRate >= 80
                                ? "bg-green-500"
                                : c.passRate >= 50
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${c.passRate}%` }}
                          />
                        </div>
                        <span
                          className={`text-sm font-medium w-12 text-right ${
                            c.passRate >= 80
                              ? "text-green-600"
                              : c.passRate >= 50
                                ? "text-amber-600"
                                : "text-red-600"
                          }`}
                        >
                          {Math.round(c.passRate)}%
                        </span>
                        <span className="text-xs text-muted-foreground w-16">
                          ({c.total} evals)
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CALL HISTORY TAB */}
        <TabsContent value="history">
          <CallHistoryTab
            orgId={orgId}
            transcripts={transcripts}
            transcriptStats={transcriptStats}
          />
        </TabsContent>

        {/* TRAINING TAB */}
        <TabsContent value="training">
          <TrainingTab
            orgId={orgId}
            technician={technician}
            orgIndustry={orgIndustry}
            mockTranscripts={mockTranscripts}
            transcriptStats={transcriptStats}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CallHistoryTab({
  orgId,
  transcripts,
  transcriptStats,
}: {
  orgId: string;
  transcripts: TranscriptItem[];
  transcriptStats: Map<string, { passed: number; total: number }>;
}) {
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const [filterSource, setFilterSource] = useState<string>("all");

  const filtered = useMemo(() => {
    let items = [...transcripts];
    if (filterSource !== "all") {
      items = items.filter((t) => t.source === filterSource);
    }
    if (sortBy === "score") {
      items.sort((a, b) => {
        const aStats = transcriptStats.get(a.id);
        const bStats = transcriptStats.get(b.id);
        const aRate = aStats && aStats.total > 0 ? aStats.passed / aStats.total : -1;
        const bRate = bStats && bStats.total > 0 ? bStats.passed / bStats.total : -1;
        return bRate - aRate;
      });
    }
    return items;
  }, [transcripts, sortBy, filterSource, transcriptStats]);

  if (transcripts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Phone className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No calls recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
        <Select value={sortBy} onValueChange={(v) => { if (v === "date" || v === "score") setSortBy(v); }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Sort by Date</SelectItem>
            <SelectItem value="score">Sort by Score</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="recording">Recorded</SelectItem>
            <SelectItem value="paste">Pasted</SelectItem>
            <SelectItem value="mock">Mock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3 font-medium text-muted-foreground">Date</th>
                <th className="p-3 font-medium text-muted-foreground">Service Type</th>
                <th className="p-3 font-medium text-muted-foreground">Source</th>
                <th className="p-3 font-medium text-muted-foreground">Pass Rate</th>
                <th className="p-3 font-medium text-muted-foreground">Results</th>
                <th className="p-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const stats = transcriptStats.get(t.id);
                const rate = stats && stats.total > 0 ? stats.passed / stats.total : null;
                const sourceConfig = SOURCE_CONFIG[t.source] || SOURCE_CONFIG.paste;
                const SourceIcon = sourceConfig.icon;

                return (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-3 whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-3">{t.service_type || "—"}</td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={`text-xs ${sourceConfig.className}`}
                      >
                        <SourceIcon className="h-3 w-3 mr-1" />
                        {sourceConfig.label}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {rate !== null ? (
                        <span
                          className={`font-medium ${
                            rate >= 0.8
                              ? "text-green-600"
                              : rate >= 0.5
                                ? "text-amber-600"
                                : "text-red-600"
                          }`}
                        >
                          {Math.round(rate * 100)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {t.eval_status === "processing" ? "Evaluating..." : "—"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {stats
                        ? `${stats.passed}/${stats.total} passed`
                        : "—"}
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/org/${orgId}/transcripts/${t.id}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function TrainingTab({
  orgId,
  technician,
  orgIndustry,
  mockTranscripts,
  transcriptStats,
}: {
  orgId: string;
  technician: Technician;
  orgIndustry: string;
  mockTranscripts: TranscriptItem[];
  transcriptStats: Map<string, { passed: number; total: number }>;
}) {
  const router = useRouter();
  const [scenario, setScenario] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState("");

  const scenarios = INDUSTRY_SCENARIOS[orgIndustry] || INDUSTRY_SCENARIOS.general;

  async function handleGenerate() {
    if (!scenario.trim()) return;
    setGenerating(true);
    setGeneratingStatus("Generating realistic call scenario...");

    try {
      const res = await fetch("/api/mock-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId: technician.id,
          organizationId: technician.organization_id,
          scenario: scenario.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate mock call");
      }

      const data = await res.json();
      setGeneratingStatus("Analyzing call...");

      // Wait a moment then redirect to transcript detail
      await new Promise((r) => setTimeout(r, 1500));
      router.push(`/org/${orgId}/transcripts/${data.transcriptId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate mock call");
      setGenerating(false);
      setGeneratingStatus("");
    }
  }

  return (
    <div className="space-y-6">
      {/* Generate Practice Call */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center max-w-lg mx-auto space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-700">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-medium">Generate Practice Call</h3>
            <p className="text-sm text-muted-foreground">
              Create a realistic mock call scenario for {technician.name} to
              practice with. The AI will generate a natural conversation and
              evaluate it against your criteria.
            </p>

            <div className="space-y-3 text-left">
              <Select
                value=""
                onValueChange={(v) => setScenario(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a suggested scenario..." />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea
                placeholder={`Or describe a custom scenario... e.g. "${scenarios[0]}, hesitant customer"`}
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!scenario.trim() || generating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {generating ? (
                <>
                  <span className="animate-spin mr-2">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  {generatingStatus}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Practice Call
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mock call history */}
      {mockTranscripts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Practice Call History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTranscripts.map((t) => {
                const stats = transcriptStats.get(t.id);
                const rate =
                  stats && stats.total > 0 ? stats.passed / stats.total : null;

                return (
                  <Link
                    key={t.id}
                    href={`/org/${orgId}/transcripts/${t.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge
                        variant="outline"
                        className="bg-purple-50 text-purple-700 border-purple-200 shrink-0"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Mock
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {t.service_type || "Practice Call"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    {rate !== null ? (
                      <span
                        className={`text-sm font-medium ${
                          rate >= 0.8
                            ? "text-green-600"
                            : rate >= 0.5
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {Math.round(rate * 100)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t.eval_status === "processing" ? "Evaluating..." : "Pending"}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coaching notes placeholder */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <MessageSquare className="h-5 w-5 shrink-0" />
            <p className="text-sm">
              Coaching notes coming in a future update
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
