# Catalyst Product Delivery Spine — Starter Pack

This starter pack establishes a **local-first, project-isolated, specification-driven pipeline** for:

**ChatGPT exploration → approved decision → requirements → feature packet → Codex delivery → independent verification → Obsidian memory**

It is deliberately scoped to **Catalyst only**. It must not import context from TurnQy, MIM, Inspection, or any other project unless a human explicitly creates a cross-project link.

## What this pack does

- Creates a project and feature context boundary.
- Makes Obsidian read the same Markdown files that Work and Codex use.
- Separates exploration from approved requirements.
- Creates machine-readable feature packets.
- Prevents Codex from implementing unapproved ideas.
- Adds blind-spot discovery to every cycle.
- Adds a Folio pilot that begins with current-state discovery.
- Adds independent verification and evidence requirements.
- Defines model routing for GPT-5.6 Sol and Claude Fable 5.
- Includes validation scripts that require only Python 3.

## One-time installation

1. Place this pack at the root of the local Catalyst repository.
2. In the ChatGPT desktop app, open the Catalyst repository as a local folder.
3. Open `docs/product` as the Obsidian vault.
4. In Work mode, run `goals/00-bootstrap-ecosystem.md`.
5. In Codex mode, run `goals/01-folio-discovery-cycle.md`.

Do not run the implementation goal until the discovery packet has been reviewed and promoted to `implementation-ready`.

## Important boundary

This starter pack cannot inspect the Catalyst repository until it is executed inside the local Catalyst checkout. The current web conversation does not have direct access to the local filesystem.
