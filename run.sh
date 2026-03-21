#!/bin/sh
set -e

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting Download Manager"

if command -v with-contenv >/dev/null 2>&1; then
  log "Home Assistant environment detected"
  exec with-contenv node backend/server.js
else
  log "Standard Docker environment"
  exec node backend/server.js
fi