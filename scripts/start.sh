#!/usr/bin/env bash
set -euo pipefail

echo "=== Paperclip Render Startup ==="
echo "PAPERCLIP_HOME=${PAPERCLIP_HOME:-not set}"
echo "HOME=${HOME:-not set}"
echo "CLAUDE_CONFIG_DIR=${CLAUDE_CONFIG_DIR:-not set}"
echo "PORT=${PORT:-3100}"

# ── Ensure persistent directories exist ──────────────────────────────────────
INSTANCE_ROOT="${PAPERCLIP_HOME}/instances/${PAPERCLIP_INSTANCE_ID:-default}"
mkdir -p "${INSTANCE_ROOT}/db"
mkdir -p "${INSTANCE_ROOT}/data/backups"
mkdir -p "${INSTANCE_ROOT}/data/storage"
mkdir -p "${INSTANCE_ROOT}/data/run-logs"
mkdir -p "${INSTANCE_ROOT}/secrets"
mkdir -p "${INSTANCE_ROOT}/logs"
mkdir -p "${INSTANCE_ROOT}/workspaces"
mkdir -p "${INSTANCE_ROOT}/projects"

# Claude CLI config dir
mkdir -p "${CLAUDE_CONFIG_DIR}"
mkdir -p "${HOME}"
mkdir -p "${HOME}/.config"

# Symlink ~/.claude -> CLAUDE_CONFIG_DIR if different
CLAUDE_HOME_LINK="${HOME}/.claude"
if [ ! -e "${CLAUDE_HOME_LINK}" ] && [ "${CLAUDE_CONFIG_DIR}" != "${CLAUDE_HOME_LINK}" ]; then
    ln -sf "${CLAUDE_CONFIG_DIR}" "${CLAUDE_HOME_LINK}"
    echo "Symlinked ${CLAUDE_HOME_LINK} -> ${CLAUDE_CONFIG_DIR}"
fi

# ── Generate instance config.json if missing ─────────────────────────────────
CONFIG_FILE="${INSTANCE_ROOT}/config.json"
if [ ! -f "${CONFIG_FILE}" ]; then
    echo "No config.json found — running paperclipai onboard with defaults..."
    paperclipai onboard --yes
    echo "Onboard complete."
fi

# ── Generate .env if missing ─────────────────────────────────────────────────
ENV_FILE="${INSTANCE_ROOT}/.env"
if [ ! -f "${ENV_FILE}" ]; then
    echo "# Paperclip environment variables" > "${ENV_FILE}"
    echo "# Auto-generated on first Render boot" >> "${ENV_FILE}"
    if [ -n "${PAPERCLIP_AGENT_JWT_SECRET:-}" ]; then
        echo "PAPERCLIP_AGENT_JWT_SECRET=${PAPERCLIP_AGENT_JWT_SECRET}" >> "${ENV_FILE}"
    else
        JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        echo "PAPERCLIP_AGENT_JWT_SECRET=${JWT_SECRET}" >> "${ENV_FILE}"
    fi
    echo ".env generated."
fi

# ── Generate master.key if missing ───────────────────────────────────────────
MASTER_KEY_FILE="${INSTANCE_ROOT}/secrets/master.key"
if [ ! -f "${MASTER_KEY_FILE}" ]; then
    echo "Generating new master.key..."
    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" > "${MASTER_KEY_FILE}"
    echo "master.key generated. If migrating, replace this with your existing key."
fi

# ── Claude CLI auth check ────────────────────────────────────────────────────
echo "Checking Claude CLI auth status..."
CLAUDE_AUTH=$(claude auth status 2>&1 || true)
echo "${CLAUDE_AUTH}"

if echo "${CLAUDE_AUTH}" | grep -q '"loggedIn": *false\|"loggedIn":false'; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  CLAUDE CLI NOT AUTHENTICATED                              ║"
    echo "║                                                            ║"
    echo "║  claude_local agents will fail until you run:              ║"
    echo "║    claude login                                            ║"
    echo "║  inside the Render shell (Dashboard > Shell tab)           ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
fi

# ── Start Paperclip ──────────────────────────────────────────────────────────
echo "Starting paperclipai..."
exec paperclipai run
