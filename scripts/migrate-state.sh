#!/usr/bin/env bash
# migrate-state.sh — Copy local Paperclip state to Render persistent disk
#
# Run this ONCE from your local machine after the Render service is created
# but before you expect agents to work.
#
# Prerequisites:
#   - Render service is deployed and has a persistent disk at /data
#   - You have SSH access to the Render service (or use Render Shell)
#
# Usage:
#   1. Create a tar of your local state:
#      ./scripts/migrate-state.sh pack
#
#   2. Upload the tar to Render (via Render Shell or SCP):
#      - Open Render Dashboard > Your Service > Shell
#      - Upload paperclip-migration.tar.gz
#      - Run: ./scripts/migrate-state.sh unpack
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "${1:-help}" in
    pack)
        echo "=== Packing local Paperclip state for migration ==="

        # Detect local state paths (Windows -> Git Bash style)
        LOCAL_PAPERCLIP_HOME="${PAPERCLIP_HOME:-${HOME}/.paperclip}"
        LOCAL_CLAUDE_CONFIG="${CLAUDE_CONFIG_DIR:-${HOME}/.claude}"
        INSTANCE_ID="${PAPERCLIP_INSTANCE_ID:-default}"
        INSTANCE_ROOT="${LOCAL_PAPERCLIP_HOME}/instances/${INSTANCE_ID}"

        echo "Local Paperclip home: ${LOCAL_PAPERCLIP_HOME}"
        echo "Instance root: ${INSTANCE_ROOT}"
        echo "Claude config: ${LOCAL_CLAUDE_CONFIG}"

        ARCHIVE="paperclip-migration.tar.gz"

        # Create a staging directory
        STAGING=$(mktemp -d)
        trap 'rm -rf "${STAGING}"' EXIT

        # Copy Paperclip instance state
        echo "Copying Paperclip instance state..."
        mkdir -p "${STAGING}/paperclip/instances/${INSTANCE_ID}"

        # Config
        cp -v "${INSTANCE_ROOT}/config.json" "${STAGING}/paperclip/instances/${INSTANCE_ID}/" 2>/dev/null || true
        cp -v "${INSTANCE_ROOT}/.env" "${STAGING}/paperclip/instances/${INSTANCE_ID}/" 2>/dev/null || true

        # Secrets (master key)
        mkdir -p "${STAGING}/paperclip/instances/${INSTANCE_ID}/secrets"
        cp -v "${INSTANCE_ROOT}/secrets/master.key" "${STAGING}/paperclip/instances/${INSTANCE_ID}/secrets/" 2>/dev/null || true

        # Latest DB backup (NOT the raw pg data dir — that's not portable)
        echo "Finding latest DB backup..."
        LATEST_BACKUP=$(ls -t "${INSTANCE_ROOT}/data/backups/"*.sql 2>/dev/null | head -1)
        if [ -n "${LATEST_BACKUP}" ]; then
            mkdir -p "${STAGING}/paperclip/instances/${INSTANCE_ID}/data/backups"
            cp -v "${LATEST_BACKUP}" "${STAGING}/paperclip/instances/${INSTANCE_ID}/data/backups/"
            echo "Included backup: $(basename "${LATEST_BACKUP}")"
        else
            echo "WARNING: No SQL backups found. DB state will not be migrated."
        fi

        # Storage files
        if [ -d "${INSTANCE_ROOT}/data/storage" ]; then
            echo "Copying storage files..."
            mkdir -p "${STAGING}/paperclip/instances/${INSTANCE_ID}/data"
            cp -r "${INSTANCE_ROOT}/data/storage" "${STAGING}/paperclip/instances/${INSTANCE_ID}/data/"
        fi

        # Claude CLI credentials (needed for subscription auth)
        echo "Copying Claude CLI credentials..."
        mkdir -p "${STAGING}/claude-config"
        cp -v "${LOCAL_CLAUDE_CONFIG}/.credentials.json" "${STAGING}/claude-config/" 2>/dev/null || true
        cp -v "${LOCAL_CLAUDE_CONFIG}/credentials.json" "${STAGING}/claude-config/" 2>/dev/null || true
        # Copy settings if they exist
        cp -v "${LOCAL_CLAUDE_CONFIG}/settings.json" "${STAGING}/claude-config/" 2>/dev/null || true

        # Pack it
        echo "Creating archive..."
        tar czf "${ARCHIVE}" -C "${STAGING}" .

        ARCHIVE_SIZE=$(du -h "${ARCHIVE}" | cut -f1)
        echo ""
        echo "=== Migration archive created ==="
        echo "File: ${ARCHIVE} (${ARCHIVE_SIZE})"
        echo ""
        echo "Next steps:"
        echo "  1. Upload this file to your Render service"
        echo "  2. In Render Shell, run: tar xzf paperclip-migration.tar.gz -C /data"
        echo "  3. Restore the DB backup: psql \$DATABASE_URL < /data/paperclip/instances/default/data/backups/*.sql"
        echo "     (or let embedded postgres pick it up on restart)"
        echo "  4. Run 'claude login' in Render Shell to authenticate Claude CLI"
        ;;

    unpack)
        echo "=== Unpacking migration archive on Render ==="

        ARCHIVE="${2:-paperclip-migration.tar.gz}"
        TARGET="/data"

        if [ ! -f "${ARCHIVE}" ]; then
            echo "ERROR: Archive not found: ${ARCHIVE}"
            echo "Upload the archive first, then run: $0 unpack [archive-path]"
            exit 1
        fi

        echo "Extracting to ${TARGET}..."
        tar xzf "${ARCHIVE}" -C "${TARGET}"

        # Restore DB from backup if embedded postgres is used
        BACKUP_DIR="${TARGET}/paperclip/instances/default/data/backups"
        LATEST_BACKUP=$(ls -t "${BACKUP_DIR}/"*.sql 2>/dev/null | head -1)

        if [ -n "${LATEST_BACKUP}" ]; then
            echo "DB backup found: ${LATEST_BACKUP}"
            echo "The backup will be available for restore."
            echo "If using embedded postgres, the DB will initialize fresh and you can restore with:"
            echo "  psql postgres://localhost:54329/paperclip < ${LATEST_BACKUP}"
        fi

        echo ""
        echo "=== Unpack complete ==="
        echo "Restart the service to pick up the migrated state."
        ;;

    *)
        echo "Usage: $0 {pack|unpack}"
        echo ""
        echo "  pack    — Run on your LOCAL machine to create a migration archive"
        echo "  unpack  — Run on RENDER to extract the migration archive"
        ;;
esac
