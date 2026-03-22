# Sesame

Agent-readable authenticator. Like Authy or Google Authenticator, but built for AI agents.

## What is this?

Sesame stores your TOTP secrets and generates 2FA codes. You manage accounts through a desktop app. Your agents grab codes through a CLI or local API.

## Architecture

- **Desktop App** (Electron + React): Add accounts, scan QR codes, view live codes
- **CLI** (`sesame get <account>`): Agents call this to grab codes
- **Local API** (`GET http://127.0.0.1:7327/codes/:account`): REST endpoint for programmatic access
- **Encrypted Storage**: AES-256-GCM, master password required to unlock

## Security

- All secrets encrypted at rest with AES-256-GCM
- Key derived via PBKDF2 (100k iterations, SHA-512)
- API binds to `127.0.0.1` only (never exposed to network)
- Optional Bearer token for API authentication
- Audit log tracks every code request (who asked, when)
- Master password never stored, only used to derive the encryption key
- Vault and config stored in `~/.sesame/` with restricted file permissions

## Install

```bash
# From source
git clone https://github.com/lacymorrow/sesame.git
cd sesame
pnpm install
pnpm cli:build

# Link CLI globally
pnpm link --global
```

## CLI Usage

```bash
# Add a new account
sesame add github --secret JBSWY3DPEHPK3PXP --issuer GitHub

# Add from otpauth:// URI
sesame add gitlab --uri "otpauth://totp/GitLab:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitLab"

# Get current code (interactive)
sesame get github
# 482931  (18s remaining)

# Get code without remaining time (agent-friendly)
sesame get github --raw
# 482931

# List accounts
sesame list

# Remove an account
sesame remove github

# Start API server
sesame serve

# Configure port and API token
sesame config --port 7327 --token my-secret-token
```

## Non-Interactive Mode (for Agents)

Set `SESAME_PASSWORD` to skip the master password prompt:

```bash
export SESAME_PASSWORD="your-master-password"

# Now agents can grab codes without interaction
CODE=$(sesame get github --raw)
```

## API Usage

Start the server with `sesame serve`, then:

```bash
# Health check
curl http://127.0.0.1:7327/health
# {"status":"ok","version":"0.1.0"}

# Get code for an account
curl http://127.0.0.1:7327/codes/github
# {"code":"482931","remaining":18}

# List all accounts
curl http://127.0.0.1:7327/accounts
# [{"name":"github","issuer":"GitHub","created_at":"..."}]

# With bearer token (if configured)
curl -H "Authorization: Bearer my-secret-token" http://127.0.0.1:7327/codes/github
```

## Desktop App

```bash
pnpm dev    # Development mode
pnpm start  # Production preview
```

The desktop app provides:
- Master password unlock screen
- Live dashboard with countdown timers for all accounts
- Click-to-copy TOTP codes
- Add accounts manually or via otpauth:// URI
- API server management (start/stop, port config)
- System tray with quick access

## Tech Stack

- Electron 36 + React 19 + TypeScript
- electron-vite for builds
- shadcn/ui + Tailwind CSS v4
- otplib for TOTP generation
- sql.js for local storage (WASM SQLite, no native deps)
- Fastify for local API server
- Commander for CLI

## Data Storage

All data lives in `~/.sesame/`:
- `vault.db` - Encrypted account secrets (SQLite via sql.js)
- `config.json` - Port, salt, API token hash

## License

MIT
