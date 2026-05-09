# claude-skills

Shared Claude Code skills: `jira-compare`, `design-intelligence`, and `preflight`.

## Install on a new machine

```bash
git clone https://github.com/Vikram-Indla/claude-skills.git /tmp/claude-skills && bash /tmp/claude-skills/install.sh
```

### What gets installed

| Skill | Installs to |
|---|---|
| `jira-compare` | `~/.claude/skills/jira-compare/` |
| `design-intelligence` | `~/.claude/skills/design-intelligence/` |
| `preflight` (plugin) | `~/.claude/plugins/preflight/` |

After install, restart Claude Code. The skills appear as `/jira-compare`, `/design-intelligence`, and `/preflight` in the Skill tool.

## Update an existing install

```bash
cd /tmp/claude-skills && git pull && bash install.sh
```

To force-reinstall a skill, remove the existing directory first:

```bash
rm -rf ~/.claude/skills/jira-compare && bash /tmp/claude-skills/install.sh
```
