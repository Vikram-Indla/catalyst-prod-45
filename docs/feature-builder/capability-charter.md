# Catalyst Feature Finder & Builder — Capability Charter

**Version:** 1.0
**Date:** 2026-06-26
**Inspired by:** Karpathy AutoResearch (https://github.com/karpathy/autoresearch)

---

## What This Is

A reusable, feature-agnostic capability for building any Catalyst feature correctly.

It is not a Test Hub tool. It is not a test management tool. It is not a one-time script.

It is a repeatable operating model that any Catalyst feature must pass through before implementation starts.

---

## Why This Exists

Three failure modes are permanent in Catalyst build history:

**Failure 1 — Rebuild what exists**
Built `CatalystJiraListView` (1,300 LOC) only to find `JiraTable` already existed with more features. Session wasted, component deleted same day. (2026-05-19)

**Failure 2 — Build without discovery**
`BrSidebarDetails` / `BrListPanel` reimplemented surfaces using raw `@atlaskit/select` instead of `CatalystSidebarDetails`. Produced 18 parity defects. (2026-06-01)

**Failure 3 — Rush into first use case before generic capability exists**
Test Hub experiments started before the Catalyst Feature Builder capability was formalized. Resulted in Test Hub-specific tooling that could not be reused for any other feature.

This capability is the structural fix for all three.

---

## Karpathy AutoResearch Mapping

Karpathy's AutoResearch:
- `program.md` = human intent file (goal + constraints)
- `train.py` = single file to modify per experiment
- `results.tsv` = evidence log (gitignored)
- `val_bpb` = single metric to optimize
- Loop = modify → run → measure → keep/discard → log → repeat
- Budget = fixed 5 minutes per run
- Rule = "simpler is better, all else equal"

Catalyst Feature Builder adaptation:
- `feature-program.md` = human intent file (goal + constraints)
- bounded experiment files = 1-3 files max per experiment
- `experiment-log.tsv` = evidence log (gitignored)
- quality scorecard = 4-dimension metric (ADS, parity, functional, reuse)
- Loop = discover → design → build slice → validate → score → keep/revise/reject → log → repeat
- Budget = single bounded slice per experiment
- Rule = "mount canonical component > extend > build new; simpler is better"

---

## Core Principles (Mandatory)

1. **Catalyst-native first**
No new design language, no arbitrary components, no global theme edits. ADS tokens, Atlaskit primitives, existing Catalyst canonical components.

2. **Discover before build**
Always inspect existing Catalyst patterns before any implementation. Grep, read, map. Only then design.

3. **Research before design**
If external benchmark/domain research is required, document it before proposing any target design. Design without research is guessing.

4. **Bounded edit surface**
Every experiment defines allowed files and forbidden files before any code is written. Experiments that touch undeclared files are invalid.

5. **Evidence over confidence**
Every experiment produces validation evidence: TypeScript errors, ADS violations count, acceptance criteria pass rate, screenshot paths.

6. **Screenshot required for UI**
UI experiments require screenshot notes or screenshot file paths before a keep decision is valid.

7. **Human gate**
No commit and no merge without JK/Aiden approval. The capability can produce evidence and recommendations, but humans make the ship decision.

8. **Reusable capability**
Nothing in the scripts or templates is hardcoded to any feature. Feature-specific data lives in `docs/feature-builder/features/<slug>/`.

---

## What This Is NOT

- Not a Test Hub tool
- Not a replacement for CLAUDE.md guardrails (those remain P0 mandatory)
- Not a replacement for `jira-compare` or `design-critique` (those are still required for shipped UI)
- Not an automatic ship pipeline
- Not a way to bypass human approval gates

---

## Scope

**In scope:** Any Catalyst feature across any module — Test Hub, Admin, Product Hub, Project Hub, Release Dashboard, Strategy Room, Risk, Roadmap, or any future module.

**Out of scope:** Infrastructure changes, Supabase migrations (those go through CLAUDE.md), edge function rewrites unrelated to a feature build.

---

## Success Definition

A feature built with this capability has:
- Evidence that existing Catalyst patterns were checked before building
- Evidence that external benchmark was researched (if applicable)
- Gap analysis documenting what is built vs what the benchmark has
- Quality scorecard composite ≥ 80 for shipped experiments
- Zero P0 violations (ADS, typed domain fallbacks, etc.)
- Human approval recorded before merge
