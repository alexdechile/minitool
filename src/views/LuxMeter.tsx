import { useState, useEffect, useRef } from "react";

interface Props {
  onBack: () => void;
}

export default function LuxMeter({ onBack }: Props) {
  const [lux, setLux] = useState(0);
  const [sensorType, setSensorType] = useState<"native" | "camera" | "none">("none");
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  // Intentar Sensor Nativo
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
        sensor.addEventListener("error", (event: any) => {
          console.warn("AmbientLightSensor error:", event.error.name);
          startCameraFallback();
        });
        sensor.start();
      } catch (err) {
        console.warn("AmbientLightSensor init failed:", err);
        startCameraFallback();
      }
    } else {
      startCameraFallback();
    }

    return () => {
      try {
        if (sensor) sensor.stop();
      } catch {
        // el sensor pudo no haberse iniciado
      }
      stopCamera();
    };
  }, []);

  const startCameraFallback = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este dispositivo/WebView no soporta cámara ni sensor de luz.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setSensorType("camera");

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        // Analizar recién cuando el video tenga frames reales.
        video.onplaying = () => processCameraFrame();
        await video.play().catch((err) => {
          console.warn("No se pudo iniciar el video:", err);
        });
        // Respaldo por si onplaying ya ocurrió antes de asignarlo.
        if (video.readyState >= 2) processCameraFrame();
      }
    } catch (err) {
      console.error("Camera fallback failed:", err);
      setError("No se pudo acceder a ningún sensor de luz.");
    }
  };

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    if (videoRef.current) {
      videoRef.current.onplaying = null;
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
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

      // Si todavía no hay frame decodificado, reintentamos.
      if (video.readyState < 2 || video.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(analyze);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let totalLuminance = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Luminosidad percibida (fórmula estándar)
        totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
      }

      const avgLuminance = totalLuminance / (data.length / 4);

      // Mapeo experimental de Brillo (0-255) a Lux (0-~1000).
      // Es una estimación referencial, no una medición lux real.
      const estimatedLux = Math.pow(avgLuminance / 255, 2) * 1000;
      setLux(Math.round(estimatedLux));

      if (streamRef.current?.active) {
        rafRef.current = requestAnimationFrame(analyze);
      }
    };

    rafRef.current = requestAnimationFrame(analyze);
  };

  const getLightInfo = (l: number) => {
    if (l < 1) return { label: "Oscuridad Total", color: "#000", textColor: "#666" };
    if (l < 10) return { label: "Crepúsculo / Muy Tenue", color: "#1a1a1a", textColor: "#888" };
    if (l < 50) return { label: "Interior Tenue", color: "#333", textColor: "#AAA" };
    if (l < 150) return { label: "Iluminación Normal", color: "#666", textColor: "#EEE" };
    if (l < 400) return { label: "Oficina / Estudio", color: "#AAA", textColor: "#000" };
    if (l < 1000) return { label: "Día Nublado", color: "#DDD", textColor: "#000" };
    return { label: "Luz Solar Directa", color: "#FFF", textColor: "#000" };
  };

  const info = getLightInfo(lux);

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: info.color,
      color: info.textColor,
      display: "flex",
      flexDirection: "column",
      transition: "background 0.5s ease, color 0.5s ease",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "50px 20px 20px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 100,
      }}>
        <button onClick={onBack} style={{
          background: "rgba(128,128,128,0.2)",
          border: `2px solid ${info.textColor}`,
          color: info.textColor,
          padding: "8px 20px",
          borderRadius: "20px",
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 101,
        }}>
          CERRAR
        </button>
        <span style={{ fontSize: "12px", opacity: 0.6, fontWeight: "bold" }}>
          {sensorType === "native" ? "SENSOR NATIVO" : "MODO CÁMARA (EST.)"}
        </span>
      </div>

      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "20px",
      }}>
        {error ? (
          <div style={{ color: "#FF3B30" }}>{error}</div>
        ) : (
          <>
            <div style={{
              fontSize: "120px",
              fontWeight: 800,
              letterSpacing: "-5px",
              lineHeight: 1,
            }}>
              {lux}
            </div>
            <div style={{ fontSize: "24px", fontWeight: 500, marginBottom: "20px" }}>LUX</div>
            <div style={{
              background: "rgba(128,128,128,0.2)",
              padding: "10px 20px",
              borderRadius: "30px",
              fontSize: "16px",
              fontWeight: 600,
            }}>
              {info.label}
            </div>
          </>
        )}
      </div>

      {/* Elementos Ocultos para Fallback */}
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

      {/* Decoración sutil: Brillo */}
      <div style={{
        position: "absolute",
        bottom: "-50px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "300px",
        height: "300px",
        background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)",
        pointerEvents: "none",
        opacity: lux / 1000,
      }} />
    </div>
  );
}
