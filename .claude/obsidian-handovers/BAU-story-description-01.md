---
branch: BAU-story-description-01
branch_id: 01
project: BAU
menu: detail
component: description
status: planning_complete
progress: 0
phase: ready_for_execution
created: 2026-05-28T00:00:00Z
last_saved: 2026-05-28T00:00:00Z
saved_by: claude-code
estimated_completion: TBD
---

# BAU-story-description-01 — Handover

> **STATUS:** Planning complete. Zero code written. Ready for execution in a NEW conversation per the Planning/Execution Split rule in CLAUDE.md.

## Task

Build a new Tiptap-based `Description` component for the Story ticket type to replace the current Atlaskit-editor-based `CatalystDescriptionSection` (which ships a ~2MB editor chunk and makes the app feel slow).

**Scope of v1:** Mount the new component ONLY when `issue.issue_type === 'Story'`. Every other type continues to use the existing `CatalystDescriptionSection` untouched. If the Product Owner approves the new editor, a follow-up branch will make it canonical across all types.

## Why Tiptap (not Atlaskit, not Lexical, not Slate)

- Tiptap is ProseMirror under the hood — **same engine Atlaskit's editor uses**, so ADF ↔ Tiptap JSON is a structural mapping, not a semantic one.
- Ship ~150-200KB gzipped instead of ~2MB.
- Already in the team's component library memory (`@catylast/rich-editor` is Tiptap-based).
- Tradeoff accepted: we own the ADF round-trip (every node we support becomes a Tiptap extension we write and maintain).

## Reuse from existing infrastructure (DO NOT rebuild)

Reading `src/components/catalyst-detail-views/shared/sections/CatalystDescriptionSection.tsx` revealed the following — all of these stay as-is and the new editor wires into them:

| Asset | Path / Symbol | Role |
|---|---|---|
| Storage column | `ph_issues.description_adf` (ADF JSON), fallback `description_text` | Read + write target. No schema change. |
| Empty check | `isAdfEmpty()` from `@/components/shared/rich-text/atlaskit/adfHelpers` | Drives placeholder vs content view |
| Plain projection | `adfToPlainText()` from same module | Suspense fallback / placeholder |
| AI improve store | `useCatyImprove` from `@/components/catalyst-detail-views/improve/catyImproveStore` | Toolbar magic wand dispatches `startCatyImprove({...})` identically to right-rail Improve dropdown |
| AI streaming overlay | `CatyStreamingOverlay` from same folder | Renders dim-original + character-by-character stream on top of editor body |
| Markdown → ADF | `catyMarkdownToAdf()` defined inline in `CatalystDescriptionSection.tsx` lines 71-163 | Copy/import this — handles `## heading`, `- bullet`, `1. ordered`, paragraphs. No inline marks. Good enough for Caty v1. |
| Inline image upload | Supabase `description-images` bucket → `ph_attachments` row insert via the `handleInlineAttachmentUploaded` pattern in lines 787-808 | Body↔rail binding for Attachments panel |
| Mention chip CSS | `span[data-mention-id]` rule already in the v34 style block | Theme-safe, works as-is |
| Image lightbox | `openImagePreview()` from `@/lib/openImagePreview` | Already wired globally via document-level click listener |

## Storage contract (locked)

```ts
// Read
const adfSource = issue?.description_adf ?? issue?.description_text ?? null;

// Write
await supabase
  .from('ph_issues')
  .update({ description_adf: parsedAdfDoc })
  .eq('issue_key', issue.issue_key);
```

The Caty AI apply path also writes `acceptance_criteria` when Caty produces a separate AC block — see lines 739-765 of the existing component.

## Architecture (locked)

```
src/components/catalyst-detail-views/shared/sections/Description/
  Description.tsx                    # entry, manages display/edit mode toggle
  index.ts                           # barrel export
  _components/
    DisplayView/
      DisplayView.tsx                # read-mode (reuse AdfLightRenderer + EpicDescriptionRenderer tier)
    EditorView/
      EditorView.tsx                 # mounts Tiptap instance
      extensions/                    # one folder per ADF node we support
        Paragraph/
        Heading/                     # H1-H6
        Bold/
        Italic/
        Underline/
        Strike/
        Code/                        # inline code
        Subscript/
        Superscript/
        SmallText/                   # CUSTOM mark — no ADF round-trip (degrades to paragraph on Jira sync)
        BulletList/
        OrderedList/
        TaskList/                    # checkboxes
        Link/
        CodeBlock/                   # ``` triggered or via toolbar
        Image/                       # inline image with upload
        Mention/                     # @ trigger
        Emoji/                       # : trigger (Unicode in v1)
        TextColor/                   # color mark
    Toolbar/
      Toolbar.tsx                    # bubble menu shell (always-visible on focus, not bubble-on-selection)
      buttons/
        ImproveButton.tsx            # magic wand → startCatyImprove
        TextStylesDropdown.tsx       # T / Ts / H1-H6 — dynamic label based on cursor position
        BoldButton.tsx
        InlineFormattingDropdown.tsx # chevron — Bold/Italic/Underline/Strike/Code/Sub/Sup
        BulletListButton.tsx
        ListsDropdown.tsx            # chevron — Bullet/Numbered/Task
        TextColorPicker.tsx
        ImageUploadButton.tsx
        CodeSnippetButton.tsx
        EmojiButton.tsx
        InsertElementButton.tsx      # + button → / palette
        LinkButton.tsx
        UndoButton.tsx
        RedoButton.tsx
        HistoryButton.tsx            # ALWAYS DISABLED in v1
    SlashMenu/
      SlashMenu.tsx                  # inline dropdown when user types /
      ViewMoreModal/
        ViewMoreModal.tsx            # 5-tab modal: All / Ask Caty / Confluence Content / External Content / Development
        tabs/
          AllTab.tsx
          AskCatyTab.tsx             # the only tab with real content in v1
          ConfluenceContentTab.tsx   # "Coming soon" empty state
          ExternalContentTab.tsx     # "Coming soon" empty state
          DevelopmentTab.tsx         # "Coming soon" empty state
    MentionPicker/
      MentionPicker.tsx              # inline @-typeahead — reuse existing mention data source
    EmojiPicker/
      EmojiPicker.tsx                # inline :-typeahead + dropdown panel
      data/unicodeEmojis.ts          # categorized Unicode emoji set
    StreamingOverlay/
      StreamingOverlay.tsx           # thin wrapper around existing CatyStreamingOverlay
  hooks/
    useTiptapEditor.ts               # configures Tiptap with all extensions + keymap
    useAdfTransform.ts               # ADF ↔ Tiptap JSON (memoized)
    useAutoSave.ts                   # debounced save on blur
    useCatyToolbarImprove.ts         # toolbar magic wand → useCatyImprove bridge
    useFrequentlyUsedEmojis.ts       # localStorage-backed
  utils/
    adfToTiptap.ts                   # ADF JSON → Tiptap JSON
    tiptapToAdf.ts                   # Tiptap JSON → ADF JSON
    keyboardShortcuts.ts             # central keymap registration
    placeholderText.ts
    slashCommands.ts                 # registry of insert-element items
```

## Toolbar spec (locked — 15 controls)

| # | Control | Tooltip | Shortcut | Behavior |
|---|---|---|---|---|
| 1 | Improve description | "Improve description" | — | Magic-wand icon. Calls `startCatyImprove({ issueKey, issueType, issueSummary, currentDescription, currentAcceptanceCriteria, attachmentUrls, improveSubType: 'improve_clarify' })`. Body overlays with `CatyStreamingOverlay` — original text muted, stream renders char-by-char. Same payload shape as right-rail Improve dropdown. |
| 2 | Text Styles dropdown | "Text Styles" | (per option) | Trigger label is dynamic: **T** for paragraph, **Ts** (subscript s) for Small Text, **H1-H6** (subscript number) for heading levels. Dropdown options: Normal text `Ctrl+Alt+0`, Heading 1 `Ctrl+Alt+1`, … Heading 6 `Ctrl+Alt+6`, Small text. |
| 3 | Bold | "Bold" | `Ctrl+B` | |
| 4 | Inline formatting chevron | (none) | — | Dropdown row layout: `[icon] [name] ......... [shortcut]`. Items: Bold `Ctrl+B`, Italic `Ctrl+I`, Underline `Ctrl+U`, Strikethrough `Ctrl+Shift+S`, Code `Ctrl+Shift+M`, Subscript `Ctrl+,`, Superscript `Ctrl+.`. |
| 5 | Bullet list | "Bullet list" | `Ctrl+Shift+8` | |
| 6 | Lists chevron | "Lists" | — | Dropdown: Bullet list `Ctrl+Shift+8`, Numbered list `Ctrl+Shift+7`, Task list `Ctrl+Shift+9` (with checkbox glyph). |
| 7 | Text color | "Text Color Ctrl+Alt+C" | `Ctrl+Alt+C` | A-with-color icon. Dropdown of swatches (matches Jira's palette in `Screenshot 2026-05-28 154136.png`) + "Remove Color" button. Remove button disabled when no text selected OR selected text has no color OR color is black/white. |
| 8 | Image upload | "Insert image" | — | Opens file picker. Uploads via existing `description-images` bucket + `ph_attachments` insert. |
| 9 | Code snippet | "Code snippet ```" | type ``` × 3 | Inserts code block. |
| 10 | Emoji | "Emoji :" | type `:` | Opens emoji panel: search input auto-focused, categories, frequently used row at top. Inline `:` trigger inside the editor opens the same panel anchored at the caret (like @-mention). |
| 11 | Insert Element | "Insert Element /" | type `/` | + icon. Opens inline slash menu: search auto-focused, element list, fixed "... View more" button at bottom. View More → 5-tab modal (All / Ask Caty / Confluence Content / External Content / Development). Last 3 tabs render "Coming soon" empty state in v1. **`/ai` typed inline highlights the "Ask Caty" option** (with Caty icon — repurposed from the Jira Rovo equivalent in `Screenshot 2026-05-28 160812.png`). |
| 12 | Link | "Link Ctrl+K" | `Ctrl+K` | |
| 13 | Undo | "Undo Ctrl+Z" | `Ctrl+Z` | |
| 14 | Redo | "Redo Ctrl+Y" | `Ctrl+Y` | |
| 15 | History | "View Changes Ctrl+Alt+Z" | `Ctrl+Alt+Z` | **DISABLED in v1.** No revisions table yet. Will enable in v2 when `ph_issue_description_revisions` is added. |

## Inline trigger characters

| Character | Behavior |
|---|---|
| `@` | Mention picker (reuse existing mention data hook from current editor) |
| `:` | Emoji picker (Unicode set in v1) |
| `/` | Insert element / slash menu (with "Ask Caty" as first item; `/ai` highlights it) |
| ` ``` ` × 3 | Inserts code block |

## Placeholder (locked)

When the description is empty:

> `Type /ai to Ask Caty or @ to mention and notify someone`

## Five questions — settled

| # | Question | Answer |
|---|---|---|
| 1 | History storage? | Disabled in v1. Build `ph_issue_description_revisions` table in v2. |
| 2 | Confluence / External / Development tabs in View More modal? | Tabs exist but render "Coming soon" empty state in v1. |
| 3 | Emoji set? | Standard Unicode emoji set with categorized picker (search, categories, frequently used). Atlassian-style emojis later. |
| 4 | Small text mark? | Custom Tiptap mark. Does NOT round-trip to Jira ADF — degrades to plain paragraph when synced. Acceptable for v1. |
| 5 | Caty backend? | Reuse `useCatyImprove` store + `CatyStreamingOverlay`. Toolbar magic wand and right-rail Improve dispatch identical payload. No new endpoint. |

## Open items deferred to v2 / later branches

- `ph_issue_description_revisions` table + History panel
- Confluence Content tab — Confluence API integration
- External Content tab — link unfurling service
- Development tab — repo / PR lookup integration
- Atlassian-style custom emoji set
- Making the new editor canonical (replaces `CatalystDescriptionSection` for all 9 work-item types) — gated on Product Owner approval after v1 lands

## Risks

1. **ADF round-trip coverage gaps.** Any ADF node currently in production data that we forget to map in `adfToTiptap` / `tiptapToAdf` = silent data loss on save. Mitigation: round-trip unit test that loads every distinct ADF node currently in `ph_issues.description_adf` (production sample) and asserts byte-identical re-serialization.
2. **Bundle size creep.** Tiptap is small but undisciplined extension imports balloon fast. Mitigation: budget = 250KB gzipped for the new tree (vs Atlaskit's 2MB). Measure at every milestone with `vite build --report`.
3. **Small Text mark Jira sync degradation.** Acknowledged tradeoff. Small Text content will appear as paragraph on Jira side. Add a docstring on the extension + a comment in the Tiptap → ADF adapter so this is visible.
4. **Tiptap version drift vs ProseMirror.** Pin Tiptap and pm-* peer deps; do not rely on automatic resolution given catalyst-prod-45's known Atlaskit dep-hell (per user memory).

## Sequential execution chunks (recommended order)

The next conversation should work through these in order. Each chunk should end with a user-visible smoke test before moving to the next.

1. Create branch `BAU-story-description-01` (per On-Demand Branch Creation rule)
2. Scaffold `Description/` folder + barrel + empty component stubs
3. Install Tiptap + extensions (`@tiptap/react`, `@tiptap/starter-kit`, etc.) — measure bundle delta
4. Build ADF ↔ Tiptap JSON adapters (`adfToTiptap.ts`, `tiptapToAdf.ts`) WITH round-trip unit tests using production ADF samples
5. Build `EditorView` shell with paragraph + heading + bold + italic only — smoke test
6. Wire read/write to `ph_issues.description_adf`
7. Mount `Description.tsx` in `CatalystViewStory.tsx` behind `if (issue.issue_type === 'Story')` gate
8. Build Toolbar shell — empty container, then add buttons incrementally:
   - 8a. Improve button + wire to `useCatyImprove`
   - 8b. Text Styles dropdown (T / Ts / H1-H6)
   - 8c. Bold + Inline Formatting chevron
   - 8d. Bullet list + Lists chevron
   - 8e. Text Color picker
   - 8f. Image upload + reuse `ph_attachments` pipeline
   - 8g. Code snippet button + ``` × 3 input rule
   - 8h. Link button
   - 8i. Undo / Redo
   - 8j. History (disabled stub)
9. `@` Mention picker — reuse existing mention data source
10. `:` Emoji picker — Unicode set + categories + frequently-used (localStorage)
11. `/` Slash menu + View More modal (with 4 "Coming soon" tabs)
12. `/ai` → Ask Caty highlighting in slash menu
13. Placeholder text wiring
14. Full keyboard shortcuts pass — verify every Ctrl combo in the toolbar table works
15. Bubble toolbar polish: spacing, transitions, focus management
16. Visual QA against Jira at `http://localhost:8080/project-hub/BAU/backlog` → open any Story
17. Design-audit pass: `node design-governance/cli/index.js audit src/components/catalyst-detail-views/shared/sections/Description/`
18. Hand to PO for review

## Resume point — for next conversation

**Step 1 in the new conversation:**

```bash
# Verify clean working tree, then create the feature branch:
git status
git switch --create BAU-story-description-01
git branch --show-current   # expect: BAU-story-description-01
```

**Step 2:**

Read this entire handover file: `.claude/obsidian-handovers/BAU-story-description-01.md`

**Step 3:**

Re-read `CatalystDescriptionSection.tsx` (the canonical source for the reused data layer + AI pipeline patterns) at `src/components/catalyst-detail-views/shared/sections/CatalystDescriptionSection.tsx`.

**Step 4:**

Locate the Story view file (likely `src/components/catalyst-detail-views/CatalystViewStory.tsx`) and identify where `CatalystDescriptionSection` is mounted — that's the swap point.

**Step 5:**

Begin execution chunk 1 (scaffold the `Description/` folder).

## Process rules in force (from CLAUDE.md — DO NOT SKIP)

- **Planning/Execution split (P0):** This was the planning conversation. The next chat is for execution only. No more planning Q&A in the execution chat.
- **On-demand branch creation:** Create `BAU-story-description-01` as the first action in the execution chat.
- **User commits all changes themselves.** After a verified-working flow, claude suggests a one-line commit message; the user runs the commit.
- **TDD cycle non-negotiable:** Write the failing test first. The ADF↔Tiptap adapters are the highest-value place to apply this.
- **Small steps:** After every single logical change — stop, explain, suggest commit message, await confirmation.
- **Design-system guardrail:** Only `@atlaskit/*` primitives (where used at all) + `var(--ds-*)` tokens + 4/8/16/24/32 spacing grid + sentence-case labels. The Tiptap toolbar is custom but must use ADS tokens for all colors/borders/spacing.
- **No banned fields/components:** Never render Story Points, MDT Ref, Assessment Feature, Service Now#. Not relevant to this scope but stated for completeness.
- **Context guards:** At 70% context print a WARNING block and finish current chunk. At 90% invoke `/obsidian save` immediately and stop.

## Related references

- Current editor: `src/components/catalyst-detail-views/shared/sections/CatalystDescriptionSection.tsx`
- AI improve store: `src/components/catalyst-detail-views/improve/catyImproveStore.ts`
- AI streaming overlay: `src/components/catalyst-detail-views/improve/CatyStreamingOverlay.tsx`
- ADF helpers: `src/components/shared/rich-text/atlaskit/adfHelpers.ts`
- Inline image upload pattern: `CatalystDescriptionSection.tsx` lines 787-808
- Markdown → ADF helper: `CatalystDescriptionSection.tsx` lines 71-163 (copy or import)
- CLAUDE.md sections: § 2026-05-18 (on-demand branch), § 2026-05-21 (planning/execution split), § Design System Guardrail

---

*Auto-generated by `/obsidian save BAU-story-description-01` on 2026-05-28*
