import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ColorResult {
  hex: string;
  name: string;
  palette: string[];
  design_md: string;
}

interface Props {
  onBack: () => void;
}

export default function ColorLens({ onBack }: Props) {
  const [result, setResult] = useState<ColorResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!capturedImage) {
        setupCamera();
    }
    
    async function setupCamera() {
      try {
        const constraints = {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Play error:", e));
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Permiso denegado o cámara no disponible");
      }
    }
    
    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [capturedImage]);

  const captureColor = async (e: React.MouseEvent | React.TouchEvent) => {
    if (!videoRef.current || !canvasRef.current || result) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const rect = video.getBoundingClientRect();
    let x, y;

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = (e as React.MouseEvent).clientX - rect.left;
      y = (e as React.MouseEvent).clientY - rect.top;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const actualX = Math.floor(x * scaleX);
    const actualY = Math.floor(y * scaleY);

    const pixel = ctx.getImageData(actualX, actualY, 1, 1).data;
    const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
      .toString(16)
      .slice(1)
      .toUpperCase()}`;

    const imageData = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(imageData);

    handleAnalyze(hex);
  };

  const handleAnalyze = async (hex: string) => {
    setLoading(true);
    try {
      const res: ColorResult = await invoke("analyze_color", { hex });
      setResult(res);
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDesign = async () => {
    if (!result) return;
    const content = `${result.design_md}\n\nPalette: ${result.palette.join(", ")}`;
    try {
      await navigator.clipboard.writeText(content);
      alert("¡Diseño copiado al portapapeles!");
    } catch (err) {
      console.error("Clipboard failed:", err);
      alert("No se pudo copiar al portapapeles.");
    }
  };

  const handleRetake = () => {
      setResult(null);
      setCapturedImage(null);
  };

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "black",
    }}>
      <button
        onClick={onBack}
        style={{
          position: "absolute",
          top: "40px",
          left: "20px",
          zIndex: 100,
          background: "rgba(255,255,255,0.3)",
          backdropFilter: "blur(10px)",
          border: "none",
          borderRadius: "50%",
          width: "50px",
          height: "50px",
          color: "white",
          fontSize: "24px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          WebkitTapHighlightColor: "transparent",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          outline: "none",
          padding: 0,
        }}
      >
        ✕
      </button>

      {error && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "white",
          textAlign: "center",
          zIndex: 5,
          background: "rgba(255,0,0,0.4)",
          padding: "20px",
          borderRadius: "16px",
          backdropFilter: "blur(10px)",
        }}>
          <div>⚠️ {error}</div>
          <button onClick={() => window.location.reload()} style={{
            marginTop: "10px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid white",
            background: "none",
            color: "white",
          }}>Reintentar</button>
        </div>
      )}

      {!capturedImage ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          onClick={captureColor}
          onTouchStart={captureColor}
        />
      ) : (
        <div style={{
          width: "100%",
          height: "100%",
          background: "black",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}>
          <img
            src={capturedImage}
            alt="Captured"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              animation: "fadeIn 0.5s ease-in",
            }}
          />
        </div>
      )}

      {!result && !loading && !capturedImage && (
        <div style={{
          position: "absolute",
          top: "20px",
          width: "100%",
          textAlign: "center",
          color: "white",
          textShadow: "0 2px 4px rgba(0,0,0,0.5)",
          fontSize: "0.9rem",
          pointerEvents: "none",
        }}>
          Toca la naturaleza para capturar un color
        </div>
      )}

      {loading && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "white",
          background: "rgba(0,0,0,0.6)",
          padding: "10px 20px",
          borderRadius: "20px",
          fontSize: "14px",
        }}>
          Extrayendo esencia...
        </div>
      )}

      {result && (
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          borderRadius: "24px 24px 0 0",
          padding: "24px",
          color: "#1a1a1a",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.3)",
          animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <button
            onClick={handleRetake}
            style={{
              position: "absolute",
              top: "15px",
              right: "15px",
              border: "none",
              background: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#666",
            }}
          >
            ×
          </button>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            marginBottom: "24px",
          }}>
            <div style={{
              width: "70px",
              height: "70px",
              borderRadius: "18px",
              boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
              background: result.hex,
            }} />
            <div>
              <h2 style={{ margin: 0, fontSize: "1.4rem", textTransform: "capitalize" }}>
                {result.name}
              </h2>
              <code style={{ fontSize: "1.1rem", color: "#666" }}>
                {result.hex}
              </code>
            </div>
          </div>

          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "24px",
          }}>
            {result.palette.slice(1).map((c, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
              }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                  flexShrink: 0,
                  background: c,
                }} />
                <span style={{
                  fontFamily: "monospace",
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: "#444",
                }}>
                  {c}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}>
            <button
              onClick={handleCopyDesign}
              style={{
                padding: "16px",
                borderRadius: "14px",
                border: "none",
                background: "#000",
                color: "white",
                fontWeight: 700,
                fontSize: "1.1rem",
                cursor: "pointer",
              }}
            >
              Copiar Diseño (Markdown)
            </button>
            <button
              onClick={handleRetake}
              style={{
                background: "none",
                border: "none",
                color: "#666",
                fontWeight: 500,
                padding: "8px",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Tomar de nuevo
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
