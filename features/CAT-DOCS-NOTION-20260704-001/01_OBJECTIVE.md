# Objective — CAT-DOCS-NOTION-20260704-001

## What
"Catalyst Pages" — a Notion-class documentation system:
1. **Editor**: block-based rich text editor with the Notion 20%-that-matters: slash command menu, headings, toggles, callouts, quotes, code blocks, tables, columns, images/embeds, markdown shortcuts, drag-handle block reordering, @-mentions (people + work items + pages), page icon/cover.
2. **Structure**: Confluence-style space per project/product — nested page tree in a Docs hub, breadcrumbs, drag-to-reorganize, templates (BRD, tech spec, meeting notes).
3. **Attachment**: any page can be linked to any work item type (epic, story, task, bug, incident, test, risk, idea) and appears in that item's detail modal; backlinks from page → items.
4. **Interop**: markdown export at minimum; versioning/autosave.

## Why
BRDs and technical documentation currently live outside Catalyst (Notion/Confluence). Bringing them in gives work-item-native docs and lets Caty/AI reason over them.

## Done means (planning phase)
Plan Lock approved defining: editor library decision with evidence, block storage schema, spaces/page-tree schema, work-item attachment schema, routes+slugs, canonical component mapping, phased slice plan (each ≤2h), acceptance criteria.

## Non-scope (planning phase)
- No code, no migrations, no packages installed.
- Real-time multi-cursor collaboration is design-for-later (schema must not preclude Yjs), not in first slices.
- Notion databases/views are OUT of v1 (Catalyst already has tables/boards for structured data).
