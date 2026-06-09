import { useRef, useEffect } from "react";

interface Props {
  data: number[];
  minDb: number;
  maxDb: number;
}

function dbColor(db: number): string {
  if (db < 50) return "#B8E6C8";
  if (db < 70) return "#FFDAB9";
  if (db < 85) return "#F5C6D0";
  return "#E57373";
}

export default function DbChart({ data, minDb, maxDb }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dimsRef = useRef({ width: 0, height: 0, dpr: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      dimsRef.current = { width: w, height: h, dpr };

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const { width, height, dpr } = dimsRef.current;
      if (width === 0 || height === 0) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Background
      ctx.fillStyle = "rgba(255, 248, 240, 0.8)";
      ctx.fillRect(0, 0, width, height);

      const padding = { top: 16, bottom: 24, left: 36, right: 12 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;
      const range = maxDb - minDb;

      // Grid lines
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 1;
      for (let db = Math.ceil(minDb / 10) * 10; db <= maxDb; db += 10) {
        const y = padding.top + chartH - ((db - minDb) / range) * chartH;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        // Y labels
        ctx.fillStyle = "#BFB5A8";
        ctx.font = "10px -apple-system, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(db.toString(), padding.left - 6, y);
      }

      // Draw data
      const samples = data;
      if (samples.length < 2) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const step = chartW / MAX_SAMPLES;

      // Gradient fill under the line
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      gradient.addColorStop(0, "rgba(184, 230, 200, 0.25)");
      gradient.addColorStop(0.5, "rgba(255, 218, 185, 0.15)");
      gradient.addColorStop(1, "rgba(184, 230, 200, 0.02)");

      ctx.beginPath();
      ctx.moveTo(
        padding.left + (samples.length - 1) * step,
        padding.top + chartH
      );

      for (let i = samples.length - 1; i >= 0; i--) {
        const x = padding.left + (samples.length - 1 - i) * step;
        const y = padding.top + chartH - ((samples[i] - minDb) / range) * chartH;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(padding.left, padding.top + chartH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Main line
      ctx.beginPath();
      for (let i = 0; i < samples.length; i++) {
        const x = padding.left + i * step;
        const y = padding.top + chartH - ((samples[i] - minDb) / range) * chartH;

        // Color based on current sample for the latest point, green for rest
        if (i === samples.length - 1) {
          ctx.strokeStyle = dbColor(samples[i]);
        } else {
          ctx.strokeStyle = "rgba(184, 212, 227, 0.5)";
        }

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();

      // Thicker highlight for latest segment
      if (samples.length >= 2) {
        const last = samples.length - 1;
        const x1 = padding.left + (last - 1) * step;
        const y1 = padding.top + chartH - ((samples[last - 1] - minDb) / range) * chartH;
        const x2 = padding.left + last * step;
        const y2 = padding.top + chartH - ((samples[last] - minDb) / range) * chartH;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = dbColor(samples[last]);
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [data, minDb, maxDb]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "16px",
        overflow: "hidden",
        background: "rgba(255,255,255,0.5)",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}

const MAX_SAMPLES = 600;
