import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../../..');
const listSrc = readFileSync(resolve(repoRoot, 'src/pages/project-hub/filters/FiltersListPage.tsx'), 'utf8');
const detailSrc = readFileSync(resolve(repoRoot, 'src/pages/project-hub/filters/FilterDetailPage.tsx'), 'utf8');

describe('Filters directory row-click → detail (Phase D / G1)', () => {
  it('detailHref points at the read-only detail route (/filters/:id), not the builder', () => {
    expect(listSrc).toMatch(/\/project-hub\/\$\{projectKey\}\/filters\/\$\{f\.id\}/);
  });

  it('FiltersListPage no longer routes any row entry point to the builder (create?filterId)', () => {
    expect(listSrc).not.toMatch(/filters\/create\?filterId=\$\{f\.id\}/);
  });

  it('the directory still wires onRowClick to detailHref', () => {
    expect(listSrc).toMatch(/onRowClick=\{f\s*=>\s*navigate\(detailHref\(f\)\)\}/);
  });
});

describe('Filter detail explicit Edit → builder (Phase D / G1)', () => {
  it('detail page builds an editHref to the builder (create?filterId)', () => {
    expect(detailSrc).toMatch(/filters\/create\?filterId=\$\{filter\.id\}/);
  });

  it('the Edit filter action navigates to the builder, not an inline modal', () => {
    expect(detailSrc).toMatch(/navigate\(editHref\)/);
  });
});
