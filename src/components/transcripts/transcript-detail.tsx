"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mic,
  FileText,
  Sparkles,
  MapPin,
  Wrench,
  Calendar,
  User,
  Trash2,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AudioPlayer } from "./audio-player";
import type { Transcript } from "@/lib/supabase/types";

type DiarizedSegment = {
  speaker: number;
  text: string;
  start: number;
  end: number;
};

type TranscriptWithTechnician = Transcript & {
  technicians: { name: string; role: string | null } | null;
};

interface Props {
  orgId: string;
  transcript: TranscriptWithTechnician;
}

const SOURCE_CONFIG = {
  recording: { label: "Recorded", icon: Mic, className: "bg-blue-100 text-blue-700" },
  paste: { label: "Pasted", icon: FileText, className: "bg-gray-100 text-gray-700" },
  mock: { label: "Mock", icon: Sparkles, className: "bg-purple-100 text-purple-700" },
};

const STATUS_CONFIG = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  processing: { label: "Processing", className: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
};

const SPEAKER_COLORS = [
  "text-blue-700 bg-blue-50 border-blue-200",
  "text-emerald-700 bg-emerald-50 border-emerald-200",
  "text-purple-700 bg-purple-50 border-purple-200",
  "text-orange-700 bg-orange-50 border-orange-200",
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TranscriptDetail({ orgId, transcript }: Props) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const source =
    SOURCE_CONFIG[transcript.source as keyof typeof SOURCE_CONFIG] ||
    SOURCE_CONFIG.paste;
  const status =
    STATUS_CONFIG[transcript.eval_status as keyof typeof STATUS_CONFIG] ||
    STATUS_CONFIG.pending;
  const SourceIcon = source.icon;

  const diarized = Array.isArray(transcript.diarized_transcript)
    ? (transcript.diarized_transcript as unknown as DiarizedSegment[])
    : null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/transcripts/${transcript.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Transcript deleted");
      router.push(`/org/${orgId}/transcripts`);
    } catch {
      toast.error("Failed to delete transcript");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const headerContent = (
    <div className="space-y-3">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/org/${orgId}/transcripts`)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Transcript</DialogTitle>
                <DialogDescription>
                  This will permanently delete this transcript and all associated
                  evaluation results. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline" className={source.className}>
          <SourceIcon className="mr-1 h-3 w-3" />
          {source.label}
        </Badge>
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
        {transcript.technicians && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            {transcript.technicians.name}
          </span>
        )}
        <span className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(transcript.created_at)}
        </span>
        {transcript.service_type && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Wrench className="h-3.5 w-3.5" />
            {transcript.service_type}
          </span>
        )}
        {transcript.location && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {transcript.location}
          </span>
        )}
        {transcript.audio_duration_seconds && (
          <span className="text-muted-foreground">
            {formatDuration(transcript.audio_duration_seconds)}
          </span>
        )}
      </div>

      {/* Summary placeholder */}
      {transcript.summary ? (
        <Card>
          <CardContent className="py-3 text-sm">{transcript.summary}</CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Summary will appear after evaluation.
        </p>
      )}
    </div>
  );

  const transcriptPanel = (
    <div className="space-y-4">
      {/* Audio player for recorded transcripts */}
      {transcript.audio_url && (
        <AudioPlayer src={transcript.audio_url} />
      )}

      {/* Diarized transcript view */}
      {diarized && diarized.length > 0 ? (
        <div className="space-y-2">
          {diarized.map((segment, i) => {
            const colorClass =
              SPEAKER_COLORS[segment.speaker % SPEAKER_COLORS.length];
            return (
              <div
                key={i}
                className="flex gap-3"
                data-start={segment.start}
                data-end={segment.end}
              >
                <div
                  className={`shrink-0 w-20 text-xs font-medium rounded px-2 py-1 border ${colorClass} text-center`}
                >
                  Speaker {segment.speaker + 1}
                </div>
                <p className="text-sm leading-relaxed flex-1">{segment.text}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {transcript.raw_transcript}
        </div>
      )}
    </div>
  );

  const evalPanel = (
    <div className="space-y-4">
      {/* Circular progress placeholder */}
      <div className="flex flex-col items-center py-6">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-muted/30"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            —
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground text-sm">
            Evaluation results will appear here after analysis.
          </p>
          <Button className="mt-4" disabled variant="outline">
            <Play className="mr-2 h-4 w-4" />
            Run Evaluation
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4">
      {headerContent}

      {/* Desktop: split panel */}
      <div className="hidden md:grid md:grid-cols-5 md:gap-6">
        <div className="col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transcript</CardTitle>
            </CardHeader>
            <CardContent>{transcriptPanel}</CardContent>
          </Card>
        </div>
        <div className="col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Evaluation</CardTitle>
            </CardHeader>
            <CardContent>{evalPanel}</CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile: tabbed */}
      <div className="md:hidden">
        <Tabs defaultValue="transcript">
          <TabsList className="w-full">
            <TabsTrigger value="transcript" className="flex-1">
              Transcript
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="flex-1">
              Evaluation
            </TabsTrigger>
          </TabsList>
          <TabsContent value="transcript" className="mt-4">
            {transcriptPanel}
          </TabsContent>
          <TabsContent value="evaluation" className="mt-4">
            {evalPanel}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
