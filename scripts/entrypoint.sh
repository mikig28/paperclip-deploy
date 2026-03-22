#!/usr/bin/env bash
set -euo pipefail

# This runs as root to fix persistent disk ownership, then drops to paperclip user
# Render mounts persistent disks as root on first create

echo "Entrypoint: fixing /data ownership..."

# Always ensure /data is fully owned by paperclip user
# This handles both first-boot (root-owned mount) and recovery from
# previous root-owned runs that left files behind
chown -R paperclip:paperclip /data 2>/dev/null || true

# Clean up PG data dir if no successful boot has been recorded
# This handles the case where previous deploys left a broken PG data dir
DB_DIR="/data/paperclip/instances/default/db"
DB_PARENT="$(dirname "${DB_DIR}")"
BOOT_MARKER="/data/.paperclip-boot-ok"

if [ ! -f "${BOOT_MARKER}" ]; then
    echo "No successful boot marker found — wiping PG data dir for fresh init..."
    rm -rf "${DB_DIR}"
    mkdir -p "${DB_PARENT}"
    chown -R paperclip:paperclip "${DB_PARENT}" 2>/dev/null || true
    # Also wipe the config so it gets regenerated fresh
    rm -f "/data/paperclip/instances/default/config.json"
fi

# Remove stale postmaster.pid if postgres isn't running
if [ -f "${DB_DIR}/postmaster.pid" ]; then
    PG_PID=$(head -1 "${DB_DIR}/postmaster.pid" 2>/dev/null || echo "")
    if [ -n "${PG_PID}" ] && ! kill -0 "${PG_PID}" 2>/dev/null; then
        echo "Removing stale postmaster.pid..."
        rm -f "${DB_DIR}/postmaster.pid"
    fi
fi

echo "Entrypoint: dropping to paperclip user..."

# Drop privileges and run the main startup script
exec sudo -E -u paperclip /app/start.sh
