# Paperclip on Render — single-service deployment
# Runs paperclipai with embedded postgres on persistent disk

FROM node:20-bookworm

# System deps for embedded-postgres and Claude CLI
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates git openssh-client procps sudo \
    && rm -rf /var/lib/apt/lists/*

# Install Claude CLI (required for claude_local adapter)
RUN npm install -g @anthropic-ai/claude-code@latest

# Install paperclipai globally so it's available as a command
RUN npm install -g paperclipai@latest

# Create a non-root user for running paperclip (embedded postgres requires non-root)
RUN useradd -m -s /bin/bash -u 1001 paperclip && \
    mkdir -p /data && chown paperclip:paperclip /data && \
    mkdir -p /app && chown paperclip:paperclip /app && \
    echo "paperclip ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Persistent disk mount point — all Paperclip state goes here
ENV PAPERCLIP_HOME=/data/paperclip
ENV PAPERCLIP_INSTANCE_ID=default

# Claude CLI config dir — must persist across restarts for session auth
ENV CLAUDE_CONFIG_DIR=/data/claude-config
ENV HOME=/data/home
ENV XDG_CONFIG_HOME=/data/home/.config

# Server configuration via env vars (overridden by Render env vars)
ENV HOST=0.0.0.0
ENV PORT=10000
ENV SERVE_UI=true
ENV PAPERCLIP_DEPLOYMENT_MODE=authenticated
ENV PAPERCLIP_DEPLOYMENT_EXPOSURE=public
ENV PAPERCLIP_MIGRATION_AUTO_APPLY=true
ENV HEARTBEAT_SCHEDULER_ENABLED=true

# Limit Node.js heap to avoid OOM on memory-constrained containers
ENV NODE_OPTIONS="--max-old-space-size=512"

# Copy scripts (sed fixes Windows CRLF line endings)
COPY scripts/entrypoint.sh /app/entrypoint.sh
COPY scripts/start.sh /app/start.sh
COPY scripts/migrate-state.sh /app/migrate-state.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh /app/start.sh /app/migrate-state.sh && \
    chmod +x /app/entrypoint.sh /app/start.sh /app/migrate-state.sh

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Entrypoint fixes disk ownership then drops to non-root user
CMD ["/app/entrypoint.sh"]
