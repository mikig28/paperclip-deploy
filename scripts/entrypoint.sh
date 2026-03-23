#!/usr/bin/env bash
set -euo pipefail

# This runs as root to fix persistent disk ownership, then drops to paperclip user
# Render mounts persistent disks as root on first create

echo "Entrypoint: fixing /data ownership..."

# Always ensure /data is fully owned by paperclip user
# This handles both first-boot (root-owned mount) and recovery from
# previous root-owned runs that left files behind
chown -R paperclip:paperclip /data 2>/dev/null || true

# Fix PostgreSQL data directory permissions (must be 0700)
DB_DIR="/data/paperclip/instances/default/db"
BOOT_MARKER="/data/.paperclip-boot-ok"

if [ -d "${DB_DIR}" ] && [ -f "${DB_DIR}/PG_VERSION" ]; then
    echo "Fixing PostgreSQL data directory permissions..."
    chmod 700 "${DB_DIR}"
    # Also fix subdirectories that postgres needs
    find "${DB_DIR}" -type d -exec chmod 700 {} \; 2>/dev/null || true
    find "${DB_DIR}" -type f -exec chmod 600 {} \; 2>/dev/null || true
fi

if [ ! -f "${BOOT_MARKER}" ] && [ ! -f "${DB_DIR}/PG_VERSION" ]; then
    echo "No boot marker and no existing DB — fresh init..."
    rm -rf "${DB_DIR}"
    mkdir -p "${DB_DIR}"
    chmod 700 "${DB_DIR}"
    chown paperclip:paperclip "${DB_DIR}"
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
