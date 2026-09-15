import { useCallback, useEffect, useRef, useState } from "react";

type MagneticSource = "sensor" | "compass" | "unavailable";

export interface MagneticReading {
  source: MagneticSource;
  x: number | null;
  y: number | null;
  z: number | null;
  magnitude: number | null;
  heading: number | null;
}

interface MagnetometerSensor {
  x?: number;
  y?: number;
  z?: number;
  start(): void;
  stop(): void;
  onreading: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
}

const NO_READING: MagneticReading = {
  source: "sensor",
  x: null,
  y: null,
  z: null,
  magnitude: null,
  heading: null,
};

/**
 * Lee el campo magnético del dispositivo.
 * 1. Sensor nativo Magnetometer (Generic Sensor API) cuando existe.
 * 2. Fallback a deviceorientationabsolute/deviceorientation (heading/brújula),
 *    con el patrón de requestPermission de Surveyor para iOS.
 */
export function useMagnetometer() {
  const [enabled, setEnabled] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [reading, setReading] = useState<MagneticReading>({ ...NO_READING, source: "unavailable" });
  const nativeRef = useRef<MagnetometerSensor | null>(null);
  const receivedAbsoluteRef = useRef(false);

  const [nativeSupported] = useState(() => {
    const w = window as unknown as { Magnetometer?: unknown };
    return typeof w.Magnetometer === "function";
  });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let compassRemover: (() => void) | null = null;

    const setupCompass = () => {
      const onAbsolute = (e: DeviceOrientationEvent) => {
        receivedAbsoluteRef.current = true;
        const heading = headingFromEvent(e);
        if (heading !== null) setCompassState(heading);
      };
      const onRelative = (e: DeviceOrientationEvent) => {
        if (receivedAbsoluteRef.current) return;
        const heading = headingFromEvent(e);
        if (heading !== null) setCompassState(heading);
      };

      window.addEventListener("deviceorientationabsolute", onAbsolute, true);
      window.addEventListener("deviceorientation", onRelative, true);

      return () => {
        window.removeEventListener("deviceorientationabsolute", onAbsolute, true);
        window.removeEventListener("deviceorientation", onRelative, true);
      };
    };

    const setCompassState = (heading: number) => {
      if (cancelled) return;
      setReading({ source: "compass", x: null, y: null, z: null, magnitude: null, heading });
    };

    if (nativeSupported) {
      const w = window as unknown as {
        Magnetometer?: new (options: { frequency: number }) => MagnetometerSensor;
      };
      try {
        const sensor = new w.Magnetometer!({ frequency: 10 });
        nativeRef.current = sensor;
        sensor.onreading = () => {
          if (cancelled) return;
          const x = sensor.x ?? 0;
          const y = sensor.y ?? 0;
          const z = sensor.z ?? 0;
          setReading({
            source: "sensor",
            x,
            y,
            z,
            magnitude: Math.sqrt(x * x + y * y + z * z),
            heading: null,
          });
        };
        sensor.onerror = () => {
          if (cancelled) return;
          sensor.stop();
          nativeRef.current = null;
          compassRemover = setupCompass();
        };
        sensor.start();
        return () => {
          cancelled = true;
          sensor.stop();
          nativeRef.current = null;
          compassRemover?.();
        };
      } catch {
        compassRemover = setupCompass();
        return () => {
          cancelled = true;
          compassRemover?.();
        };
      }
    }

    compassRemover = setupCompass();
    return () => {
      cancelled = true;
      compassRemover?.();
    };
  }, [enabled, nativeSupported]);

  const requestPermission = useCallback(async () => {
    const DOE = (window as any).DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === "function") {
      try {
        const response = await DOE.requestPermission();
        if (response !== "granted") {
          setPermissionError("Permiso de orientación denegado");
          return;
        }
      } catch {
        setPermissionError("Error solicitando permisos de orientación");
        return;
      }
    }
    setPermissionError(null);
    setEnabled(true);
  }, []);

  return { reading, enabled, permissionError, requestPermission };
}

function headingFromEvent(e: DeviceOrientationEvent): number | null {
  const webkitHeading = (e as any).webkitCompassHeading;
  if (typeof webkitHeading === "number") return webkitHeading;
  if (e.alpha !== null && typeof e.alpha === "number") return e.alpha;
  return null;
}