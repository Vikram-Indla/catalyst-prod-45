# External Repo Install Policy

## Important

The `/start` skill itself is a Claude Code project skill.

The external GitHub repos are not automatically available just because their URLs are written in the skill.

Claude can use them only if one of these is true:

1. The repo has been cloned locally under `.claude/vendor/`.
2. The repo's CLI/MCP/tool has been installed.
3. The repo's skill instructions have been reviewed and copied/registered into `.claude/skills/`.
4. The repo is only being used as a documented reference, not as an executable capability.

## Why not auto-install?

Do not auto-install or auto-clone from `/start` because external repos can contain executable code, hooks, MCP servers, scripts, or instructions that affect the local environment.

Installation requires explicit user approval.

## Approved local vendor path

All external repos should be cloned under:

`.claude/vendor/`

## Read-only rule

Treat `.claude/vendor/` as read-only reference material unless the user explicitly asks to modify or install from those repos.

## Skill registration rule

If an external repo contains its own Claude skill:

1. Inspect the repo first.
2. Identify the skill folder.
3. Review the `SKILL.md`.
4. Copy into `.claude/skills/<skill-name>/` only after user approval.
5. Do not blindly overwrite local skills.

## MCP registration rule

If an external repo provides MCP:

1. Read its official setup instructions.
2. Identify required environment variables, credentials, and commands.
3. Ask for user approval before configuring.
4. Never invent credentials.
5. Never silently modify global Claude settings.

## CLI registration rule

If an external repo provides CLI tooling:

1. Check whether the CLI is already installed.
2. If not installed, report missing.
3. Ask before installing.
4. After installation, run a safe version/status command only.
