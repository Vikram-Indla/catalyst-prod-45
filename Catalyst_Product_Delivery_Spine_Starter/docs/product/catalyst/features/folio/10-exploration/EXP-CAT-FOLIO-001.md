---
id: EXP-CAT-FOLIO-001
project_id: catalyst
feature_id: folio
status: exploring
created: 2026-07-11
---

# Folio current-state and product-direction exploration

## Intent

Understand what Folio currently is in Catalyst, what users can do, where it overlaps with or differs from Notion, and what should be added, removed, or redesigned.

## Questions to answer from repository and runtime evidence

1. What routes, screens, services, schemas, permissions, and feature flags implement Folio?
2. Is Folio a document editor, knowledge base, workspace, database, wiki, canvas, or a combination?
3. What content types and relationships exist?
4. What is persisted versus mocked?
5. How does search, linking, permissions, versioning, comments, templates, and collaboration work?
6. What Catalyst modules consume or create Folio content?
7. What is the intended admin model?
8. What Notion-like capability would be inappropriate for Catalyst?
9. What Catalyst-native differentiators should Folio have?
10. What risks would a rewrite create?

## Mandatory blind spots

- content ownership and permissions;
- tenant/project/portfolio isolation;
- version history and recovery;
- search and retrieval quality;
- offline/concurrent editing;
- rich-text data model;
- attachments;
- audit trail;
- templates;
- structured data/database views;
- backlinks and knowledge graph;
- import/export;
- retention and deletion;
- Arabic/RTL;
- accessibility;
- mobile/responsive use;
- performance at scale;
- security and prompt injection if AI features exist;
- dependency on external Notion APIs;
- migration from existing Folio data.

## Current conclusion

No product conclusion is approved. Repository and runtime discovery must happen first.
