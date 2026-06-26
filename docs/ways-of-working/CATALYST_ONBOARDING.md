# Catalyst Operating System — Developer Onboarding

> Read this once after you clone the repo. It makes the `activate feature`
> command and the Catalyst operating contract work on your machine.

Everything in this operating system is **version-controlled in this repo**. When
you pull `main`, you already have the contract, the protocol, the Karpathy loop,
the discovery-agent definitions, and the scaffolding script. There is no personal
plugin to install.

---

## What you get on pull

| What | Where |
|---|---|
| Operating contract (the rules every session obeys) | [`CLAUDE.md`](../../CLAUDE.md) |
| `activate feature` / `continue feature` command | [`.claude/skills/catalyst-feature/SKILL.md`](../../.claude/skills/catalyst-feature/SKILL.md) |
| Activate / continue protocol (full) | [`CATALYST_ACTIVATE_CONTINUE_PROTOCOL.md`](CATALYST_ACTIVATE_CONTINUE_PROTOCOL.md) |
| Karpathy loop | [`CATALYST_KARPATHY_LOOP.md`](CATALYST_KARPATHY_LOOP.md) |
| Full operating system | [`CATALYST_OPERATING_SYSTEM.md`](CATALYST_OPERATING_SYSTEM.md) |
| Parallel discovery agents | [`CATALYST_PARALLEL_AGENTS.md`](CATALYST_PARALLEL_AGENTS.md) |
| Plan Lock template | [`CATALYST_PLAN_LOCK_TEMPLATE.md`](CATALYST_PLAN_LOCK_TEMPLATE.md) |
| Feature folder template | [`CATALYST_FEATURE_FOLDER_TEMPLATE.md`](CATALYST_FEATURE_FOLDER_TEMPLATE.md) |
| Scaffolding script | [`scripts/catalyst-feature.mjs`](../../scripts/catalyst-feature.mjs) |

`CLAUDE.md` is auto-loaded by Claude Code at the repo root, so the operating
contract is active in every session with no extra step.

---

## One-time setup

The scaffolding script writes feature folders to `~/catalyst/features/`. Symlink
that path to this repo so your feature folders are version-controlled with the
code (instead of landing loose in your home directory):

```bash
# from the repo root, once per machine
ln -s "$(pwd)" ~/catalyst
```

Verify Node is available (the script is plain Node, no deps):

```bash
node --version            # any recent LTS
node scripts/catalyst-feature.mjs list
```

---

## Daily use

**Start a new feature:**

```
activate feature <short name>
```

Claude will: run the start sequence → scaffold the Feature Work ID + folder →
spawn discovery agents in parallel → run the Karpathy loop → draft a Plan Lock →
**stop for your review before any code.**

**Resume an existing feature:**

```
continue feature CAT-<AREA>-<FEATURE>-<YYYYMMDD>-<###>
```

Don't know the ID? `node scripts/catalyst-feature.mjs list`.

---

## The rule that matters most

**No Feature Work ID + no feature folder = no implementation.** If anything is
ambiguous, the contract says **stop and ask** — it does not guess. See
[`CLAUDE.md`](../../CLAUDE.md) for the full precedence order and guardrails
(ADS tokens only, no hand-rolled UI, JiraTable rule, zero-assumption rendering,
explicit file staging).
