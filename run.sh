#!/usr/bin/env bash
set -e

echo "[INFO] Starting Download Manager"

# ===== Start backend =====
# ---- Home Assistant detection ----
if command -v with-contenv >/dev/null 2>&1; then
  echo "[INFO] Home Assistant environment detected"
  exec with-contenv node backend/server.js
  BACKEND_PID=$!
else
  echo "[INFO] Standard Docker environment"
  exec node backend/server.js
  BACKEND_PID=$!
fi

# ===== Graceful shutdown =====
function shutdown() {
    echo "Shutting down..."
    kill $BACKEND_PID
    exit 0
}

trap shutdown SIGTERM SIGINT

# ===== Wait forever =====