# Claude Local Adapter on Render

## How claude_local Works

The `claude_local` adapter spawns Claude CLI (`claude` binary) as a child process for each agent run:

```
paperclipai server
  └── agent heartbeat triggers
       └── spawns: claude --print - --output-format stream-json --verbose [--resume <sessionId>] ...
            └── reads prompt from stdin
            └── streams JSON output to stdout
```

### Key Dependencies

| Dependency | Purpose | Render Solution |
|-----------|---------|-----------------|
| `claude` binary | Invoked via `child_process` spawn | Installed globally via `npm install -g @anthropic-ai/claude-code` |
| `~/.claude/.credentials.json` | OAuth token for subscription auth | Persisted at `/data/claude-config/.credentials.json` |
| `CLAUDE_CONFIG_DIR` env var | Tells Claude CLI where to find config | Set to `/data/claude-config` |
| `HOME` | Claude CLI uses `os.homedir()` for default config | Set to `/data/home` |
| Agent `cwd` | Working directory for each agent run | Created under `/data/paperclip/instances/default/workspaces/` |
| Session persistence | Claude sessions can be resumed across runs | Session IDs stored in Paperclip DB, Claude's session data in `~/.claude/` |

### Billing Type

The adapter auto-detects billing type:
- If `ANTHROPIC_API_KEY` is set → uses API billing
- Otherwise → uses **subscription** billing via OAuth token

Your setup uses subscription billing (Claude Max 5x plan).

## Authentication on Render

### One-Time Bootstrap

After first deploy, open Render Shell and run:

```bash
claude login
```

This opens an OAuth flow. You'll get a URL to authorize in your browser.
After auth, the credentials are saved to `/data/claude-config/.credentials.json`.

**This persists across restarts** because `/data` is a persistent disk.

### Token Refresh

Claude CLI tokens have expiration dates. The adapter's `readClaudeToken()` function
reads from `.credentials.json`. If the token expires:

1. Agent runs will fail with `claude_auth_required` error code
2. You'll need to re-run `claude login` in Render Shell
3. The OAuth refresh token may auto-renew — monitor for failures

### Monitoring Auth Status

From Render Shell:
```bash
claude auth status
```

Expected output:
```json
{
  "loggedIn": true,
  "authMethod": "oauth_token",
  "apiProvider": "firstParty"
}
```

## Session Management

- Each agent run can resume a previous Claude session via `--resume <sessionId>`
- Session IDs are stored in the Paperclip database
- If a session becomes invalid, the adapter retries with a fresh session
- Sessions are tied to `cwd` — changing an agent's workspace invalidates the session

## Limitations on Render

1. **No interactive terminal**: `claude login` requires a one-time manual step via Render Shell
2. **Token expiry**: OAuth tokens expire; monitor and re-auth when needed
3. **Single instance**: Only one Paperclip instance can use the same Claude session
4. **Cold starts**: After a deploy/restart, the first agent run may be slower as Claude CLI initializes

## Fallback: API Key Billing

If subscription auth proves unreliable on Render, you can switch individual agents
to API billing by setting `ANTHROPIC_API_KEY` in the agent's env config.
This costs more but eliminates the OAuth dependency.
