# Catalyst Skills — GitHub-hosted

This folder is a portable bundle of Claude skills that live alongside the
Catalyst codebase so any Claude instance (Claude Code, Cowork, Agent SDK)
can fetch and load them straight from GitHub.

Repo: https://github.com/Vikram-Indla/catalyst-prod-45
Folder: `skills/`

## Layout

```
skills/
  CLAUDE.md            # Project-wide ways-of-working (rules every Claude run must follow)
  jira-compare/
    SKILL.md           # Parity audit loop: Catalyst surface vs Jira (3-lane PROBE→DIFF→PLAN→PATCH→RE-PROBE)
    assets/            # Supporting assets used by the skill
    references/        # Reference docs the skill cites
  mega/
    SKILL.md           # Unified Obscura probe + LLM Council + Idea Fencing for high-stakes feature decisions
  llm-council/
    SKILL.md           # 5-advisor council with anonymous peer review and synthesized verdict (Karpathy-style)
  README.md            # This file
```

## How Claude loads these from GitHub

There are three common patterns. Pick whichever matches your runtime.

### 1. Clone the repo locally and point Claude at the folder

```bash
git clone https://github.com/Vikram-Indla/catalyst-prod-45.git
# Skills now live at ./catalyst-prod-45/skills
```

For Claude Code, drop a symlink (or copy) into your skills directory:

```bash
ln -s "$PWD/catalyst-prod-45/skills/jira-compare"  ~/.claude/skills/jira-compare
ln -s "$PWD/catalyst-prod-45/skills/mega"          ~/.claude/skills/mega
ln -s "$PWD/catalyst-prod-45/skills/llm-council"   ~/.claude/skills/llm-council
```

### 2. Fetch a single SKILL.md by raw URL

Claude can `web_fetch` (or `curl`) the raw content directly:

- `https://raw.githubusercontent.com/Vikram-Indla/catalyst-prod-45/main/skills/jira-compare/SKILL.md`
- `https://raw.githubusercontent.com/Vikram-Indla/catalyst-prod-45/main/skills/mega/SKILL.md`
- `https://raw.githubusercontent.com/Vikram-Indla/catalyst-prod-45/main/skills/llm-council/SKILL.md`
- `https://raw.githubusercontent.com/Vikram-Indla/catalyst-prod-45/main/skills/CLAUDE.md`

Useful for quick experiments or for letting Claude pull a skill on demand
inside a session that doesn't already have it installed.

### 3. Pin to a commit/tag for reproducibility

Replace `main` in any raw URL with a commit SHA or tag, e.g.
`https://raw.githubusercontent.com/Vikram-Indla/catalyst-prod-45/<sha>/skills/mega/SKILL.md`.

## Skill summaries

- **jira-compare** — Parity audit comparing a Catalyst surface (localhost:8080/8081) against Jira. Three logical lanes (Chrome MCP, Atlassian MCP, Computer Use) gated into PROBE → DIFF → PLAN → PATCH → RE-PROBE, with CRUD on a canonical entity as the acceptance test. Hard cap of 5 cycles per surface.

- **mega** — Unified skill that combines live data probing (Obscura), multi-advisor council deliberation, and Idea Fencing output. Use for grounded analysis of complex feature decisions.

- **llm-council** — Run any decision through a council of 5 AI advisors who independently analyze it, peer-review each other anonymously, and synthesize a final verdict. Based on Karpathy's LLM Council methodology.

## CLAUDE.md

The included `CLAUDE.md` is the project's ways-of-working contract. Any Claude
instance operating on Catalyst (or invoking these skills) should read it first
— it sets non-negotiable rules around Atlaskit-only scope, Jira as source of
truth, and the prompt-block / monitor-block / lessons-append discipline.

## Updating

These skills are mirrored from the local `~/.claude/skills/` source of
truth. To refresh:

```bash
cp ~/.claude/skills/jira-compare/SKILL.md  skills/jira-compare/SKILL.md
cp ~/.claude/skills/mega/SKILL.md          skills/mega/SKILL.md
cp ~/.claude/skills/llm-council/SKILL.md   skills/llm-council/SKILL.md
cp CLAUDE.md                               skills/CLAUDE.md
git add skills/ && git commit -m "skills: refresh from local source" && git push
```
