/**
 * Enforcement test: Category column is PERMANENTLY BANNED from AllProductsPage.
 * Source: CLAUDE.md "Banned integrations — Projects module" + design-critique 2026-05-21 P0.
 *
 * These are source-grep assertions — no DOM rendering required.
 * They fail immediately if the banned column is re-introduced.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../AllProductsPage.tsx');
const src = fs.readFileSync(SRC, 'utf8');

describe('AllProductsPage — banned column enforcement', () => {
  it('does not define a category column in PRODUCT_COLUMNS', () => {
    // The column key must not appear in the column definitions array
    expect(src).not.toMatch(/\{\s*key:\s*['"]category['"]/);
  });

  it('does not render a category <td> case in the row renderer', () => {
    // The switch-case for category cell rendering must be absent
    expect(src).not.toMatch(/case\s+['"]category['"]/);
  });

  it('does not reference Category in the column shape JSDoc', () => {
    // The JSDoc column enumeration must not list Category
    expect(src).not.toMatch(/col\s*\d+\s*—\s*Category/);
  });
});
