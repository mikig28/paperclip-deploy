#!/usr/bin/env bash
set -euo pipefail

# This runs as root to fix persistent disk ownership, then drops to paperclip user
# Render mounts persistent disks as root on first create

# Ensure /data is owned by paperclip user
if [ "$(stat -c '%u' /data 2>/dev/null || echo 0)" != "1001" ]; then
    echo "Fixing /data ownership for paperclip user..."
    chown -R paperclip:paperclip /data 2>/dev/null || true
fi

# Drop privileges and run the main startup script
exec sudo -E -u paperclip /app/start.sh
