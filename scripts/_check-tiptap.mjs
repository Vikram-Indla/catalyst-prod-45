// Sentinel — asserts TipTap has been fully excised from the Catalyst
// src tree. Run:
//   node scripts/_check-tiptap.mjs
// Exits 1 if any forbidden TipTap symbol (import or named use) appears
// in any of the files below. Atlaskit (@atlaskit/editor-core +
// @atlaskit/renderer) is now the single canonical rich-text surface
// and must not share a runtime with TipTap — both libs register the
// same prosemirror Selection.jsonIDs (gapcursor, cell, …), which
// crashes the renderer with
// `RangeError: Duplicate use of selection JSON ID <id>`.
import fs from 'node:fs';

// Live surfaces that MUST stay TipTap-free — these are imported by
// the running app on real pages.
const LIVE = [
  'src/components/workhub/create-story/CreateStoryModal.tsx',
  'src/components/business-requests/BusinessRequestDetailModal.tsx',
  'src/components/knowledge-hub/editor/ConfluenceEditor.tsx',
  'src/components/knowledge-hub/editor/index.ts',
  'src/components/knowledge-hub/editor/EditorToolbar.tsx',
  'src/components/knowledge-hub/editor/MacroExtensions.tsx',
  'src/pages/KnowledgeHubDocumentPage.tsx',
  'src/components/knowledge-hub/CreateDocumentDialog.tsx',
];

// Orphaned / neutered surfaces — no live importers, but we still
// guard them so nobody silently brings @tiptap back into the tree by
// reviving these files.
const ORPHAN = [
  'src/components/shared/rich-text/index.ts',
  'src/components/shared/rich-text/CatalystRichTextEditor.tsx',
  'src/components/shared/rich-text/StoryRichTextEditor.tsx',
  'src/components/shared/rich-text/ImageBubbleMenu.tsx',
  'src/modules/project-work-hub/components/dialogs/CreateStoryDialog.tsx',
];

// Names that would re-enable a TipTap attack surface. Each is matched
// on non-comment source lines only (leading `//` ignored).
const FORBIDDEN = [
  'useEditor',
  'EditorContent',
  'StarterKit',
  'TipTapLink',
  "from '@tiptap/",
  'from "@tiptap/',
  'StoryRichTextEditor',
  'CatalystRichTextEditor',
];

let ok = true;

function scan(f) {
  const src = fs.readFileSync(f, 'utf8');
  // Skip matches where the filename IS the forbidden identifier —
  // the neutered stub files still declare `export const X = ...` to
  // keep the named-export shape stable; this is intentional.
  const basename = f.split('/').pop() ?? '';
  for (const kw of FORBIDDEN) {
    if (basename.startsWith(`${kw}.`)) continue;
    const hits = src.split('\n')
      .map((l, i) => ({ i: i + 1, l }))
      .filter(x => x.l.includes(kw) && x.l.trim().slice(0, 2) !== '//' && !x.l.trim().startsWith('*'));
    if (hits.length) {
      ok = false;
      console.log('FORBIDDEN', JSON.stringify(kw), 'in', f, '@', hits.map(x => x.i).join(','));
    }
  }
}

for (const f of LIVE) scan(f);
for (const f of ORPHAN) scan(f);

console.log(ok ? 'CLEAN' : 'DIRTY');
process.exit(ok ? 0 : 1);
