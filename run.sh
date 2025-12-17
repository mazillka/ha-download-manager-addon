#!/usr/bin/env bash
set -e

echo "[INFO] Starting Download Manager"

# ---- Defaults (Docker-safe) ----
: "${MAX_CONCURRENT:=3}"
: "${MAX_SPEED:=0}"
: "${NODE_ENV:=production}"

export MAX_CONCURRENT MAX_SPEED NODE_ENV

echo "[INFO] NODE_ENV=${NODE_ENV}"
echo "[INFO] MAX_CONCURRENT=${MAX_CONCURRENT}"
echo "[INFO] MAX_SPEED=${MAX_SPEED}"

# ---- Home Assistant detection ----
if command -v with-contenv >/dev/null 2>&1; then
  echo "[INFO] Home Assistant environment detected"
  exec with-contenv node backend/server.js
else
  echo "[INFO] Standard Docker environment"
  exec node backend/server.js
fi
