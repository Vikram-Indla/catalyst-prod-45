/**
 * Test-only stub for @atlaskit/editor-core.
 *
 * Real editor is aliased in production; in vitest runs we only need
 * export shape so modules that import `Editor`/`EditorActions` can load.
 * The smoke test separately mocks AtlaskitEditor itself.
 */
import { vi } from 'vitest';

export const Editor = () => null;
export type EditorActions = { replaceDocument: (v: string) => void };

export default { Editor, __stub: true, vi };
