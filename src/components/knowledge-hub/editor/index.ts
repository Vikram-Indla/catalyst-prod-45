// 2026-04-20 — EditorToolbar + MacroExtensions exports REMOVED along with
// the underlying TipTap dependencies. The new Atlaskit-powered
// ConfluenceEditor ships its own primary toolbar and treats
// information / warning / note / expand as first-class ADF `panel` /
// `expand` nodes — no custom TipTap node-view shims required.
export { ConfluenceEditor } from './ConfluenceEditor';
