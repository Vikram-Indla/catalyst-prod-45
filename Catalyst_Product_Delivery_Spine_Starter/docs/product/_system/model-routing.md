# Model routing policy

## Default

Use **GPT-5.6 Sol in native Codex** for:
- repository discovery;
- implementation;
- terminal/tool-heavy work;
- multi-agent Codex orchestration;
- computer-use verification;
- worktree execution;
- final integration.

## Use Claude Fable 5 as a second engine for

- independent architecture critique;
- very large repository/document synthesis;
- adversarial requirement review;
- alternative implementation planning;
- long-running migration analysis;
- visual/design critique where a second model reduces correlated error.

## Do not make Fable the default inside Codex initially

A custom provider adds a gateway translation layer. That layer can lose:
- tool semantics;
- streaming behavior;
- approvals;
- retries;
- context compaction;
- subagent behavior;
- cost observability.

Run Fable natively in Claude Code first, against the same feature packet and worktree snapshot. Use its findings as review input, not as unverified truth.

## Recommended two-model pattern

1. Sol discovers and implements.
2. Fable independently reviews the packet, architecture, diff, and evidence.
3. Sol or a separate Codex certification agent verifies each finding.
4. Only evidence-backed findings become changes.

This exploits model diversity without creating two conflicting sources of truth.
