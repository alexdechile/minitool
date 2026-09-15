import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  onBack: () => void;
}

type PhotoMode = "portrait" | "landscape" | "sports" | "auto";

interface Exposure {
  aperture: string;
  shutter: string;
  iso: number;
  warning?: string;
}

const SHUTTER_SPEEDS = [
  "1/4000", "1/2000", "1/1000", "1/500", "1/250", "1/125", "1/60", "1/30", "1/15", "1/8", "1/4", "1/2", "1", "2"
];
const SHUTTER_VALUES = [
  4000, 2000, 1000, 500, 250, 125, 60, 30, 15, 8, 4, 2, 1, 0.5
];

export default function PhotoAssistant({ onBack }: Props) {
  const [lux, setLux] = useState(0);
  const [mode, setMode] = useState<PhotoMode>("auto");
  const [sensorType, setSensorType] = useState<"native" | "camera" | "none">("none");
  const [error, setError] = useState<string | null>(null);
  const [exposure, setExposure] = useState<Exposure>({ aperture: "f/4.0", shutter: "1/125", iso: 100 });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  // --- Lógica de Cálculo de Exposición ---
  const calculateExposure = useCallback((currentLux: number, currentMode: PhotoMode): Exposure => {
    // 1. Lux a EV100
    // EV = log2(Lux / 2.5)
    const ev = currentLux > 0 ? Math.log2(currentLux / 2.5) : 0;
    
    let aperture = 4.0;
    let iso = 100;
    let shutterVal = 125;

    // 2. Ajustar según modo (Intención Artística)
    if (currentMode === "portrait") {
      aperture = 3.5; // Lo más abierto posible en kit lens
      // Buscamos ISO bajo y velocidad suficiente
      // 2^EV = N^2 / t * 100 / ISO  => t = N^2 / (2^EV * ISO / 100)
      shutterVal = Math.pow(aperture, 2) / (Math.pow(2, ev) * (iso / 100));
    } else if (currentMode === "sports") {
      shutterVal = 500; // Velocidad rápida objetivo
      // 2^EV = N^2 / t * 100 / ISO => ISO = (N^2 / t) / 2^EV * 100
      aperture = 4.0;
      iso = (Math.pow(aperture, 2) / (1/shutterVal)) / Math.pow(2, ev) * 100;
    } else if (currentMode === "landscape") {
      aperture = 8.0; // Punto dulce de nitidez
      iso = 100; // Calidad máxima
      shutterVal = Math.pow(aperture, 2) / (Math.pow(2, ev) * (iso / 100));
    } else {
      // Auto / Balanced
      aperture = 5.6;
      shutterVal = Math.pow(aperture, 2) / (Math.pow(2, ev) * (iso / 100));
    }

    // 3. Normalizar ISO (Límites Canon M50)
    if (iso < 100) iso = 100;
    if (iso > 6400) iso = 6400; // Límite ruido razonable
    iso = Math.round(iso / 100) * 100;

    // 4. Recalcular shutter final con ISO normalizado
    shutterVal = Math.pow(aperture, 2) / (Math.pow(2, ev) * (iso / 100));

    // 5. Mapear a valores comerciales de obturador
    let finalShutterStr = "1/125";
    let warning = undefined;

    if (shutterVal > 4000) {
        finalShutterStr = "1/4000";
        warning = "Mucha luz: cerrar diafragma";
    } else if (shutterVal < 0.5) {
        finalShutterStr = "2\"";
        warning = "Poca luz: usar trípode";
    } else {
        // Buscar el más cercano en nuestra lista
        let closest = 0;
        let minDiff = Infinity;
        for(let i=0; i<SHUTTER_VALUES.length; i++) {
            const diff = Math.abs(1/shutterVal - 1/SHUTTER_VALUES[i]);
            if (diff < minDiff) {
                minDiff = diff;
                closest = i;
            }
        }
        finalShutterStr = SHUTTER_SPEEDS[closest];
        if (SHUTTER_VALUES[closest] < 50) warning = "Riesgo de trepidación (pulso)";
    }

    return {
      aperture: `f/${aperture.toFixed(1)}`,
      shutter: finalShutterStr,
      iso: iso,
      warning: warning
    };
  }, []);

  useEffect(() => {
    setExposure(calculateExposure(lux, mode));
  }, [lux, mode, calculateExposure]);

  // --- Lógica de Sensores (Copiada de LuxMeter para consistencia) ---
  const startCamera = async () => {
    setSensorType("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, audio: false
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onplaying = () => processCameraFrame();
        await video.play().catch((err) => {
          console.warn("No se pudo iniciar el video:", err);
        });
        if (video.readyState >= 2) processCameraFrame();
      }
    } catch (err) { setError("No hay sensor de luz disponible."); }
  };

  useEffect(() => {
    let sensor: any = null;
    if ("AmbientLightSensor" in window) {
      try {
        // @ts-ignore
        sensor = new AmbientLightSensor();
        sensor.addEventListener("reading", () => {
          setLux(sensor.illuminance);
          setSensorType("native");
        });
        sensor.addEventListener("error", () => startCamera());
        sensor.start();
      } catch (err) { startCamera(); }
    } else { startCamera(); }

    return () => {
      if (sensor) sensor.stop();
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    if (videoRef.current) {
      videoRef.current.onplaying = null;
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const processCameraFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    cancelAnimationFrame(rafRef.current);
    const analyze = () => {
      if (!streamRef.current?.active) return;
      if (video.readyState < 2 || video.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(analyze);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let lum = 0;
      for (let i = 0; i < data.length; i += 4) lum += (0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
      const avg = lum / (data.length / 4);
      setLux(Math.pow(avg / 255, 2) * 1000); // Estimación referencial
      if (streamRef.current?.active) rafRef.current = requestAnimationFrame(analyze);
    };
    rafRef.current = requestAnimationFrame(analyze);
  };

  return (
    <div style={{
      width: "100%", height: "100%", background: "#000", color: "#FFF",
      fontFamily: "Arial, sans-serif", display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden"
    }}>
      {/* Header Estilo Canon */}
      <div style={{
        padding: "50px 16px 16px 16px", display: "flex", justifyContent: "space-between",
        alignItems: "center", background: "#1a1a1a", borderBottom: "2px solid #333",
        zIndex: 100,
      }}>
        <button onClick={onBack} style={{
          background: "#333", border: "1px solid #f40", color: "#f40",
          padding: "8px 16px", borderRadius: "4px", fontSize: "14px",
          fontWeight: "bold", cursor: "pointer", zIndex: 101,
        }}>EXIT</button>
        <div style={{ fontSize: "14px", fontWeight: "bold", color: "#f40" }}>EOS M50 II</div>
        <div style={{ fontSize: "12px", opacity: 0.6 }}>{sensorType.toUpperCase()}</div>
      </div>

      {/* Main Display (Visor) */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "20px"
      }}>
        <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px",
            width: "100%", maxWidth: "300px", marginBottom: "40px"
        }}>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "#888" }}>SHUTTER</div>
                <div style={{ fontSize: "36px", fontWeight: "bold" }}>{exposure.shutter}</div>
            </div>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "#888" }}>APERTURE</div>
                <div style={{ fontSize: "36px", fontWeight: "bold" }}>{exposure.aperture}</div>
            </div>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "#888" }}>ISO</div>
                <div style={{ fontSize: "36px", fontWeight: "bold" }}>{exposure.iso}</div>
            </div>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "#888" }}>EV (Luz)</div>
                <div style={{ fontSize: "36px", fontWeight: "bold", color: "#0f0" }}>
                    {lux > 0 ? Math.log2(lux / 2.5).toFixed(1) : "--"}
                </div>
            </div>
        </div>

        {exposure.warning && (
            <div style={{
                background: "#f40", color: "#000", padding: "8px 16px",
                borderRadius: "4px", fontWeight: "bold", fontSize: "13px",
                marginBottom: "20px", textAlign: "center"
            }}>
                ⚠ {exposure.warning.toUpperCase()}
            </div>
        )}

        {error && (
            <div style={{
                color: "#f40", fontSize: "12px", textAlign: "center",
                marginTop: "10px"
            }}>
                {error}
            </div>
        )}
      </div>

      {/* Selectores de Modo (Footer) */}
      <div style={{
          background: "#111", padding: "20px", display: "flex",
          justifyContent: "space-around", borderTop: "1px solid #333"
      }}>
        <ModeBtn active={mode === "auto"} onClick={() => setMode("auto")} label="P" sub="AUTO" />
        <ModeBtn active={mode === "portrait"} onClick={() => setMode("portrait")} label="👤" sub="PORT" />
        <ModeBtn active={mode === "landscape"} onClick={() => setMode("landscape")} label="🏔️" sub="LAND" />
        <ModeBtn active={mode === "sports"} onClick={() => setMode("sports")} label="🏃" sub="SPRT" />
      </div>

      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          position: "absolute",
          width: "2px",
          height: "2px",
          opacity: 0.01,
          pointerEvents: "none",
          left: "-10px",
          top: "-10px",
        }}
      />
      <canvas ref={canvasRef} width="64" height="64" style={{ display: "none" }} />
    </div>
  );
}

const ModeBtn = ({ active, onClick, label, sub }: { active: boolean, onClick: () => void, label: string, sub: string }) => (
    <button onClick={onClick} style={{
        background: active ? "#f40" : "#222",
        border: "none", borderRadius: "8px", width: "60px", height: "60px",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", color: active ? "#000" : "#FFF",
        cursor: "pointer", transition: "all 0.2s"
    }}>
        <div style={{ fontSize: "20px" }}>{label}</div>
        <div style={{ fontSize: "9px", fontWeight: "bold", marginTop: "2px" }}>{sub}</div>
    </button>
);
