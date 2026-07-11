# Goal: bootstrap the Catalyst product-delivery ecosystem

Work only inside the currently opened local Catalyst repository.

## Outcome

Install and validate a local-first product-delivery spine connecting:
- ChatGPT Work;
- Codex;
- Obsidian;
- feature packets;
- Git worktrees;
- headless tests;
- independent certification.

## Rules

1. Read `README-FIRST.md` and `AGENTS.md`.
2. Discover the repository before modifying existing configuration.
3. Do not overwrite an existing instruction, skill, test, or docs structure blindly.
4. Reconcile this starter pack with the existing repository.
5. Keep Catalyst isolated from unrelated projects.
6. Run `python3 scripts/validate_spine.py`.
7. Create a setup report at:
   `docs/product/catalyst/50-implementation/ecosystem-setup-report.md`
8. The report must list:
   - files installed or reconciled;
   - existing conflicts;
   - available local tools;
   - missing prerequisites;
   - Obsidian vault path;
   - Codex model availability;
   - test frameworks discovered;
   - MCP/plugin inventory;
   - security risks;
   - exact next command for the Folio pilot.

Do not implement Folio.
