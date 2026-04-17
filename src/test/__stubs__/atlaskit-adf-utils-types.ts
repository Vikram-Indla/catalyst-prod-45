/**
 * Test-only stub for @atlaskit/adf-utils/types.
 * Only the ADFEntity type is needed by source files; runtime export
 * is a no-op because types get stripped at compile time.
 */
export type ADFEntity = {
  version?: number;
  type?: string;
  text?: string;
  content?: ADFEntity[];
  [k: string]: unknown;
};

export default {};
