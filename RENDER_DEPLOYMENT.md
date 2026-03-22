# Paperclip — Render Deployment Guide

## Architecture

Single Render Web Service running `paperclipai` with:
- **Embedded PostgreSQL** on a persistent disk at `/data`
- **Claude CLI** authenticated via subscription (not API key)
- **UI served** from the same process (`SERVE_UI=true`)
- **Authenticated mode** with public exposure

## Prerequisites

1. Render account with the target project/environment
2. GitHub repo `mikig28/paperclip-deploy` connected to Render
3. Local Paperclip state migrated (see MIGRATION_FROM_LOCAL.md)
4. Claude CLI authenticated on the Render instance (one-time)

## Service Configuration

| Setting | Value |
|---------|-------|
| Type | Web Service |
| Runtime | Docker |
| Plan | Standard (minimum for embedded PG) |
| Region | Oregon |
| Health Check | `/api/health` |
| Persistent Disk | 10 GB at `/data` |

## Environment Variables

See `.env.example.render` for the full list. Critical ones:

```
HOST=0.0.0.0
PORT=3100
PAPERCLIP_HOME=/data/paperclip
PAPERCLIP_DEPLOYMENT_MODE=authenticated
PAPERCLIP_DEPLOYMENT_EXPOSURE=public
CLAUDE_CONFIG_DIR=/data/claude-config
HOME=/data/home
PAPERCLIP_AGENT_JWT_SECRET=<from-local>
PAPERCLIP_PUBLIC_URL=https://<your-service>.onrender.com
```

## First Deploy

1. Push this repo to GitHub
2. In Render Dashboard, create a new Web Service from the repo
3. Set all env vars from `.env.example.render`
4. Attach a 10 GB persistent disk at `/data`
5. Deploy
6. After deploy, open Render Shell and run `claude login`
7. Follow the OAuth flow to authenticate Claude CLI
8. Set `PAPERCLIP_PUBLIC_URL` to your service URL
9. Optionally set `PAPERCLIP_AUTH_DISABLE_SIGN_UP=true` after creating your account

## Persistent Disk Layout

```
/data/
├── paperclip/
│   └── instances/
│       └── default/
│           ├── config.json
│           ├── .env
│           ├── db/              # Embedded PostgreSQL data
│           ├── data/
│           │   ├── backups/     # Hourly SQL backups
│           │   ├── storage/     # File attachments
│           │   └── run-logs/    # Agent run logs
│           ├── secrets/
│           │   └── master.key   # Encryption key
│           ├── logs/
│           ├── workspaces/      # Agent working dirs
│           └── projects/        # Managed project dirs
├── claude-config/               # Claude CLI auth/session
│   └── .credentials.json
└── home/                        # Synthetic HOME dir
    └── .claude -> /data/claude-config
```

## Deployment Mode

Using `authenticated` mode (not `local_trusted`) because:
- The service is publicly accessible
- Multiple users (Miki + Galit) need individual accounts
- Better-auth provides proper session management
- Sign-up can be disabled after initial setup

## Scaling Limitations

- **Single instance only**: Embedded PostgreSQL and persistent disk are tied to one instance
- No horizontal scaling without migrating to external PostgreSQL
- Persistent disk is not shared across instances
