# How Claude Gets These Skills

## 1. Native Claude Code skills

These are skills created directly inside this repo.

Path:

`.claude/skills/start/SKILL.md`

This is how `/start` exists.

The `/start` skill is not downloaded from RTK, Caveman, or any other repo. It is our custom orchestrator.

## 2. Native Claude Code subagents

These are specialist agents created directly inside this repo.

Path:

`.claude/agents/`

Examples:
- repo-context-agent
- code-graph-agent
- token-efficiency-agent
- tool-output-agent
- memory-guardrail-agent
- ui-dom-probe-agent
- implementation-planner-agent
- safety-change-control-agent

These agents are wrappers/instructions. They do not automatically install external repos.

## 3. External repo-backed capabilities

These come from GitHub repos.

They must be cloned, installed, or configured separately.

Registered repos:
- RTK: https://github.com/rtk-ai/rtk.git
- Caveman: https://github.com/JuliusBrussee/caveman.git
- Claude Context: https://github.com/zilliztech/claude-context.git
- Code Review Graph: https://github.com/tirth8205/code-review-graph.git
- Token Savior: https://github.com/Mibayy/token-savior.git
- Context Mode: https://github.com/mksglu/context-mode.git
- Memsearch: https://github.com/zilliztech/memsearch.git

## 4. What `/start` should do

When `/start` recommends a capability, it must say whether it is:

- Native skill/agent available locally.
- External repo cloned locally.
- External CLI/MCP installed.
- Not available yet.

## 5. What happens if a repo is not cloned or installed?

Claude must not pretend it can use it.

It should say:

"Capability not installed. I will use the native fallback."

Examples:
- If RTK is unavailable, use targeted terminal commands and summarize output manually.
- If Claude Context is unavailable, use Grep/Glob/Read.
- If Code Review Graph is unavailable, manually trace imports/consumers.
- If Token Savior is unavailable, use targeted symbol searches.
- If Context Mode is unavailable, manually summarize large outputs.
- If Memsearch is unavailable, read local guardrail docs.
- If Caveman is unavailable, use concise writing style manually.

## 6. What `proceed` should report

At the end of every `proceed`, the Benefit Report must say:

- Capability selected.
- Availability status.
- Used as real tool or native fallback.
- Benefit delivered.
- Whether exact token metrics were available.
