import { useState, useRef, useEffect, useCallback } from "react";
import DbChart from "../components/DbChart";

interface Props {
  onBack: () => void;
}

const MAX_SAMPLES = 600;
const DB_MIN = 20;
const DB_MAX = 120;

function computeRMS(dataArray: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const val = dataArray[i] / 128 - 1;
    sum += val * val;
  }
  return Math.sqrt(sum / dataArray.length);
}

function rmsToDb(rms: number, offset: number): number {
  if (rms === 0) return DB_MIN;
  const db = 20 * Math.log10(rms) + 90 + offset;
  return Math.max(DB_MIN, Math.min(DB_MAX, db));
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function dbColor(db: number): string {
  if (db < 50) return "#B8E6C8";
  if (db < 70) return "#FFDAB9";
  if (db < 85) return "#F5C6D0";
  return "#E57373";
}

export default function DecibelMeter({ onBack }: Props) {
  const [currentDb, setCurrentDb] = useState(0);
  const [timestamp, setTimestamp] = useState(() => new Date());
  const [isListening, setIsListening] = useState(false);
  const [showCalibrate, setShowCalibrate] = useState(false);
  const [calibInput, setCalibInput] = useState("");
  const [calibrationOffset, setCalibrationOffset] = useState(() => {
    const saved = localStorage.getItem("sensolab_db_offset");
    return saved ? parseFloat(saved) : 0;
  });

  const dbHistoryRef = useRef<number[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const updateCountRef = useRef(0);

  const updateDb = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    const rms = computeRMS(dataArray);
    const db = rmsToDb(rms, calibrationOffset);

    updateCountRef.current++;

    if (updateCountRef.current % 2 === 0) {
      setCurrentDb(Math.round(db));

      const history = dbHistoryRef.current;
      history.push(db);
      if (history.length > MAX_SAMPLES) {
        history.shift();
      }
    }

    setTimestamp(new Date());
    animFrameRef.current = requestAnimationFrame(updateDb);
  }, [calibrationOffset]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      streamRef.current = stream;

      setIsListening(true);
      updateCountRef.current = 0;
      updateDb();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("No se pudo acceder al micrófono. Verifica los permisos.");
    }
  };

  const stopListening = () => {
    cancelAnimationFrame(animFrameRef.current);

    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();

    streamRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;

    setIsListening(false);
  };

  useEffect(() => {
    return () => {
      if (isListening) stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCalibrate = () => {
    const refValue = parseFloat(calibInput);
    if (isNaN(refValue)) return;

    const currentRaw = currentDb - calibrationOffset;
    const offset = refValue - currentRaw;
    setCalibrationOffset(offset);
    localStorage.setItem("sensolab_db_offset", offset.toString());
    setShowCalibrate(false);
    setCalibInput("");
  };

  const handleShare = async () => {
    try {
      const { shareText } = await import("@choochmeque/tauri-plugin-sharekit-api");
      await shareText(
        `SensoLab — Decibel Meter\n\n${Math.round(currentDb)} dB\n${formatTime(timestamp)}`
      );
    } catch (err) {
      console.error("Share failed:", err);
      try {
        await navigator.clipboard.writeText(
          `${Math.round(currentDb)} dB — ${formatTime(timestamp)}`
        );
        alert("Dato copiado al portapapeles");
      } catch {
        alert("No se pudo compartir");
      }
    }
  };

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: "linear-gradient(180deg, #FFF8F0 0%, #FFF0E6 100%)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "50px 20px 0",
        zIndex: 100,
      }}>
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
            zIndex: 101,
          }}
        >
          ✕
        </button>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => setShowCalibrate(true)}
            style={{
              background: "rgba(255,255,255,0.7)",
              border: "none",
              borderRadius: "12px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#3D3D3D",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              outline: "none",
            }}
          >
            Calibrar
          </button>
          <button
            onClick={handleShare}
            style={{
              background: "rgba(255,255,255,0.7)",
              border: "none",
              borderRadius: "12px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#3D3D3D",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              outline: "none",
            }}
          >
            Compartir
          </button>
        </div>
      </div>

      {/* Decibel display */}
      <div style={{
        flex: "0 0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 20px 8px",
      }}>
        <div style={{
          fontSize: "72px",
          fontWeight: 700,
          color: "#3D3D3D",
          letterSpacing: "-2px",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}>
          {Math.round(currentDb)}
          <span style={{
            fontSize: "28px",
            fontWeight: 500,
            color: "#8B8B8B",
            marginLeft: "4px",
          }}>
            dB
          </span>
        </div>
        <div style={{
          fontSize: "16px",
          fontWeight: 500,
          color: "#8B8B8B",
          fontVariantNumeric: "tabular-nums",
          marginTop: "4px",
        }}>
          {formatTime(timestamp)}
        </div>

        {/* Color bar */}
        <div style={{
          width: "70%",
          height: "4px",
          borderRadius: "2px",
          background: "linear-gradient(to right, #B8E6C8, #FFDAB9, #F5C6D0, #E57373)",
          marginTop: "12px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${((Math.round(currentDb) - DB_MIN) / (DB_MAX - DB_MIN)) * 100}%`,
            width: "8px",
            height: "4px",
            background: dbColor(currentDb),
            borderRadius: "2px",
            transition: "left 0.05s linear",
            boxShadow: "0 0 6px rgba(0,0,0,0.2)",
          }} />
        </div>
      </div>

      {/* Chart */}
      <div style={{
        flex: "1 1 auto",
        minHeight: 0,
        padding: "0 16px",
        marginBottom: "8px",
      }}>
        <DbChart
          data={dbHistoryRef.current}
          minDb={DB_MIN}
          maxDb={DB_MAX}
        />
      </div>

      {/* Start/Stop button */}
      <div style={{
        padding: "8px 20px 24px",
        display: "flex",
        justifyContent: "center",
      }}>
        <button
          onClick={isListening ? stopListening : startListening}
          style={{
            background: isListening
              ? "linear-gradient(135deg, #F5C6D0, #E57373)"
              : "linear-gradient(135deg, #B8E6C8, #B8D4E3)",
            border: "none",
            borderRadius: "50%",
            width: "72px",
            height: "72px",
            fontSize: "28px",
            cursor: "pointer",
            color: "white",
            boxShadow: `0 4px 20px ${isListening ? "rgba(229,115,115,0.3)" : "rgba(184,230,200,0.4)"}`,
            WebkitTapHighlightColor: "transparent",
            outline: "none",
            transition: "transform 0.15s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isListening ? "■" : "●"}
        </button>
      </div>

      {/* Calibration modal */}
      {showCalibrate && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "32px",
        }}>
          <div style={{
            background: "#FFF8F0",
            borderRadius: "24px",
            padding: "28px",
            width: "100%",
            maxWidth: "320px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
          }}>
            <h3 style={{
              margin: "0 0 8px",
              fontSize: "18px",
              color: "#3D3D3D",
            }}>
              Calibrar
            </h3>
            <p style={{
              margin: "0 0 16px",
              fontSize: "13px",
              color: "#8B8B8B",
              lineHeight: 1.4,
            }}>
              Pon el teléfono junto a un medidor de dB conocido e ingresá el valor real.
            </p>
            <p style={{
              fontSize: "12px",
              color: "#B8D4E3",
              marginBottom: "12px",
            }}>
              Lectura actual: <strong>{Math.round(currentDb)} dB</strong>
            </p>
            <input
              type="number"
              placeholder="Ej: 65"
              value={calibInput}
              onChange={(e) => setCalibInput(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                border: "2px solid #E0D5C8",
                background: "white",
                fontSize: "16px",
                color: "#3D3D3D",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{
              display: "flex",
              gap: "12px",
              marginTop: "16px",
            }}>
              <button
                onClick={() => setShowCalibrate(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  border: "none",
                  background: "#E0D5C8",
                  color: "#3D3D3D",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCalibrate}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #B8E6C8, #B8D4E3)",
                  color: "#3D3D3D",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; filter: brightness(2); }
          to { opacity: 1; filter: brightness(1); }
        }
      `}</style>
    </div>
  );
}
