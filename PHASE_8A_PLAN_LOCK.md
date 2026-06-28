# PHASE 8a: Chat + Backlog Typography — Plan Lock

**Feature Work ID:** CAT-ADS-TYPOGRAPHY-20260628-001  
**Slice:** 8a (Chat + Backlog)  
**Date:** June 28, 2026  
**Status:** Plan Lock Ready for Execution

---

## OBJECTIVE

Replace 156 hard-coded fontSize values with ADS tokens in Chat (83) + Backlog (73) components.  
All inline `style={{ fontSize: 12 }}` → `style={{ fontSize: 'var(--ds-font-size-200)' }}`

**Done when:**
- 156 violations → 0 violations
- No fontSize hardcoding remains in chat-v2 or backlog files
- Audit gate passes (zero new violations)
- Screenshots validated (light + dark mode; mobile 320–375px)

---

## SCOPE

### In Scope (156 violations, ~39 files)
**Chat-v2 (83 violations, 25 files):**
- Activity/* (6 files): ActivityHeader, ActivityHoverStrip, ActivityMoreMenu, ActivityPanel, ActivityRow, RemindMeSubmenu, ReminderModal
- Attachments/* (4 files): AttachmentList, ComposerAttachmentChip, DropzoneOverlay, UploadProgressBanner
- Composer/* (5 files): Composer, ComposerEditor, ComposerFooter, ComposerMentions, ComposerSyntaxHighlighter
- Messages/* (4 files): MessageContent, MessageMetadata, MessageActions, MessageReactionsPicker
- Shell, Sidebar, SearchResults, CommandPalette, EmojiPicker (5 files)

**Backlog (73 violations, 14 files):**
- BacklogBreadcrumb.tsx
- PHBacklogView.tsx
- DeliveryBacklog.tsx
- +11 other backlog-related components (estimated)

### Out of Scope
- Admin pages (Phase 8c)
- Other feature areas (Phases 8d–8f)
- Tests, stories, storybook
- Dormant modules (Phase 8g, defer)

---

## FILES TO MODIFY

**Phase 8a Batch 1 (10 files, ~60 violations, estimated 2–3 hours):**
1. `src/features/chat-v2/ChatV2Shell.tsx`
2. `src/features/chat-v2/components/Activity/ActivityHeader.tsx`
3. `src/features/chat-v2/components/Activity/ActivityPanel.tsx`
4. `src/features/chat-v2/components/Composer/Composer.tsx`
5. `src/features/chat-v2/components/Composer/ComposerEditor.tsx`
6. `src/features/chat-v2/components/Messages/MessageContent.tsx` (if exists)
7. `src/features/chat-v2/ChatSidebar.tsx`
8. `src/components/BacklogBreadcrumb.tsx`
9. `src/components/project-hub/sdlc/PHBacklogView.tsx`
10. `src/components/resources/ai-intelligence/DeliveryBacklog.tsx`

**Phase 8a Batch 2 (remaining 25–30 files, ~96 violations, estimated 3–4 hours):**
- All other chat-v2 components
- Remaining backlog files

---

## CANONICAL COMPONENTS & RULES

**Typography Token Mapping (Phase 8a scope):**

| From | To | Use Case |
|------|----|----|
| `fontSize: 10` | `'var(--ds-font-size-50)'` | Captions |
| `fontSize: 11` | `'var(--ds-font-size-100)'` | Small labels |
| `fontSize: 12` | `'var(--ds-font-size-200)'` | Chat timestamps, hints |
| `fontSize: 13` | `'var(--ds-font-size-300)'` | Secondary text |
| `fontSize: 14` | `'var(--ds-font-size-400)'` | **MOST COMMON** — body text, message content |
| `fontSize: 16` | `'var(--ds-font-size-500)'` | Small heading |
| `fontSize: 18` | `'var(--ds-font-size-600)'` | Medium heading |

**Pattern (All violations follow this):**
```tsx
// BEFORE
style={{ fontSize: 12, color: 'var(--ds-text)', ... }}

// AFTER
style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)', ... }}
```

**No custom colors, no Tailwind utilities.** Only inline style fontSize replacements.

---

## VALIDATION & ACCEPTANCE

### Screenshot Checklist
- [ ] Light mode (default)
- [ ] Dark mode (theme switch)
- [ ] Mobile viewport (320px)
- [ ] Tablet viewport (768px)
- [ ] Message readability (text hierarchy preserved)
- [ ] Composer input (font size legible)
- [ ] Activity panel (metadata readable)
- [ ] Backlog breadcrumb (labels aligned)

### Lint & Build Validation
- [ ] `npm run audit:ads` — Typography violations 156→0
- [ ] `npm run audit:ads:gate` — No new violations (gate passes)
- [ ] `npm run test` — All tests pass
- [ ] `npm run build` — No TypeScript errors

### Commit Gate
- [ ] Feature Work ID confirmed (CAT-ADS-TYPOGRAPHY-20260628-001)
- [ ] Session log written
- [ ] Plan Lock approved (this document)
- [ ] Screenshots captured (light + dark, mobile)
- [ ] Raw validation output (audit gate, test results)
- [ ] File list exact and staged
- [ ] Commit message: "fix(ads): typography tokens in chat + backlog (Phase 8a, 156→0 violations)"

---

## FORBIDDEN

❌ No hand-rolled color overrides  
❌ No Tailwind color utilities (bg-blue-50, text-gray-500, etc.)  
❌ No bare hex colors  
❌ No inline comments beyond necessary escape hatches  
❌ No refactoring beyond token replacement (single-responsibility: typography only)  
❌ No `git add -A` (explicit file staging only)  

---

## STOP CONDITIONS

**If any of these occur, STOP and raise:**
1. Dark mode rendering breaks (typography doesn't scale with surface hierarchy)
2. Mobile viewport <320px has overflow or illegible text
3. New violations introduced (gate fails)
4. Tests fail (regression detected)
5. File changes exceed scope (more than 10% diff outside phase files)

---

## NEXT STEPS

1. Execute Phase 8a Batch 1 (10 files, 2–3 hours)
2. Validate: screenshots + audit gate
3. If passing: commit batch 1
4. Execute Phase 8a Batch 2 (remaining files, 3–4 hours)
5. Final validation: 156→0 violations
6. Commit Phase 8a complete
7. → Begin Phase 8b (Project Hub + Shared)

---

**Approved for execution.**
