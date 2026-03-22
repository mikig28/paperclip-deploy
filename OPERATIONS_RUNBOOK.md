# Paperclip Operations Runbook

## Service Details

- **Platform**: Render.com
- **Type**: Web Service (Docker)
- **Persistent Disk**: 10 GB at `/data`
- **Health Check**: `GET /api/health`
- **URL**: Set in `PAPERCLIP_PUBLIC_URL`

## Daily Operations

### Checking Status

1. Visit your Paperclip URL — the UI shows agent status, recent runs, logs
2. Health endpoint: `curl https://your-url.onrender.com/api/health`
3. Render Dashboard: check service metrics, logs, and deploy status

### Sending Instructions from Phone

After migration, you control Paperclip the same way:
1. Open the Paperclip UI in your phone's browser
2. Navigate to your company/project
3. Dispatch tasks to agents via the UI
4. Monitor agent runs and results

The UI is fully responsive and works on mobile browsers.

### Checking Agent Logs

1. Via Paperclip UI: click on an agent run to see its log
2. Via Render Dashboard > Logs tab: see server-level logs
3. Via Render Shell: `tail -f /data/paperclip/instances/default/logs/server.log`

## Troubleshooting

### Agent Runs Fail with "claude_auth_required"

Claude CLI OAuth token expired.

**Fix:**
1. Open Render Dashboard > Your Service > Shell
2. Run: `claude login`
3. Complete OAuth flow in browser
4. Retry the agent run

### Service Won't Start

Check Render logs for errors. Common issues:
- Port conflict: Ensure `PORT=3100` is set
- Disk full: Check persistent disk usage
- DB corruption: Restore from backup

**Restore DB from backup:**
```bash
# In Render Shell
ls /data/paperclip/instances/default/data/backups/*.sql
# Pick the latest backup, then:
psql postgresql://localhost:54329/paperclip < /data/paperclip/instances/default/data/backups/<backup-file>.sql
```

### Persistent Disk Issues

```bash
# Check disk usage
df -h /data
du -sh /data/paperclip/instances/default/db/
du -sh /data/paperclip/instances/default/data/backups/
```

**If disk is full**, old backups accumulate. Clean up:
```bash
cd /data/paperclip/instances/default/data/backups/
ls -la *.sql | head -20
# Remove old backups, keep last 7 days
find . -name "*.sql" -mtime +7 -delete
```

### Lost Encrypted Secrets

If `master.key` is lost, all encrypted secrets become unreadable.

**Prevention:** Back up `/data/paperclip/instances/default/secrets/master.key` to a secure location.

**Recovery:** Restore master.key from backup, then restart service.

## Shared Usage (Miki + Galit)

### Architecture

- Single deployment, single database, single storage
- Both users sign up via the Paperclip UI
- First user becomes instance admin
- Both users see the same companies, agents, projects

### Concurrency

- Multiple users can use the UI simultaneously
- Agent runs are serialized per-agent (one run at a time per agent)
- Different agents can run concurrently
- No locking issues for normal use

### Account Setup

1. First user signs up → becomes admin
2. Admin invites second user (or second user signs up if allowed)
3. Both join the same company
4. Set `PAPERCLIP_AUTH_DISABLE_SIGN_UP=true` to prevent unwanted signups

## Maintenance

### Backups

Paperclip auto-creates SQL backups every 60 minutes (configurable).
Stored at: `/data/paperclip/instances/default/data/backups/`

**External backup** (recommended): periodically download the latest backup file
from Render Shell to your local machine or cloud storage.

### Updates

To update Paperclip to a newer version:
1. The Dockerfile uses `npm install -g paperclipai@latest`
2. Push any commit to trigger a redeploy
3. Or manually redeploy from Render Dashboard

**Note:** Updates may include DB migrations. `PAPERCLIP_MIGRATION_AUTO_APPLY=true`
handles this automatically.

### Claude CLI Updates

Claude CLI is installed during Docker build. To update:
1. Trigger a redeploy (rebuilds the Docker image)
2. After deploy, verify with Render Shell: `claude --version`
3. Re-auth if needed: `claude login`

## Emergency Procedures

### Service Down

1. Check Render Dashboard for deploy failures or crashes
2. Check logs for error messages
3. Try restarting the service from Render Dashboard
4. If persistent disk is corrupted, restore from backup

### Rollback

1. Revert the GitHub commit that caused the issue
2. Render will auto-deploy the reverted code
3. Or use Render's manual deploy to pick a specific commit

### Complete Recovery

1. Create a new Render service from the same repo
2. Attach a new persistent disk
3. Restore from the migration archive or latest backup
4. Re-authenticate Claude CLI
