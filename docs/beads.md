# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Installation

### NPM Installation (Recommended)

The beads CLI is available as an npm package:

```bash
npm install -g @beads/bd
```

**Known Issues**: Some environments (particularly cloud VMs with network restrictions) may encounter download failures during the postinstall script:

```
Error installing bd: getaddrinfo EAI_AGAIN github.com
```

If this occurs, use the Go installation method below.

### Go Installation (Fallback)

If npm installation fails due to network restrictions:

```bash
go install github.com/steveyegge/beads/cmd/bd@latest
export PATH="$PATH:$HOME/go/bin"
bd version
```

### SessionStart Hook (Claude Code for Web)

For automatic installation in Claude Code cloud environments, create `.claude/hooks/session-start.sh`:

```bash
#!/bin/bash
echo "Installing bd (beads issue tracker)..."

# Try npm first
npm install -g @beads/bd 2>/dev/null

# Fallback to Go if npm fails
if ! command -v bd &> /dev/null; then
  echo "npm install failed, trying Go..."
  go install github.com/steveyegge/beads/cmd/bd@latest
  export PATH="$PATH:$HOME/go/bin"
fi

# Initialize if needed
if [ ! -d .beads ]; then
  bd init --quiet
fi

echo "✓ bd is ready! Use 'bd ready' to see available work."
```

Make executable: `chmod +x .claude/hooks/session-start.sh`

**Network Requirements**: The SessionStart hook requires access to:
- `registry.npmjs.org` (for npm packages)
- `github.com` (for binary downloads)
- `pkg.go.dev` / `proxy.golang.org` (for Go packages)

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

