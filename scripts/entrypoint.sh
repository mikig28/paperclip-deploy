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
DB_PARENT="$(dirname "${DB_DIR}")"
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

# Remove stale PostgreSQL socket lock files from /tmp
# After a crash or forced restart, these lock files can remain and prevent
# PostgreSQL from starting with: FATAL: lock file "/tmp/.s.PGSQL.*.lock" already exists
PG_PORT="${EMBEDDED_PG_PORT:-54329}"
for lockfile in /tmp/.s.PGSQL.${PG_PORT}.lock /tmp/.s.PGSQL.${PG_PORT}; do
    if [ -e "${lockfile}" ]; then
        # Check if a postgres process is actually using this port
        if ! pgrep -f "postgres.*${PG_PORT}" > /dev/null 2>&1; then
            echo "Removing stale PostgreSQL socket lock: ${lockfile}"
            rm -f "${lockfile}"
        fi
    fi
done

echo "Entrypoint: dropping to paperclip user..."

# Drop privileges and run the main startup script
exec sudo -E -u paperclip /app/start.sh
