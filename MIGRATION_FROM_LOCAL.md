# Migrating Paperclip from Local Machine to Render

## Overview

This migrates your running local Paperclip instance to the Render cloud service,
preserving your database, secrets, storage, and agent state.

## Migration Matrix

| Component | Local Path | Render Path | Method | Risk |
|-----------|-----------|-------------|--------|------|
| config.json | `~/.paperclip/instances/default/config.json` | `/data/paperclip/instances/default/config.json` | Transform (paths change) | Low |
| .env | `~/.paperclip/instances/default/.env` | `/data/paperclip/instances/default/.env` | Copy (env vars override) | Low |
| master.key | `~/.paperclip/instances/default/secrets/master.key` | `/data/paperclip/instances/default/secrets/master.key` | Copy directly | **Critical** — lost key = lost encrypted secrets |
| DB (postgres) | `~/.paperclip/instances/default/db/` | `/data/paperclip/instances/default/db/` | Export/Import via SQL backup | Medium |
| Storage files | `~/.paperclip/instances/default/data/storage/` | `/data/paperclip/instances/default/data/storage/` | Copy directly | Low |
| Run logs | `~/.paperclip/instances/default/data/run-logs/` | `/data/paperclip/instances/default/data/run-logs/` | Copy directly (optional) | Low |
| Claude CLI creds | `~/.claude/.credentials.json` | `/data/claude-config/.credentials.json` | Copy + re-auth on Render | **High** — tokens may not transfer |
| Agent workspaces | `~/.paperclip/instances/default/workspaces/` | `/data/paperclip/instances/default/workspaces/` | Copy if needed | Low |

## Step-by-Step Migration

### Step 1: Create the migration archive (run on your local machine)

```bash
cd ~/Downloads/paperclip
bash scripts/migrate-state.sh pack
```

This creates `paperclip-migration.tar.gz` containing:
- Latest SQL backup of your database
- master.key
- .env
- config.json
- Storage files
- Claude CLI credentials

### Step 2: Deploy the Render service first (empty)

Push the repo to GitHub and create the Render service. Let it boot once to
initialize the persistent disk and directory structure.

### Step 3: Upload the migration archive to Render

Option A — Via Render Shell:
1. Open Render Dashboard > Your Service > Shell
2. Use the file upload feature to upload `paperclip-migration.tar.gz`
3. Run: `tar xzf paperclip-migration.tar.gz -C /data`

Option B — Via curl from your machine:
Not directly possible without SSH. Use Option A.

### Step 4: Restore the database

In Render Shell:
```bash
# Find the backup file
ls /data/paperclip/instances/default/data/backups/*.sql

# Wait for embedded postgres to start, then restore
paperclipai run &
sleep 30  # Wait for PG to initialize

# Restore (the embedded postgres port is 54329)
psql postgresql://localhost:54329/paperclip < /data/paperclip/instances/default/data/backups/paperclip-*.sql

# Or restart the service after unpacking — it will auto-initialize
```

### Step 5: Authenticate Claude CLI on Render

```bash
# In Render Shell:
claude login
```

Follow the OAuth link. This is required because:
- OAuth tokens are machine-specific and may not transfer
- The Render instance needs its own authenticated session
- This is a **one-time** step that persists across restarts (on persistent disk)

### Step 6: Set PAPERCLIP_PUBLIC_URL

After the first deploy, copy the service URL from Render and set:
```
PAPERCLIP_PUBLIC_URL=https://paperclip-XXXX.onrender.com
```

### Step 7: Create your account

1. Open the Paperclip URL in your browser
2. Sign up (this creates your user in `authenticated` mode)
3. You will be the first user and can set up as CEO/admin
4. Have Galit sign up as well
5. After both accounts exist, set `PAPERCLIP_AUTH_DISABLE_SIGN_UP=true`

### Step 8: Verify migration

- [ ] Paperclip UI loads at your Render URL
- [ ] You can log in
- [ ] Your company/agents/projects appear
- [ ] Agent runs can execute (test a simple task)
- [ ] Claude CLI auth works (check agent logs for `claude_auth_required` errors)
- [ ] Storage files are accessible
- [ ] Encrypted secrets decrypt correctly

## Rollback

Your local machine is untouched. If migration fails:
1. Stop the Render service
2. Continue using local Paperclip as before
3. Investigate and retry
