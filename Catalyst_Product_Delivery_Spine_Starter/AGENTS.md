# Catalyst Agent Operating Contract

## 1. Scope isolation

Every task must resolve exactly one:

- `project_id`
- `feature_id`
- `task_type`

Default project for this repository: `catalyst`.

Never import facts, requirements, terminology, stakeholders, designs, or assumptions from another project unless the current feature packet explicitly lists the external source under `approved_cross_project_sources`.

If project or feature scope is ambiguous:

1. stop implementation;
2. record the ambiguity in the packet;
3. request a scope decision.

## 2. Source-of-truth order

Use evidence in this order:

1. current repository code and runtime;
2. database/schema/migrations;
3. automated tests;
4. approved decision records;
5. approved requirements;
6. implementation-ready feature packet;
7. referenced external documentation;
8. exploratory notes.

Exploratory notes are never implementation authority.

## 3. Required lifecycle

`exploring → candidate → approved → implementation-ready → in-progress → implemented → verified → released`

Codex may change code only for packets with:

```yaml
status: implementation-ready
dispatch: ready
```

## 4. Mandatory pre-implementation discovery

Before any code change, discover and cite:

- routes and navigation;
- feature flags;
- UI components and design tokens;
- services and APIs;
- database schema and migrations;
- permissions and roles;
- current runtime behavior;
- existing tests;
- known defects;
- adjacent regression surfaces.

Do not invent paths, tables, components, APIs, or behavior.

## 5. Blind-spot gate

Every cycle must evaluate:

- user/persona blind spots;
- permissions and data-isolation blind spots;
- empty/loading/error states;
- accessibility;
- Arabic/RTL and i18n;
- responsive behavior;
- auditability;
- migration and rollback;
- observability;
- security/privacy;
- performance;
- data integrity;
- failure recovery;
- regression risks;
- design-system consistency;
- operational ownership.

## 6. Design routing

Use repository-native canonical Catalyst components first.

Use Mobbin only for interaction-pattern research when:
- the packet requires external design research;
- repository discovery cannot answer the design question;
- the selected pattern is translated into Catalyst's existing design system.

Do not copy a screen blindly. Record:
- source pattern;
- problem it solves;
- Catalyst adaptation;
- accessibility impact;
- rejected alternatives.

Use Figma when editable design artifacts or precise handoff are required.
Use browser/runtime evidence when validating an implemented screen.

## 7. Completion contract

"Implemented" is not "verified."

A feature is verified only when all of the following exist:

- requirement-to-code traceability;
- automated test results;
- headless end-to-end evidence;
- screenshots for UI changes;
- accessibility result;
- regression result;
- known limitations;
- rollback or recovery note;
- independent certification outcome.

## 8. Change discipline

- Preserve working functionality.
- Prefer minimal coherent changes over broad rewrites.
- Do not alter unrelated modules.
- Use an isolated Git worktree for implementation.
- Keep commits atomic and reversible.
- Never push or deploy unless explicitly instructed.
