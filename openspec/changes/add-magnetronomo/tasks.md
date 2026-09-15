## 1. Sensor de campo magnético

- [x] 1.1 Implementar hook/helper de lectura del magnetómetro usando `window.Magnetometer` (Sensor API) cuando exista, con listener de `reading` y sine of `error`
- [x] 1.2 Añadir fallback a `deviceorientationabsolute`/`deviceorientation` (heading) con el patrón de `requestPermission` de Surveyor, marcando la fuente como fallback
- [x] 1.3 Normalizar lectura a µT (magnitud total y ejes x/y/z) y exponer estado `{ magnitude, x, y, z, source }` o `null` cuando no hay sensor

## 2. Cronómetro y muestreo

- [x] 2.1 Implementar cronómetro con `performance.now()` y offset acumulado (start/pause/resume/reset) en un hook
- [x] 2.2 Mientras corre, muestrear a 5 Hz: timestamp relativo, magnitud y ejes; guardar en buffer de sesión (p.ej. 3.600 samples)
- [x] 2.3 Conectar muestreo al estado de grabación: pausa detiene el sampleo, reanudar continúa con tiempo acumulado, reset vacía el buffer y el reloj

## 3. Gráfica en tiempo real

- [x] 3.1 Crear `src/components/MagChart.tsx` (canvas 2D con dpr/resize/raf, patrón de DbChart) que dibuje la magnitud y ejes disponibles
- [x] 3.2 Resaltar el último sample y hacer scroll lateral conforme llegan muestras nuevas

## 4. Vista Magnetrónomo

- [x] 4.1 Crear `src/views/Magnetronomo.tsx` con header (botón SALIR/Back), estado y fuente del sensor, magnitud en vivo y botones de cronómetro (START/PAUSE/RESET)
- [x] 4.2 Renderizar `MagChart` y sección de ejes (x/y/z) con indicador de fallback/sensor no disponible
- [x] 4.3 Exportar sesión a JSON (guardar con `@tauri-apps/plugin-fs`/diálogo, o compartir texto con los plugins share existentes); deshabilitar export si no hay samples
- [x] 4.4 Registrar la app en `HubView.tsx` (card Magnetrónomo 🧲) y ruteo en `App.tsx`

## 5. Verificación

- [x] 5.1 `npm run build` pasa sin errores de TypeScript
- [ ] 5.2 Probar en navegador desktop: se muestra "sensor no disponible" y los controles de grabación quedan deshabilitados
- [ ] 5.3 Probar en Android: lectura de magnetómetro o fallback heading, cronómetro, gráfica y exportación