import { useEffect, useRef } from "react";

export interface MagSample {
  t: number;
  magnitude: number | null;
  x: number | null;
  y: number | null;
  z: number | null;
  heading: number | null;
}

interface Props {
  samples: MagSample[];
}

const SERIES = [
  { key: "magnitude", label: "B", color: "#5B7CFA" },
  { key: "x", label: "X", color: "#E57373" },
  { key: "y", label: "Y", color: "#57A96B" },
  { key: "z", label: "Z", color: "#E0A45C" },
] as const;

export default function MagChart({ samples }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const samplesRef = useRef(samples);
  samplesRef.current = samples;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const dims = { width: 0, height: 0, dpr };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      dims.width = rect.width;
      dims.height = rect.height;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
    };

    resize();
    window.addEventListener("resize", resize);

    let raf = 0;

    const draw = () => {
      const { width, height } = dims;
      if (width === 0 || height === 0) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const padding = { top: 16, bottom: 24, left: 42, right: 12 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      const data = samplesRef.current;

      // Dominio Y: magnitud y ejes disponibles
      let min = Infinity;
      let max = -Infinity;
      let hasData = false;
      for (const s of data) {
        for (const series of SERIES) {
          const v = s[series.key];
          if (v === null || v === undefined || isNaN(v)) continue;
          hasData = true;
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }

      if (!hasData || data.length === 0) {
        ctx.fillStyle = "#A9A9A9";
        ctx.font = "12px -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Sin datos de magnitud (modo brújula)", width / 2, height / 2);
        raf = requestAnimationFrame(draw);
        return;
      }

      if (max - min < 1e-6) {
        max += 0.5;
        min -= 0.5;
      }
      const range = max - min;

      // Grid y etiquetas Y
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.fillStyle = "#BFB5A8";
      ctx.font = "10px -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let i = 0; i <= 4; i++) {
        const value = max - (range * i) / 4;
        const y = padding.top + (chartH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(value >= 100 ? value.toFixed(0) : value.toFixed(2), padding.left - 6, y);
      }

      const toY = (v: number) => padding.top + chartH - ((v - min) / range) * chartH;
      const n = data.length;
      const step = chartW / (n - 1 || 1);

      // Series
      for (const series of SERIES) {
        ctx.strokeStyle = series.color;
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < n; i++) {
          const v = data[i][series.key];
          if (v === null || v === undefined || isNaN(v)) {
            started = false;
            continue;
          }
          const x = padding.left + i * step;
          const y = toY(v);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Último sample resaltado
      const last = data[n - 1];
      const lastMag = last.magnitude;
      if (lastMag !== null && lastMag !== undefined && !isNaN(lastMag)) {
        const x = padding.left + (n - 1) * step;
        const y = toY(lastMag);
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#5B7CFA";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "16px",
        overflow: "hidden",
        background: "rgba(255,255,255,0.6)",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
        position: "relative",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 12,
          display: "flex",
          gap: 12,
          fontSize: 10,
          color: "#8B8B8B",
        }}
      >
        {SERIES.map((s) => (
          <span key={s.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}