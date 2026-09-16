## Context

SensoLab se compone de miniapps en `src/views/*.tsx` ruteadas por un switch de estado en `src/App.tsx` y listadas en `src/views/HubView.tsx`. Surveyor ya consume `deviceorientationabsolute`/`deviceorientation` con el patrón de `requestPermission` para iOS; DecibelMeter dibuja una gráfica en canvas en tiempo real con `DbChart.tsx`. El Magnetrónomo reutiliza ambos patrones y no requiere dependencias nuevas. Ver proposal.md — Why para motivación.

## Goals / Non-Goals

**Goals:**
- Lee el campo magnético del teléfono en µT (magnetómetro) con fallback a brújula.
- Cronómetro con samples temporizados y gráfica live en canvas.
- Exportación JSON de la sesión.
- Consistente con la UI glassmorphism/iOS del Hub y el estilo de las demás miniapps.

**Non-Goals:**
- No calibrar el magnetómetro (interferencias de hielo/calibración tipo brújula).
- No calcular intensidad relativa frente a referencia, ni alertas de umbral configurables.
- No agregar plugins Rust ni dependencias npm nuevas a menos que el share falle.

## Decisions

- **Fuente del sensor: `Magnetometer` Sensor API con fallback a `deviceorientationabsolute`.** En Android/Chrome el `Magnetometer` (Generic Sensor API) está disponible; en WebViews donde no, la orientación absoluta deriva del magnetómetro. Alternativa considerada: plugin Rust de magnetómetro (requiere Tauri mobile, no usado hoy). Decisión: priorizar el patrón web existente, sin dependencias nuevas.
- **Cronómetro con `performance.now()` y acumulador de offset.** Se guarda `elapsed` acumulado al pausar; al reanudar se reinicia el origen. Consistente con el requerimiento de "resume desde el tiempo acumulado". Alternativa: `setInterval` sumando; menos preciso y propenso a drift.
- **Sampleo a intervalos regulares con buffer fijo por sesión, no lectura continua.** Un buffer (p.ej. 3.600 samples ≈ 12 min a 5 Hz) evita crecer sin límite y facilita el escroll de la gráfica, como `MAX_SAMPLES` en `DbChart.tsx`.
- **Gráfica nueva `MagChart.tsx` genérica** (series multi-eje: magnitud + x/y/z) en vez de forzar `DbChart.tsx` (que mapea dB con colores). Se reutilizan el patrón canvas/dpr/raf de `DbChart`.
- **Exportación JSON vía `tauri-plugin-fs`** para guardar y reusar el patrón de sharing de la app (sharekit/plugin share) como alternativa en móvil. Si el share de texto no aplica, el JSON se guarda con `@tauri-apps/plugin-fs` (writeTextFile + dialog save si disponible).

## Risks / Trade-offs

- [Sensor API `Magnetometer` no disponible en WebViews Android →] Fallback a `deviceorientationabsolute`; si tampoco existe, UI de "sensor no disponible" y deshabilitar grabación (cumple el spec).
- [Referencia de ejes (x,y,z) no expuesta por el fallback →] En fallback se muestran magnitud indicativa y heading; ejes se muestran solo cuando el sensor nativo los entrega.
- [Frecuencia/norma del campo en WebView puede no reflejar µT reales →] Se normaliza y etiqueta como "indicativo" en el fallback; con sensor nativo se usa el valor del API.
- [Buffer acotado pierde historia →] Se documenta la duración máxima visible y el export incluye toda la sesión en memoria.