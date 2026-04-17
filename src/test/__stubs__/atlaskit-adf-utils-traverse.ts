/**
 * Test-only stub for @atlaskit/adf-utils/traverse.
 *
 * Minimal implementation sufficient for src/utils/adf.ts to run in
 * vitest environments where the real @atlaskit packages are not
 * available. Visits every node depth-first and invokes the matching
 * handler by node.type (plus a catch-all 'text' handler for text runs).
 */
interface AdfNode {
  type?: string;
  text?: string;
  content?: AdfNode[];
}

type Visitors = Record<string, (node: AdfNode) => void>;

export function traverse(node: AdfNode, visitors: Visitors): void {
  if (!node) return;
  const handler = node.type ? visitors[node.type] : undefined;
  if (handler) handler(node);
  if (Array.isArray(node.content)) {
    for (const child of node.content) traverse(child, visitors);
  }
}

export default { traverse };
