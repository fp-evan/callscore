"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Mic,
  FileText,
  Sparkles,
  Clock,
  User,
  Filter,
  Plus,
  ClipboardPaste,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Transcript } from "@/lib/supabase/types";

type TranscriptWithTechnician = Transcript & {
  technicians: { name: string } | null;
};

interface Props {
  orgId: string;
  transcripts: TranscriptWithTechnician[];
  technicians: Array<{ id: string; name: string }>;
}

const SOURCE_CONFIG = {
  recording: { label: "Recorded", icon: Mic, variant: "default" as const },
  paste: { label: "Pasted", icon: FileText, variant: "secondary" as const },
  mock: { label: "Mock", icon: Sparkles, variant: "outline" as const },
};

const STATUS_CONFIG = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  processing: { label: "Processing", className: "bg-amber-100 text-amber-700 border-amber-200" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700 border-green-200" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700 border-red-200" },
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function TranscriptList({ orgId, transcripts, technicians }: Props) {
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [techFilter, setTechFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return transcripts.filter((t) => {
      if (sourceFilter !== "all" && t.source !== sourceFilter) return false;
      if (statusFilter !== "all" && t.eval_status !== statusFilter) return false;
      if (techFilter !== "all" && t.technician_id !== techFilter) return false;
      return true;
    });
  }, [transcripts, sourceFilter, statusFilter, techFilter]);

  if (transcripts.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Transcripts</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-medium mb-2">No transcripts yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Record a call or paste a transcript to get started with AI-powered
              evaluation.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href={`/org/${orgId}/record`}>
                  <Mic className="mr-2 h-4 w-4" />
                  Record a Call
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/org/${orgId}/paste`}>
                  <ClipboardPaste className="mr-2 h-4 w-4" />
                  Paste Transcript
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transcripts</h1>
        <div className="flex gap-2">
          <Button size="sm" asChild>
            <Link href={`/org/${orgId}/record`}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Record
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/org/${orgId}/paste`}>
              <ClipboardPaste className="mr-1 h-3.5 w-3.5" />
              Paste
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="recording">Recorded</SelectItem>
            <SelectItem value="paste">Pasted</SelectItem>
            <SelectItem value="mock">Mock</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        {technicians.length > 0 && (
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Technician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All technicians</SelectItem>
              {technicians.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(sourceFilter !== "all" ||
          statusFilter !== "all" ||
          techFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setSourceFilter("all");
              setStatusFilter("all");
              setTechFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Transcript cards */}
      <div className="space-y-2">
        {filtered.map((t) => {
          const source = SOURCE_CONFIG[t.source as keyof typeof SOURCE_CONFIG] ||
            SOURCE_CONFIG.paste;
          const status =
            STATUS_CONFIG[t.eval_status as keyof typeof STATUS_CONFIG] ||
            STATUS_CONFIG.pending;
          const SourceIcon = source.icon;

          return (
            <Link
              key={t.id}
              href={`/org/${orgId}/transcripts/${t.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {t.technicians?.name || "Unassigned"}
                        </span>
                        {t.service_type && (
                          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                            &middot; {t.service_type}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.raw_transcript.slice(0, 100)}
                        {t.raw_transcript.length > 100 ? "..." : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={source.variant} className="text-xs gap-1">
                        <SourceIcon className="h-3 w-3" />
                        <span className="hidden sm:inline">{source.label}</span>
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${status.className}`}>
                        {status.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="h-3 w-3 inline mr-0.5" />
                        {formatRelativeDate(t.created_at)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && transcripts.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No transcripts match the current filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
