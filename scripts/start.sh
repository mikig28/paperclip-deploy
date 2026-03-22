#!/usr/bin/env bash
set -euo pipefail

echo "=== Paperclip Render Startup ==="
echo "PAPERCLIP_HOME=${PAPERCLIP_HOME:-not set}"
echo "HOME=${HOME:-not set}"
echo "CLAUDE_CONFIG_DIR=${CLAUDE_CONFIG_DIR:-not set}"
echo "PORT=${PORT:-10000}"
echo "Running as: $(whoami) ($(id -u))"

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
    echo "No config.json found — generating cloud-compatible config..."
    PUBLIC_URL="${PAPERCLIP_PUBLIC_URL:-https://localhost:${PORT:-10000}}"
    node -e "
const fs = require('fs');
const config = {
  \"\\\$meta\": { version: 1, updatedAt: new Date().toISOString(), source: 'configure' },
  database: {
    mode: 'embedded-postgres',
    embeddedPostgresDataDir: '${INSTANCE_ROOT}/db',
    embeddedPostgresPort: 54329,
    backup: { enabled: true, intervalMinutes: 60, retentionDays: 30, dir: '${INSTANCE_ROOT}/data/backups' }
  },
  logging: { mode: 'file', logDir: '${INSTANCE_ROOT}/logs' },
  server: {
    deploymentMode: 'authenticated',
    exposure: 'public',
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 10000,
    allowedHostnames: [],
    serveUi: true
  },
  auth: {
    baseUrlMode: 'explicit',
    publicBaseUrl: '${PUBLIC_URL}',
    disableSignUp: false
  },
  storage: {
    provider: 'local_disk',
    localDisk: { baseDir: '${INSTANCE_ROOT}/data/storage' },
    s3: { bucket: 'paperclip', region: 'us-east-1', prefix: '', forcePathStyle: false }
  },
  secrets: {
    provider: 'local_encrypted',
    strictMode: false,
    localEncrypted: { keyFilePath: '${INSTANCE_ROOT}/secrets/master.key' }
  }
};
fs.writeFileSync('${CONFIG_FILE}', JSON.stringify(config, null, 2));
console.log('Config generated for authenticated+public mode');
"
fi

# ── Patch config.json auth section if needed ─────────────────────────────────
# Ensures auth.baseUrlMode=explicit and auth.publicBaseUrl is set
# (handles case where config was created by onboard with wrong defaults)
if [ -f "${CONFIG_FILE}" ]; then
    PUBLIC_URL="${PAPERCLIP_PUBLIC_URL:-https://localhost:${PORT:-10000}}"
    node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('${CONFIG_FILE}', 'utf8'));
let changed = false;
if (!config['\$meta']) { config['\$meta'] = { version: 1 }; changed = true; }
if (!['onboard', 'configure', 'doctor'].includes(config['\$meta'].source)) {
  config['\$meta'].source = 'configure';
  changed = true;
}
config['\$meta'].updatedAt = new Date().toISOString();
if (!config.auth) { config.auth = {}; changed = true; }
if (config.auth.baseUrlMode !== 'explicit') { config.auth.baseUrlMode = 'explicit'; changed = true; }
if (config.auth.publicBaseUrl !== '${PUBLIC_URL}') { config.auth.publicBaseUrl = '${PUBLIC_URL}'; changed = true; }
if (config.server) {
  if (config.server.deploymentMode !== 'authenticated') { config.server.deploymentMode = 'authenticated'; changed = true; }
  if (config.server.exposure !== 'public') { config.server.exposure = 'public'; changed = true; }
  if (config.server.host !== '0.0.0.0') { config.server.host = '0.0.0.0'; changed = true; }
}
if (changed) {
  fs.writeFileSync('${CONFIG_FILE}', JSON.stringify(config, null, 2));
  console.log('Config patched for authenticated+public mode');
} else {
  console.log('Config already correct');
}
"
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

# ── Mark first boot complete after health check passes ────────────────────────
# Run in background: wait for the health endpoint, then create the marker
(
    for i in $(seq 1 60); do
        sleep 5
        if curl -sf "http://localhost:${PORT:-10000}/api/health" > /dev/null 2>&1; then
            touch /data/.paperclip-boot-ok
            echo "[boot-marker] Server healthy — boot marker created"
            exit 0
        fi
    done
    echo "[boot-marker] WARNING: health check never passed within 5 minutes"
) &

# ── Start Paperclip ──────────────────────────────────────────────────────────
echo "Starting paperclipai..."
exec paperclipai run
