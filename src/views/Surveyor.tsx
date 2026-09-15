import { useState, useEffect, useCallback, useMemo, useRef } from "react";

interface Props {
  onBack: () => void;
}

interface GPSData {
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  accuracy: number | null;
}

interface OrientationData {
  heading: number | null;
  beta: number | null;
  gamma: number | null;
}

type TiltMode = "vertical" | "horizontal";

export default function Surveyor({ onBack }: Props) {
  const [gps, setGps] = useState<GPSData>({
    latitude: null,
    longitude: null,
    altitude: null,
    accuracy: null,
  });

  const [orientation, setOrientation] = useState<OrientationData>({
    heading: null,
    beta: null,
    gamma: null,
  });

  const [tiltMode, setTiltMode] = useState<TiltMode>("vertical");
  const [zeroOffset, setZeroOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);

  // Evita que los eventos relativos pisen a los absolutos.
  const receivedAbsoluteRef = useRef(false);

  // Setup GPS
  useEffect(() => {
    if (!navigator.geolocation || isFrozen) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setError(`Error GPS: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isFrozen]);

  const handleRequestPermission = useCallback(async () => {
    // En iOS 13+ DeviceOrientationEvent pide permiso explícito.
    // En Android/WebView simplemente no existe y seguimos directo.
    const DOE = (window as any).DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === "function") {
      try {
        const response = await DOE.requestPermission();
        if (response !== "granted") {
          setError("Permiso de orientación denegado");
        }
      } catch {
        setError("Error solicitando permisos de orientación");
      }
    }
    setPermissionRequested(true);
  }, []);

  useEffect(() => {
    if (!permissionRequested || isFrozen) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading = e.alpha;
      if ((e as any).webkitCompassHeading != null) {
        heading = (e as any).webkitCompassHeading;
      }

      setOrientation({
        heading,
        beta: e.beta,
        gamma: e.gamma,
      });
    };

    const handleAbsolute = (e: DeviceOrientationEvent) => {
      receivedAbsoluteRef.current = true;
      handleOrientation(e);
    };

    const handleRelative = (e: DeviceOrientationEvent) => {
      if (receivedAbsoluteRef.current) return;
      handleOrientation(e);
    };

    window.addEventListener("deviceorientationabsolute", handleAbsolute, true);
    window.addEventListener("deviceorientation", handleRelative, true);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handleAbsolute, true);
      window.removeEventListener("deviceorientation", handleRelative, true);
    };
  }, [permissionRequested, isFrozen]);

  // Al cambiar de modo, el cero anterior deja de tener sentido.
  useEffect(() => {
    setZeroOffset(0);
  }, [tiltMode]);

  const tiltValue = useMemo(() => {
    if (orientation.beta === null) return null;

    if (tiltMode === "vertical") {
      // Teléfono de canto / pantalla al frente: 90° = vertical perfecta.
      return 90 - orientation.beta;
    }

    // Teléfono plano: inclinación del plano respecto a la horizontal.
    const b = (orientation.beta * Math.PI) / 180;
    const g = ((orientation.gamma ?? 0) * Math.PI) / 180;
    return (Math.acos(Math.cos(b) * Math.cos(g)) * 180) / Math.PI;
  }, [orientation, tiltMode]);

  const tiltDisplay = tiltValue === null ? null : tiltValue - zeroOffset;

  const getHeadingName = (deg: number | null) => {
    if (deg === null) return "--";
    const d = (deg + 360) % 360;
    if (d >= 337.5 || d < 22.5) return "N";
    if (d >= 22.5 && d < 67.5) return "NE";
    if (d >= 67.5 && d < 112.5) return "E";
    if (d >= 112.5 && d < 157.5) return "SE";
    if (d >= 157.5 && d < 202.5) return "S";
    if (d >= 202.5 && d < 247.5) return "SO";
    if (d >= 247.5 && d < 292.5) return "O";
    if (d >= 292.5 && d < 337.5) return "NO";
    return "--";
  };

  const horizonOffset = tiltDisplay === null ? 0 : Math.max(-25, Math.min(25, tiltDisplay * 0.5));

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: "#0A0A0A",
      color: "#00FF41", // Verde Matrix/Táctico
      fontFamily: "'Courier New', Courier, monospace",
      display: "flex",
      flexDirection: "column",
      padding: "60px 20px 20px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Header Táctico */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #00FF41",
        paddingBottom: "10px",
        marginBottom: "20px",
      }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onBack} style={{
            background: "none",
            border: "1px solid #00FF41",
            color: "#00FF41",
            padding: "5px 15px",
            cursor: "pointer",
            fontSize: "12px",
          }}>
            SALIR
          </button>
          <button onClick={() => setIsFrozen(!isFrozen)} style={{
            background: isFrozen ? "#FFB000" : "none",
            border: `1px solid ${isFrozen ? "#FFB000" : "#00FF41"}`,
            color: isFrozen ? "#0A0A0A" : "#00FF41",
            padding: "5px 15px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
          }}>
            {isFrozen ? "RESUME" : "HOLD"}
          </button>
        </div>
        <span style={{ fontSize: "14px", fontWeight: "bold" }}>
          {isFrozen && <span style={{ color: "#FFB000", marginRight: "8px" }}>[HOLD]</span>}
          SURVEYOR_26
        </span>
      </div>

      {!permissionRequested ? (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: "20px",
        }}>
          <div style={{ fontSize: "40px" }}>🧭</div>
          <p>Para activar la Brújula e Inclinómetro se requieren permisos de sensores.</p>
          <button onClick={handleRequestPermission} style={{
            background: "#00FF41",
            color: "#0A0A0A",
            border: "none",
            padding: "15px 30px",
            fontWeight: "bold",
            borderRadius: "4px",
            cursor: "pointer",
          }}>
            ACTIVAR SENSORES
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Sección GPS */}
          <div style={{ border: "1px solid #00FF41", padding: "15px", position: "relative" }}>
            <span style={{ position: "absolute", top: "-10px", left: "10px", background: "#0A0A0A", padding: "0 5px", fontSize: "12px" }}>
              LOCALIZACIÓN_GNSS
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <div style={{ color: "#008F11", fontSize: "10px" }}>LATITUD</div>
                <div style={{ fontSize: "18px" }}>{gps.latitude?.toFixed(6) || "BUSCANDO..."}</div>
              </div>
              <div>
                <div style={{ color: "#008F11", fontSize: "10px" }}>LONGITUD</div>
                <div style={{ fontSize: "18px" }}>{gps.longitude?.toFixed(6) || "BUSCANDO..."}</div>
              </div>
              <div>
                <div style={{ color: "#008F11", fontSize: "10px" }}>ALTITUD</div>
                <div style={{ fontSize: "24px", color: "#FFB000" }}>{gps.altitude !== null ? `${gps.altitude.toFixed(1)} m` : "N/A"}</div>
              </div>
              <div>
                <div style={{ color: "#008F11", fontSize: "10px" }}>PRECISIÓN</div>
                <div style={{ fontSize: "18px" }}>±{gps.accuracy?.toFixed(1) || "--"}m</div>
              </div>
            </div>
          </div>

          {/* Sección Brújula */}
          <div style={{ border: "1px solid #00FF41", padding: "15px", position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ position: "absolute", top: "-10px", left: "10px", background: "#0A0A0A", padding: "0 5px", fontSize: "12px" }}>
              BRÚJULA_AZIMUT
            </span>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "48px", color: "#00FF41", fontWeight: "bold" }}>
                {orientation.heading !== null ? `${Math.round(orientation.heading)}°` : "---"}
              </div>
              <div style={{ fontSize: "24px", color: "#FFB000" }}>{getHeadingName(orientation.heading)}</div>
            </div>
            {/* Visual de Brújula Simple */}
            <div style={{
              width: "80px",
              height: "80px",
              border: "2px solid #00FF41",
              borderRadius: "50%",
              position: "relative",
              transform: `rotate(${-(orientation.heading ?? 0)}deg)`,
              transition: "transform 0.1s linear",
            }}>
              <div style={{
                position: "absolute",
                top: "5px",
                left: "50%",
                transform: "translateX(-50%)",
                fontWeight: "bold",
                fontSize: "12px",
              }}>N</div>
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "2px",
                height: "30px",
                background: "#FFB000",
                transform: "translate(-50%, -100%)",
              }} />
            </div>
          </div>

          {/* Sección Inclinómetro */}
          <div style={{ border: "1px solid #00FF41", padding: "15px", position: "relative" }}>
            <span style={{ position: "absolute", top: "-10px", left: "10px", background: "#0A0A0A", padding: "0 5px", fontSize: "12px" }}>
              INCLINÓMETRO
            </span>

            {/* Selector de posición del teléfono */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
              <button
                onClick={() => setTiltMode("vertical")}
                style={{
                  background: tiltMode === "vertical" ? "#00FF41" : "none",
                  color: tiltMode === "vertical" ? "#0A0A0A" : "#00FF41",
                  border: "1px solid #00FF41",
                  padding: "5px 12px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}
              >
                VERTICAL
              </button>
              <button
                onClick={() => setTiltMode("horizontal")}
                style={{
                  background: tiltMode === "horizontal" ? "#00FF41" : "none",
                  color: tiltMode === "horizontal" ? "#0A0A0A" : "#00FF41",
                  border: "1px solid #00FF41",
                  padding: "5px 12px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}
              >
                HORIZONTAL
              </button>
              <button
                onClick={() => setZeroOffset(tiltValue ?? 0)}
                style={{
                  marginLeft: "auto",
                  background: "#FFB000",
                  color: "#0A0A0A",
                  border: "none",
                  padding: "5px 12px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}
              >
                CERO
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
               <div style={{ flex: 1 }}>
                  <div style={{ color: "#008F11", fontSize: "10px" }}>PENDIENTE</div>
                  <div style={{ fontSize: "48px", color: "#00FF41", fontWeight: "bold" }}>
                    {tiltDisplay !== null ? `${tiltDisplay > 0 ? "+" : ""}${Math.round(tiltDisplay)}°` : "---"}
                  </div>
                  <div style={{ color: "#8B8B8B", fontSize: "12px" }}>
                    {tiltMode === "vertical"
                      ? "Teléfono de canto / pantalla al frente"
                      : "Teléfono plano sobre la superficie"}
                  </div>
               </div>
               {/* Horizonte Artificial */}
               <div style={{
                 width: "100px",
                 height: "60px",
                 border: "1px solid #008F11",
                 background: "#000",
                 position: "relative",
                 overflow: "hidden",
               }}>
                 <div style={{
                   position: "absolute",
                   top: "50%",
                   left: "-50%",
                   width: "200%",
                   height: "1px",
                   background: "#00FF41",
                   transform: `translateY(${horizonOffset}px)`,
                   boxShadow: "0 0 10px #00FF41",
                 }} />
                 <div style={{
                   position: "absolute",
                   top: "50%",
                   left: "50%",
                   width: "10px",
                   height: "10px",
                   border: "1px solid #FFB000",
                   borderRadius: "50%",
                   transform: "translate(-50%, -50%)",
                 }} />
               </div>
            </div>
          </div>

          {error && (
            <div style={{ color: "#FF3131", fontSize: "12px", textAlign: "center", border: "1px dashed #FF3131", padding: "10px" }}>
              ERROR: {error}
            </div>
          )}

        </div>
      )}

      {/* Grid Decorativo */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundImage: "radial-gradient(#00FF41 0.5px, transparent 0.5px)",
        backgroundSize: "20px 20px",
        opacity: 0.1,
        pointerEvents: "none",
        zIndex: -1,
      }} />

    </div>
  );
}
