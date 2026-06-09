#!/bin/bash
if [ -z "$1" ]; then
    echo "Error: No text provided to generate QR code."
    exit 1
fi
# -t ansiutf8 generates a QR code using ANSI escape sequences for UTF-8 terminal
qrencode -t ansiutf8 "$1"
