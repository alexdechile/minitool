---
name: qr-generator
description: Genera códigos QR directamente en la terminal para enlaces, textos o resultados. Úsalo cuando el usuario necesite escanear información rápidamente con su celular desde la pantalla del servidor.
---

# QR Generator Skill

Esta skill permite generar códigos QR que se visualizan directamente en la terminal usando caracteres ANSI. Es ideal para compartir enlaces de descarga (como APKs), URLs de portales o cualquier texto que el usuario necesite en su dispositivo móvil.

## Flujo de Trabajo

Cuando el usuario pida un QR o cuando generes un resultado que sea útil tener en el móvil (como un enlace de Tailscale):

1. **Ejecutar el script de generación:**
   Usa el script `scripts/generate.sh` pasando el texto o URL como argumento.

   ```bash
   bash scripts/generate.sh "https://donalex.van-solfeggio.ts.net/mi-app.apk"
   ```

2. **Visualización:**
   El código QR aparecerá en la terminal. Asegúrate de que la terminal tenga un ancho suficiente para que no se rompa la visualización.

## Requisitos
- `qrencode` debe estar instalado en el sistema (ya verificado en Arch Linux).
