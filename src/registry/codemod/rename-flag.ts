/**
 * codemod-rename-flag — pure source-string transform used by the component
 * registry codemod pipeline to rename a single feature-flag prop key inside
 * a `useComponentConfig(componentId, { ... })` call.
 *
 * See src/registry/__tests__/codemod-rename-flag.test.ts for the locked
 * contract this implements.
 *
 * Implementation note: rather than reprinting the whole AST (which can
 * subtly reformat untouched source), this walks the TypeScript compiler
 * API's AST purely to *locate* the exact character spans that need to
 * change, then splices those spans directly into the original source
 * string. When nothing matches, the original string is returned as-is —
 * guaranteeing byte-identical output for the no-op case and, by extension,
 * idempotency (a second pass over already-renamed source finds no more
 * matches for `oldFlagName`).
 */
import * as ts from 'typescript';

export interface RenameTransformOptions {
  sourceCode: string;
  componentId: string;
  oldFlagName: string;
  newFlagName: string;
}

interface TextEdit {
  start: number;
  end: number;
  text: string;
}

export function applyRenameTransform(options: RenameTransformOptions): string {
  const { sourceCode, componentId, oldFlagName, newFlagName } = options;

  const sourceFile = ts.createSourceFile(
    'codemod-consumer.tsx',
    sourceCode,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );

  const edits: TextEdit[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'useComponentConfig'
    ) {
      const [componentIdArg, configArg] = node.arguments;

      const matchesComponent =
        componentIdArg !== undefined &&
        ts.isStringLiteralLike(componentIdArg) &&
        componentIdArg.text === componentId;

      if (matchesComponent && configArg && ts.isObjectLiteralExpression(configArg)) {
        for (const prop of configArg.properties) {
          if (
            ts.isPropertyAssignment(prop) &&
            ts.isIdentifier(prop.name) &&
            prop.name.text === oldFlagName
          ) {
            // Rename the key only — the value expression is left untouched.
            edits.push({
              start: prop.name.getStart(sourceFile),
              end: prop.name.getEnd(),
              text: newFlagName,
            });
          } else if (ts.isShorthandPropertyAssignment(prop) && prop.name.text === oldFlagName) {
            // Shorthand `{ oldFlagName }` → explicit `{ newFlagName: newFlagName }`.
            // (Re-pointing the value at the renamed identifier — rather than
            // preserving a now-orphaned reference to the old name — keeps
            // the old flag name from surviving anywhere in this property.)
            edits.push({
              start: prop.getStart(sourceFile),
              end: prop.getEnd(),
              text: `${newFlagName}: ${newFlagName}`,
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (edits.length === 0) return sourceCode;

  // Apply from the end of the file backwards so earlier edits' offsets stay valid.
  edits.sort((a, b) => b.start - a.start);

  let result = sourceCode;
  for (const edit of edits) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  return result;
}
