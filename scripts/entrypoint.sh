#!/usr/bin/env bash
set -euo pipefail

# This runs as root to fix persistent disk ownership, then drops to paperclip user
# Render mounts persistent disks as root on first create

echo "Entrypoint: fixing /data ownership..."

# Always ensure /data is fully owned by paperclip user
# This handles both first-boot (root-owned mount) and recovery from
# previous root-owned runs that left files behind
chown -R paperclip:paperclip /data 2>/dev/null || true

# If there's a corrupted/root-owned PG data dir from a failed init, remove it
DB_DIR="/data/paperclip/instances/default/db"
if [ -d "${DB_DIR}" ]; then
    # Check if PG_VERSION exists (indicates a previous init attempt)
    if [ -f "${DB_DIR}/PG_VERSION" ]; then
        # Check if postmaster.pid exists but process isn't running (stale)
        if [ -f "${DB_DIR}/postmaster.pid" ] && ! kill -0 "$(head -1 "${DB_DIR}/postmaster.pid" 2>/dev/null)" 2>/dev/null; then
            echo "Removing stale postmaster.pid..."
            rm -f "${DB_DIR}/postmaster.pid"
        fi
    elif [ "$(ls -A "${DB_DIR}" 2>/dev/null)" ]; then
        # Dir has files but no PG_VERSION — incomplete init, clean it
        echo "Cleaning incomplete PG data dir..."
        rm -rf "${DB_DIR}"
        mkdir -p "${DB_DIR}"
        chown paperclip:paperclip "${DB_DIR}"
    fi
fi

echo "Entrypoint: dropping to paperclip user..."

# Drop privileges and run the main startup script
exec sudo -E -u paperclip /app/start.sh
