# Token Optimization Stack — team setup

Catalyst ships two token-optimization tools, wired into the repo's
`.claude/settings.json` so every developer gets the savings once the
binaries are installed.

| Tool | Cuts | How it's wired | Savings |
|---|---|---|---|
| **RTK** (Rust Token Killer) | **input** — compresses Bash command output before it hits the context window | `PreToolUse` hook → `.claude/hooks/rtk-optimize.sh` | 60–90% on dev ops |
| **Caveman** | **output** — strips filler from Claude's prose | Claude Code plugin (`enabledPlugins` + `extraKnownMarketplaces`) | ~65% on responses |

## Safe by design
Both are **no-ops until installed** — pulling this repo never breaks a
session:
- `rtk-optimize.sh` exits 0 if `rtk` isn't on PATH → the Bash call runs
  unmodified.
- The caveman plugin only activates after you approve its marketplace.

So an unconfigured teammate loses the savings, never the session.

## One-time install (per machine)
```bash
bash .claude/scripts/setup-token-optimization.sh
```
Or manually:
```bash
brew install rtk && rtk init          # RTK
# Caveman: reload Claude Code in this repo, approve the "caveman"
# marketplace prompt (declared in .claude/settings.json). Fallback:
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash
```
Then reload Claude Code.

## Verify
```bash
rtk gain        # RTK compression stats
rtk --version   # confirm binary
```
In chat, `/caveman` toggles caveman; the statusline shows its level.

## Trust note
RTK's `PreToolUse` hook runs `rtk hook claude` on every Bash call (only
when rtk is installed). RTK is a local binary that rewrites command
output — review it before installing if your security policy requires it.
The hook itself (`.claude/hooks/rtk-optimize.sh`) is plain shell you can
audit in this repo.
