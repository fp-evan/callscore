"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Props {
  src: string;
}

const SPEEDS = [0.5, 1, 1.5, 2];

export function AudioPlayer({ src }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const cycleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    audio.playbackRate = next;
    setSpeed(next);
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
      <audio ref={audioRef} src={src} preload="metadata" />

      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0"
        onClick={togglePlay}
      >
        {playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right shrink-0">
        {formatTime(currentTime)}
      </span>

      <Slider
        value={[currentTime]}
        max={duration || 100}
        step={0.1}
        onValueChange={handleSeek}
        className="flex-1"
      />

      <span className="text-xs text-muted-foreground tabular-nums w-10 shrink-0">
        {formatTime(duration)}
      </span>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs font-mono tabular-nums shrink-0"
        onClick={cycleSpeed}
      >
        {speed}x
      </Button>

      <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </div>
  );
}
