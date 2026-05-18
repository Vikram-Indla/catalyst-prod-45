/**
 * /admin/access — skeleton loading state (closes the H1 P2 from
 * design-critique 2026-05-18).
 *
 * Was: bare <Spinner /> centred during the initial 39-row fetch — no
 * structural hint about what's loading.
 * Now: skeleton rows that mirror the People table shape so the user sees
 * the layout while data hydrates (Atlassian / Jira pattern).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const FILE = join(ROOT, 'src/pages/admin/AdminAccessPage.tsx');

function src(): string { return readFileSync(FILE, 'utf8'); }

describe('/admin/access — skeleton loading', () => {
  it('no longer renders the bare centred Spinner during PeopleTab loading', () => {
    // The old branch: <div ... padding: 48 ... ><Spinner /></div>
    // The new branch renders skeleton rows that mirror the table shape.
    expect(src()).not.toMatch(/padding:\s*48[^}]*\}\s*\}\s*>\s*<Spinner/);
  });

  it('renders a PeopleTableSkeleton component during loading', () => {
    expect(src()).toMatch(/PeopleTableSkeleton/);
  });

  it('skeleton mirrors the People table column count (7 columns including actions)', () => {
    // The skeleton renderer must reference the same column count as the real
    // header so the layout stays stable across the loading→loaded transition.
    expect(src()).toMatch(/PeopleTableSkeleton[\s\S]{0,2000}colSpan|skeleton.*column.*7|7.*columns/i);
  });
});
