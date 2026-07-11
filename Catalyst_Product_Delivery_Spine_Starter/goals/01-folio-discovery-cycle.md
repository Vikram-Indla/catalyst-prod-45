# Goal: run the first Folio exploration-to-requirement cycle

Execute `FP-CAT-FOLIO-001` as discovery only.

## Required sequence

1. Confirm `project_id=catalyst` and `feature_id=folio`.
2. Read the project and feature manifests.
3. Read the exploration and discovery packet.
4. Discover repository, schema, permissions, runtime, tests, and current UI.
5. Capture evidence.
6. Write all required packet outputs.
7. Run the blind-spot gate.
8. Propose—not approve—future decisions and feature packets.
9. Run `python3 scripts/validate_spine.py`.
10. Produce a certification-style discovery verdict.

## Hard prohibitions

- no product implementation;
- no refactor;
- no schema change;
- no dependency upgrade;
- no invented route/table/component;
- no copying Notion or Mobbin screens;
- no claim without evidence.
