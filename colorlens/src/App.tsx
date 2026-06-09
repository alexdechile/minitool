import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

interface ColorResult {
  hex: String;
  name: String;
  palette: string[];
  design_md: string;
}

function App() {
  const [result, setResult] = useState<ColorResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

    // Capture the full photo for Polaroid mode
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
      alert("¡Diseño copiado al portapapeles! Ya puedes pegarlo donde quieras.");
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
    <div className="app-container">
      {!capturedImage ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-view"
          onClick={captureColor}
          onTouchStart={captureColor}
        />
      ) : (
        <div className="polaroid-view">
            <img src={capturedImage} alt="Captured" className="captured-photo" />
        </div>
      )}
      
      {!result && !loading && !capturedImage && (
        <div className="hint">Toca la naturaleza para capturar un color</div>
      )}

      {loading && <div className="loader">Extrayendo esencia...</div>}

      {result && (
        <div className="result-card">
          <button className="close-btn" onClick={handleRetake}>×</button>
          
          <div className="color-header">
            <div className="main-bubble" style={{ backgroundColor: result.hex as string }}></div>
            <div className="color-info">
              <h2>{result.name}</h2>
              <code>{result.hex}</code>
            </div>
          </div>

          <div className="palette-list">
            {result.palette.slice(1).map((c, i) => (
              <div key={i} className="palette-row">
                <div className="color-bubble" style={{ backgroundColor: c }}></div>
                <div className="bubble-info">
                    <span className="bubble-hex">{c}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="actions">
            <button className="btn-primary" onClick={handleCopyDesign}>Copiar Diseño (Markdown)</button>
            <button className="btn-text" onClick={handleRetake}>Tomar de nuevo</button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default App;
