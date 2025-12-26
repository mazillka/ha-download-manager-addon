#!/usr/bin/env bash
set -e

echo "[INFO] Starting Download Manager"

# ---- Home Assistant detection ----
if command -v with-contenv >/dev/null 2>&1; then
  echo "[INFO] Home Assistant environment detected"
  exec with-contenv node backend/server.js
else
  echo "[INFO] Standard Docker environment"
  exec node backend/server.js
fi
