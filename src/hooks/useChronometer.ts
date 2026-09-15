import { useCallback, useEffect, useRef, useState } from "react";

export type ChronoStatus = "idle" | "running" | "paused";

export interface Chronometer {
  status: ChronoStatus;
  elapsedMs: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

/** Cronómetro con precisión de rAF y offset acumulado entre pausas. */
export function useChronometer(): Chronometer {
  const [status, setStatus] = useState<ChronoStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const offsetRef = useRef(0);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  const tick = useCallback(() => {
    setElapsedMs(offsetRef.current + (performance.now() - startRef.current));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    offsetRef.current = 0;
    startRef.current = performance.now();
    setStatus("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    offsetRef.current += performance.now() - startRef.current;
    cancelAnimationFrame(rafRef.current);
    setStatus("paused");
    setElapsedMs(offsetRef.current);
  }, []);

  const resume = useCallback(() => {
    startRef.current = performance.now();
    setStatus("running");
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    offsetRef.current = 0;
    setElapsedMs(0);
    setStatus("idle");
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { status, elapsedMs, start, pause, resume, reset };
}