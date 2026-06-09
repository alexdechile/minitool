import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  onBack: () => void;
}

const HISTORY_LENGTH = 300;
const ALARM_THRESHOLD_DEFAULT = 2.5; // m/s² (por encima de la gravedad basal)

export default function Seismograph({ onBack }: Props) {
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [isAlarming, setIsAlarming] = useState(false);
  const [threshold, setThreshold] = useState(ALARM_THRESHOLD_DEFAULT);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataHistoryRef = useRef<number[]>(new Array(HISTORY_LENGTH).fill(0));
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const lastIntensityRef = useRef(0);

  // Request Permission
  const handleRequestPermission = useCallback(async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response !== "granted") {
          setError("Permiso denegado");
        }
      } catch (err) {
        setError("Error solicitando permisos");
      }
    }
    setPermissionRequested(true);
  }, []);

  // Web Audio Alarm Setup
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gainNode = audioCtxRef.current.createGain();
      gainNode.connect(audioCtxRef.current.destination);
      gainNode.gain.value = 0;
      gainNodeRef.current = gainNode;
    }
  };

  const startAlarmSound = () => {
    if (audioCtxRef.current && gainNodeRef.current && !oscillatorRef.current) {
      const osc = audioCtxRef.current.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, audioCtxRef.current.currentTime);
      osc.connect(gainNodeRef.current);
      osc.start();
      oscillatorRef.current = osc;
      
      // Modulación de frecuencia (Sirena)
      const mod = setInterval(() => {
        if (oscillatorRef.current && audioCtxRef.current) {
            const time = audioCtxRef.current.currentTime;
            oscillatorRef.current.frequency.exponentialRampToValueAtTime(1200, time + 0.1);
            oscillatorRef.current.frequency.exponentialRampToValueAtTime(800, time + 0.2);
        } else {
            clearInterval(mod);
        }
      }, 200);
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(0.5, audioCtxRef.current!.currentTime, 0.05);
    }
  };

  const stopAlarmSound = () => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(0, audioCtxRef.current!.currentTime, 0.1);
    }
    setTimeout(() => {
        if (oscillatorRef.current) {
            oscillatorRef.current.stop();
            oscillatorRef.current.disconnect();
            oscillatorRef.current = null;
        }
    }, 200);
  };

  // Device Motion Handling
  useEffect(() => {
    if (!permissionRequested) return;

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;

      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;

      // Magnitud del vector
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      // Filtro sutil para aislar la vibración (suponiendo que en reposo es ~9.81)
      const intensity = Math.abs(magnitude - 9.81);
      
      lastIntensityRef.current = intensity;
      
      // Update data history
      dataHistoryRef.current.push(intensity);
      if (dataHistoryRef.current.length > HISTORY_LENGTH) {
        dataHistoryRef.current.shift();
      }

      // Check threshold
      if (intensity > threshold) {
        if (!isAlarming) {
            setIsAlarming(true);
            initAudio();
            startAlarmSound();
        }
      } else if (intensity < threshold * 0.5 && isAlarming) {
          // Un poco de histéresis para apagarla
          setIsAlarming(false);
          stopAlarmSound();
      }
    };

    window.addEventListener("devicemotion", handleMotion, true);
    return () => {
      window.removeEventListener("devicemotion", handleMotion, true);
      stopAlarmSound();
    };
  }, [permissionRequested, threshold, isAlarming]);

  // Canvas Drawing Loop
  useEffect(() => {
    if (!permissionRequested) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const centerY = h / 2;

      // Fondo papel antiguo
      ctx.fillStyle = "#F5E6D3";
      ctx.fillRect(0, 0, w, h);

      // Cuadrícula sutil
      ctx.strokeStyle = "rgba(0,0,0,0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Línea central (Aguja en reposo)
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dibujar la onda
      ctx.strokeStyle = isAlarming ? "#FF0000" : "#CC0000";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const step = w / HISTORY_LENGTH;
      for (let i = 0; i < dataHistoryRef.current.length; i++) {
        const val = dataHistoryRef.current[i];
        const xPos = i * step;
        // Escalar valor para visualización (el sismo real es pequeño, amplificamos x20)
        const yPos = centerY + (val * 20 * (i % 2 === 0 ? 1 : -1));
        
        if (i === 0) ctx.moveTo(xPos, yPos);
        else ctx.lineTo(xPos, yPos);
      }
      ctx.stroke();

      // Indicador de "Papel Moviéndose"
      if (isAlarming) {
          ctx.fillStyle = "rgba(255,0,0,0.1)";
          ctx.fillRect(0,0,w,h);
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [permissionRequested, isAlarming]);

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: "#2C2C2C",
      display: "flex",
      flexDirection: "column",
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
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(10px)",
      }}>
        <button onClick={onBack} style={{
          background: "#444",
          border: "2px solid #FFF",
          color: "white",
          padding: "8px 20px",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 101,
        }}>
          CERRAR
        </button>
        <div style={{ color: "white", fontWeight: "bold" }}>SISMÓGRAFO ANALÓGICO</div>
        {isAlarming && (
          <div style={{
            color: "#FF3B30",
            fontWeight: "bold",
            animation: "pulse 0.5s infinite alternate",
            fontSize: "14px",
          }}>
            [ ALERTA ]
          </div>
        )}
      </div>

      {!permissionRequested ? (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: "white",
          padding: "40px",
          gap: "20px",
        }}>
          <div style={{ fontSize: "60px" }}>📈</div>
          <h2>Detector de Sismos</h2>
          <p>Apoya el teléfono en una superficie plana y estable para detectar vibraciones.</p>
          <button onClick={handleRequestPermission} style={{
            background: "#D4C5E2",
            color: "#333",
            border: "none",
            padding: "15px 40px",
            borderRadius: "30px",
            fontSize: "18px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
          }}>
            ACTIVAR SENSORES
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
          
          {/* El Canvas del Papel */}
          <div style={{ flex: 1, position: "relative" }}>
             <canvas 
               ref={canvasRef} 
               width={window.innerWidth} 
               height={window.innerHeight - 150} 
               style={{ width: "100%", height: "100%", display: "block" }}
             />
             {/* Aguja de metal (visual decorativo) */}
             <div style={{
               position: "absolute",
               right: "10px",
               top: "50%",
               width: "60px",
               height: "4px",
               background: "#555",
               transform: "translateY(-50%)",
               borderRadius: "2px",
               boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
             }} />
          </div>

          {/* Panel de Control Inferior */}
          <div style={{
            background: "#1A1A1A",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            borderTop: "4px solid #444",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#888", fontSize: "12px" }}>
               <span>SENSIBILIDAD</span>
               <span>INTENSIDAD: {lastIntensityRef.current.toFixed(2)}</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="10" 
              step="0.5" 
              value={threshold} 
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#CC0000" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", color: "#FFF", fontSize: "10px" }}>
               <span>ALTA (0.5)</span>
               <span>BAJA (10.0)</span>
            </div>
            {error && <div style={{ color: "#FF3B30", fontSize: "12px" }}>{error}</div>}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          from { opacity: 1; }
          to { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
