import { useEffect, useRef, useState } from "react";
import { useMagnetometer } from "../hooks/useMagnetometer";
import { useChronometer } from "../hooks/useChronometer";
import MagChart, { MagSample } from "../components/MagChart";

interface Props {
  onBack: () => void;
}

const MAX_SAMPLES = 3600;

const SOURCE_META: Record<string, { label: string; color: string }> = {
  sensor: { label: "SENSOR DIRECTO", color: "#2E7D4F" },
  compass: { label: "MODO BRÚJULA", color: "#B26A00" },
  unavailable: { label: "NO DISPONIBLE", color: "#C62828" },
};

function formatMs(ms: number): string {
  const totalCs = Math.max(0, Math.floor(ms / 10));
  const cs = totalCs % 100;
  const s = Math.floor(totalCs / 100) % 60;
  const m = Math.floor(totalCs / 6000) % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

function headingName(deg: number | null): string {
  if (deg === null) return "--";
  const d = (deg + 360) % 360;
  const names = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return names[Math.round(d / 45) % 8];
}

export default function Magnetronomo({ onBack }: Props) {
  const { reading, enabled, permissionError, requestPermission } = useMagnetometer();
  const chrono = useChronometer();
  const [samples, setSamples] = useState<MagSample[]>([]);

  const readingRef = useRef(reading);
  readingRef.current = reading;
  const elapsedRef = useRef(chrono.elapsedMs);
  elapsedRef.current = chrono.elapsedMs;

  // Sampleo a 5 Hz mientras el cronómetro corre
  useEffect(() => {
    if (chrono.status !== "running") return;
    const id = setInterval(() => {
      const r = readingRef.current;
      setSamples((prev) => {
        const next = [
          ...prev,
          {
            t: elapsedRef.current,
            magnitude: r.source === "sensor" ? r.magnitude : null,
            x: r.source === "sensor" ? r.x : null,
            y: r.source === "sensor" ? r.y : null,
            z: r.source === "sensor" ? r.z : null,
            heading: r.heading,
          },
        ];
        return next.length > MAX_SAMPLES ? next.slice(next.length - MAX_SAMPLES) : next;
      });
    }, 200);
    return () => clearInterval(id);
  }, [chrono.status]);

  const sensorUnavailable = reading.source === "unavailable";
  const sourceMeta = SOURCE_META[reading.source];

  const handleToggle = () => {
    if (chrono.status === "running") {
      chrono.pause();
      return;
    }
    if (chrono.status === "paused") {
      chrono.resume();
      return;
    }
    setSamples([]);
    chrono.start();
  };

  const handleReset = () => {
    chrono.reset();
    setSamples([]);
  };

  const handleExport = async () => {
    if (samples.length === 0) return;
    const json = JSON.stringify(
      {
        app: "SensoLab — Magnetrónomo",
        exportedAt: new Date().toISOString(),
        source: reading.source,
        durationMs: chrono.elapsedMs,
        sampleCount: samples.length,
        samples,
      },
      null,
      2
    );

    try {
      const { shareText } = await import("@choochmeque/tauri-plugin-sharekit-api");
      await shareText(json);
      return;
    } catch {
      // fallback a portapapeles
    }
    try {
      await navigator.clipboard.writeText(json);
      alert("JSON de la sesión copiado al portapapeles");
    } catch {
      alert("No se pudo exportar la sesión");
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(180deg, #F3F5FB 0%, #E9EEF8 100%)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "50px 20px 0",
          zIndex: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "rgba(0,0,0,0.05)",
            border: "1px solid #3D3D3D",
            borderRadius: "50%",
            width: "44px",
            height: "44px",
            fontSize: "24px",
            color: "#3D3D3D",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
            outline: "none",
          }}
        >
          ←
        </button>
        <span style={{ fontSize: "20px", fontWeight: 700, color: "#3D3D3D", letterSpacing: 0.5 }}>
          MAGNETRÓNOMO
        </span>
        <button
          onClick={handleExport}
          disabled={samples.length === 0}
          style={{
            background: "rgba(0,0,0,0.05)",
            border: "1px solid #3D3D3D",
            borderRadius: "50%",
            width: "44px",
            height: "44px",
            fontSize: "18px",
            color: "#3D3D3D",
            cursor: samples.length === 0 ? "not-allowed" : "pointer",
            opacity: samples.length === 0 ? 0.35 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
            outline: "none",
          }}
        >
          ⤴
        </button>
      </div>

      {/* Activación de sensores */}
      {!enabled ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: "20px",
            padding: "0 32px",
          }}
        >
          <div style={{ fontSize: "56px" }}>🧲</div>
          <p style={{ color: "#3D3D3D", fontSize: "15px", maxWidth: 280, margin: 0 }}>
            Para medir el campo magnético y cronometrar las muestras se requieren permisos de sensores.
          </p>
          {permissionError && (
            <div
              style={{
                color: "#C62828",
                fontSize: "13px",
                border: "1px dashed #C62828",
                padding: "10px",
                borderRadius: "8px",
              }}
            >
              {permissionError}
            </div>
          )}
          <button
            onClick={requestPermission}
            style={{
              background: "#5B7CFA",
              color: "#fff",
              border: "none",
              padding: "15px 32px",
              fontWeight: "bold",
              fontSize: "15px",
              borderRadius: "28px",
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(91,124,250,0.35)",
            }}
          >
            ACTIVAR SENSORES
          </button>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            padding: "16px 20px 24px",
            overflowY: "auto",
          }}
        >
          {/* Chip de fuente */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                background: sourceMeta.color,
                color: "#fff",
                fontSize: "11px",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: "999px",
                letterSpacing: 0.5,
              }}
            >
              {sourceMeta.label}
            </span>
            {reading.source === "compass" && (
              <span style={{ fontSize: "11px", color: "#8B8B8B" }}>
                Magnitud no disponible; se muestra dirección
              </span>
            )}
          </div>

          {/* Lectura en vivo */}
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "20px",
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(10px)",
              padding: "18px",
              textAlign: "center",
            }}
          >
            {sensorUnavailable ? (
              <>
                <div style={{ color: "#C62828", fontSize: "14px", fontWeight: 600 }}>
                  Sensor de magnetismo no disponible
                </div>
                <div style={{ color: "#8B8B8B", fontSize: "12px", marginTop: 6 }}>
                  Este equipo no expone magnetómetro ni orientación.
                </div>
              </>
            ) : reading.source === "sensor" ? (
              <>
                <div style={{ color: "#8B8B8B", fontSize: "12px", letterSpacing: 1 }}>
                  CAMPO MAGNÉTICO
                </div>
                <div style={{ fontSize: "56px", fontWeight: 800, color: "#3D3D3D", lineHeight: 1.1 }}>
                  {reading.magnitude !== null ? reading.magnitude.toFixed(1) : "---"}
                  <span style={{ fontSize: "20px", fontWeight: 600, marginLeft: 6 }}>
                    µT
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8,
                    marginTop: 14,
                  }}
                >
                  {(["x", "y", "z"] as const).map((axis) => (
                    <div
                      key={axis}
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        borderRadius: "12px",
                        padding: "10px 4px",
                      }}
                    >
                      <div style={{ color: "#8B8B8B", fontSize: "11px", textTransform: "uppercase" }}>
                        {axis}
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: "#3D3D3D" }}>
                        {reading[axis] !== null ? (reading[axis] as number).toFixed(1) : "--"}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ color: "#8B8B8B", fontSize: "12px", letterSpacing: 1 }}>RUMBO MAGNÉTICO</div>
                <div style={{ fontSize: "56px", fontWeight: 800, color: "#3D3D3D", lineHeight: 1.1 }}>
                  {reading.heading !== null ? `${Math.round(reading.heading)}°` : "---"}
                  <span style={{ fontSize: "24px", fontWeight: 600, marginLeft: 8 }}>
                    {headingName(reading.heading)}
                  </span>
                </div>
                <div style={{ color: "#8B8B8B", fontSize: "12px", marginTop: 6 }}>
                  Fallback brújula: dirección basada en el magnetómetro
                </div>
              </>
            )}
          </div>

          {/* Cronómetro */}
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "20px",
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(10px)",
              padding: "16px 18px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "38px",
                fontWeight: 700,
                color: chrono.status === "running" ? "#5B7CFA" : "#3D3D3D",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: 2,
              }}
            >
              {formatMs(chrono.elapsedMs)}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                marginTop: 12,
              }}
            >
              <button
                onClick={handleToggle}
                disabled={sensorUnavailable}
                style={{
                  background: chrono.status === "running" ? "#E57373" : "#5B7CFA",
                  color: "#fff",
                  border: "none",
                  borderRadius: "24px",
                  padding: "12px 28px",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: sensorUnavailable ? "not-allowed" : "pointer",
                  opacity: sensorUnavailable ? 0.4 : 1,
                }}
              >
                {chrono.status === "running" ? "PAUSA" : chrono.status === "paused" ? "REANUDAR" : "START"}
              </button>
              <button
                onClick={handleReset}
                disabled={sensorUnavailable || chrono.status === "idle"}
                style={{
                  background: "rgba(0,0,0,0.06)",
                  color: "#3D3D3D",
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: "24px",
                  padding: "12px 20px",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor:
                    sensorUnavailable || chrono.status === "idle" ? "not-allowed" : "pointer",
                  opacity: sensorUnavailable || chrono.status === "idle" ? 0.4 : 1,
                }}
              >
                RESET
              </button>
            </div>
          </div>

          {/* Gráfica */}
          <div
            style={{
              height: "180px",
              borderRadius: "20px",
            }}
          >
            <MagChart samples={samples} />
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={samples.length === 0}
            style={{
              background: samples.length === 0 ? "rgba(0,0,0,0.06)" : "#1A1A1A",
              color: samples.length === 0 ? "#A9A9A9" : "#fff",
              border: "none",
              borderRadius: "24px",
              padding: "14px",
              fontWeight: 700,
              fontSize: "14px",
              cursor: samples.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            EXPORTAR SESIÓN (JSON)
          </button>
        </div>
      )}
    </div>
  );
}