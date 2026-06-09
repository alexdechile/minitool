# SensoLab - MiniTools para Sensores

## Último Realizado
- **Interfaz Móvil:** Implementación de una UI estilo iOS con Home Screen, Dock y transiciones suaves.
- **App ColorLens:** Captura y análisis de colores de la naturaleza usando la cámara y Rust.
- **App Decibel Meter:** Medidor de ruido ambiental con gráfica en tiempo real.
- **App Surveyor:** Herramienta táctica con GPS, Brújula e Inclinómetro (Pitch).
- **App Sismógrafo:** Detector de vibraciones con estilo analógico y alarma sonora.
- **App Luxómetro:** Medidor de intensidad lumínica con sensor nativo y fallback de cámara.
- **App Asistente M50:** Fotómetro inteligente configurado para Canon EOS M50 Mark II.
- **Compilación Android:** Generación de APK Debug (`SensoLab_DEBUG.apk`) lista para pruebas.
- **Limpieza:** Eliminación de módulos redundantes (QR Generator).

## ¿Qué hace esta App?
SensoLab es un portal de herramientas de bolsillo que aprovecha al máximo los sensores de un smartphone moderno. Está diseñada para científicos aficionados, fotógrafos, ingenieros o cualquier persona que necesite mediciones rápidas y visualmente atractivas de su entorno (color, luz, sonido, movimiento, ubicación y orientación).

## Stack Técnico
- **Frontend:** React + TypeScript + Vite.
- **Backend/Core:** Rust (Tauri v2).
- **Mobile:** Tauri Android.
- **Sensores:** Web APIs (Geolocation, DeviceMotion, DeviceOrientation, AmbientLight, MediaDevices) integradas con lógica nativa en Rust para procesamiento pesado.
- **Estilos:** CSS moderno con soporte para Glassmorphism y temas adaptativos.
