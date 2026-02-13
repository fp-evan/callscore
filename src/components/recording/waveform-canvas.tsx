"use client";

import { useRef, useEffect } from "react";

interface Props {
  analyser: AnalyserNode;
}

export function WaveformCanvas({ analyser }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barCount = 40;
      const barWidth = width / barCount - 2;
      const step = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] / 255;
        const barHeight = Math.max(2, value * height * 0.85);

        // Gradient from primary to red based on amplitude
        const r = Math.round(100 + value * 155);
        const g = Math.round(100 - value * 60);
        const b = Math.round(120 - value * 80);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.roundRect(
          i * (barWidth + 2),
          (height - barHeight) / 2,
          barWidth,
          barHeight,
          2
        );
        ctx.fill();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={64}
      className="w-full h-16 rounded-lg"
    />
  );
}
