# Image Management & Canonical Rich Text Editor — Implementation Plan

## Task Brief
Build a canonical ADF-powered rich text editor with full image management (add link, alt text, resize, copy, delete) for ALL description and comment fields across every work item type in Catalyst.

---

## Architecture Analysis (Completed)

### Current State
- **TipTap v3.13.0** already installed with full extension suite (Image, Table, TaskList, Highlight, TextAlign, Underline, Link, Placeholder)
- **ADF format** is the canonical storage format with bidirectional TipTap<->ADF conversion (`adf-utils.ts`)
- **StoryRichTextEditor** exists but is scoped to story descriptions only, lacks image management popover
- **RichTextCommentEditor** uses raw `contentEditable` div (no TipTap) — basic HTML output, no ADF
- **CatalystDescriptionSection** is read-only — no inline editing capability
- **CatalystActivitySection** uses `RichTextCommentEditor` for comments — basic formatting only

### What Exists (Reusable)
1. `StoryRichTextEditor.tsx` — TipTap editor with ADF output, image upload, AI improve, drag handles
2. `adf-utils.ts` — Full TipTap<->ADF bidirectional conversion
3. `AdfDescriptionRenderer.tsx` — Read-only renderer with media resolution & lightbox
4. `RichTextCommentEditor.tsx` — ContentEditable-based comment editor with @mentions
5. Supabase storage bucket `attachments` with established upload paths
6. Image paste/drop ProseMirror plugin already built in StoryRichTextEditor

### What's Missing
1. **Image management popover** (the core ask from the screenshot): resize, alt text, add link, copy, delete
2. **Canonical reusable editor** — StoryRichTextEditor is tightly coupled to story context
3. **TipTap-based comment editor** — current one uses raw contentEditable (unreliable)
4. **Description editing in CatalystDescriptionSection** — currently read-only
5. **@mention support** in TipTap editor (only in ContentEditable comment editor)

---

## Implementation Plan

### Phase 1: Image Management Extension for TipTap
**Files to create:**
- `src/components/shared/rich-text/ImageManagementExtension.ts` — Custom TipTap extension with bubble menu
- `src/components/shared/rich-text/ImageBubbleMenu.tsx` — Popover UI matching the screenshot

**Approach:**
- Extend `@tiptap/extension-image` with additional attributes: `width`, `height`, `alt`, `href` (link wrapper)
- Build a BubbleMenu that appears when an image node is selected
- Menu options: Add link, Add alt text, Resize (small/medium/large/original), Copy, Delete
- Use TipTap's `BubbleMenu` component or NodeViewWrapper for positioning

### Phase 2: Canonical CatalystRichTextEditor Component
**Files to create:**
- `src/components/shared/rich-text/CatalystRichTextEditor.tsx` — Canonical editor
- `src/components/shared/rich-text/EditorToolbar.tsx` — Toolbar component (extracted from StoryRichTextEditor)
- `src/components/shared/rich-text/ImagePasteDropPlugin.ts` — Extracted paste/drop plugin
- `src/components/shared/rich-text/index.ts` — Barrel exports

**Approach:**
- Extract and generalize from StoryRichTextEditor
- Props: `content`, `onSave`, `placeholder`, `mode` (save|autosave|comment), `compact`, `workItemId`, `onAiImprove?`, `teamMembers?`
- Mode "comment" = compact toolbar, shorter min-height, @mention support
- Mode "save" = full toolbar with Save/Cancel buttons
- Mode "autosave" = full toolbar with debounced auto-save
- ADF JSON output for all modes (comments too)
- Includes ImageManagementExtension for all modes

### Phase 3: Integrate into CatalystDescriptionSection
**Files to modify:**
- `src/components/catalyst-detail-views/shared/sections/CatalystDescriptionSection.tsx`

**Approach:**
- Add click-to-edit: clicking empty placeholder or pencil icon enters edit mode
- Edit mode shows CatalystRichTextEditor with content pre-loaded from ADF
- Save calls `useCatalystIssueMutations` to update `description_adf_raw`
- Cancel reverts to read-only view
- Keep expand/collapse behavior

### Phase 4: Upgrade CatalystActivitySection Comments
**Files to modify:**
- `src/components/catalyst-detail-views/shared/sections/CatalystActivitySection.tsx`

**Approach:**
- Replace `RichTextCommentEditor` with `CatalystRichTextEditor` in comment mode
- Comments now save as ADF JSON in `ph_comments.body` (backward-compatible: existing HTML still renders)
- Edit mode uses same CatalystRichTextEditor
- Render comments: detect ADF vs HTML, render accordingly

### Phase 5: Build & Verify
- Build check: `npm run build` passes
- Verify: all 8 CatalystView* types show the new editor
- Verify: image management popover works (resize, alt text, link, copy, delete)
- Verify: no regressions in existing functionality

---

## File Touch List (Scoped)

### New Files
1. `src/components/shared/rich-text/CatalystRichTextEditor.tsx`
2. `src/components/shared/rich-text/ImageBubbleMenu.tsx`
3. `src/components/shared/rich-text/index.ts`

### Modified Files
4. `src/components/catalyst-detail-views/shared/sections/CatalystDescriptionSection.tsx`
5. `src/components/catalyst-detail-views/shared/sections/CatalystActivitySection.tsx`

### NOT Touching
- `StoryRichTextEditor.tsx` — leave as-is (legacy consumers still use it)
- `RichTextCommentEditor.tsx` — leave as-is (legacy consumers)
- `adf-utils.ts` — reuse as-is
- `AdfDescriptionRenderer.tsx` — reuse as-is
- No new npm dependencies
- No database schema changes

---

## Checklist
- [ ] Phase 1: ImageBubbleMenu with all 5 actions
- [ ] Phase 2: CatalystRichTextEditor canonical component
- [ ] Phase 3: Description section with inline editing
- [ ] Phase 4: Comments upgraded to TipTap + ADF
- [ ] Phase 5: Build passes, no regressions
