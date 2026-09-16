## Why

SensoLab reúne sensores del teléfono en miniapps de bolsillo, pero todavía no existe una que mida el campo magnético. El Magnetrónomo llena ese hueco: combina un medidor de campo magnético con un cronómetro que registra las muestras a lo largo del tiempo, útil para detectar campos electromagnéticos, calibrar brújulas o estudiar variaciones del entorno.

## What Changes

- Nueva miniapp **Magnetrónomo** (`src/views/Magnetronomo.tsx`) que mide el campo magnético del teléfono (magnetómetro) y lo muestra en µT (microteslas).
- Cronómetro integrado (iniciar/pausar/reiniciar) que registra muestras de campo magnético con su marca de tiempo mientras corre.
- Gráfica en tiempo real de la magnitud del campo (|B|) y de sus ejes (x, y, z) estilo decibelímetro, usando canvas.
- Indicadores en vivo: magnitud total, ejes individuales y dirección del rumbo indicativo cuando el sensor de orientación está disponible.
- Registro de sesión: permite guardar/exportar la sesión capturada (JSON) vía plugin fs/usar el patrón de sharing existente.
- Entrada en el Hub (`HubView.tsx`) y ruteo en `App.tsx`.
- Detección y aviso cuando el sensor no está disponible (desktop, navegadores sin soporte) con degradación a `deviceorientation`/brújula si existe.

## Capabilities

### New Capabilities
- `magnetronomo`: Medición del campo magnético con cronómetro y registro temporal de la sesión en la miniapp Magnetrónomo de SensoLab.

### Modified Capabilities
<!-- Ninguna existencia: el repo no tiene specs aún. -->

## Impact

- Código: `src/views/Magnetronomo.tsx` (nueva), `src/components/DbChart.tsx` (reutilizable) o nueva gráfica `MagChart.tsx`, `src/views/HubView.tsx` y `src/App.tsx` (registro y ruteo).
- APIs web: `Magnetometer` (Sensor APIs, cuando exista), `DeviceOrientationEvent`/`deviceorientationabsolute` como fuente del módulo magnético, `performance.now()`/`Date` para el cronómetro.
- Sin dependencias nuevas: gráfica con canvas 2D nativo, exportación con JSON local.
- Android: sin permisos nuevos (el magnetómetro no requiere permiso en WebView; reutiliza el patrón de Surveyor).