/**
 * Admin sidebar single-chevron contract.
 *
 * Background — design-critique 2026-05-17, score 18/30 (HALT). Admin was the
 * only module rendering a SECOND sidebar-collapse chevron inside its own
 * header, in addition to the global one in CatalystHeader. That violated
 * H2 (real-world match), H3 (user control — admin could never be fully
 * hidden), and H4 (consistency — every other hub sidebar is a controlled
 * component driven by `cycleSidebarState`).
 *
 * This file pins the fix so the duplicate chevron cannot regress:
 *   1. AdminSidebarV2 must not import chevron-left/right glyphs for sidebar
 *      collapse purposes.
 *   2. AdminSidebarV2 must not maintain local expand state — it must be a
 *      controlled component that consumes `expanded` from its props, like
 *      every other hub sidebar (ProjectHubSidebar, ProductHubSidebar, etc.).
 *   3. CatalystShell must not carve admin out of the global
 *      `sidebarVisuallyOpen` width gate.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const ADMIN_SIDEBAR = join(ROOT, 'src/components/admin/AdminSidebarV2.tsx');
const CATALYST_SHELL = join(ROOT, 'src/components/layout/CatalystShell.tsx');

describe('Admin sidebar — single-chevron contract', () => {
  it('AdminSidebarV2 must not import ChevronLeft/Right glyphs (no local collapse chevron)', () => {
    const src = readFileSync(ADMIN_SIDEBAR, 'utf8');
    expect(src).not.toMatch(/from\s+['"]@atlaskit\/icon\/glyph\/chevron-left['"]/);
    expect(src).not.toMatch(/from\s+['"]@atlaskit\/icon\/glyph\/chevron-right['"]/);
  });

  it('AdminSidebarV2 must not maintain local sidebar expand state', () => {
    const src = readFileSync(ADMIN_SIDEBAR, 'utf8');
    // The shadow `useState(initialExpanded)` was the root cause — it let the
    // local chevron flip width independently of the global cycleSidebarState.
    expect(src).not.toMatch(/useState\s*\(\s*initialExpanded\s*\)/);
    // No prop renamed to `initialExpanded` either — the contract is `expanded`.
    expect(src).not.toMatch(/initialExpanded\s*[:,]/);
  });

  it('AdminSidebarV2 must not render a sidebar-collapse button (aria-label Collapse/Expand sidebar)', () => {
    const src = readFileSync(ADMIN_SIDEBAR, 'utf8');
    // The local chevron used aria-label "Collapse sidebar" / "Expand sidebar".
    // The ONLY component allowed to use these labels is CatalystHeader.
    expect(src).not.toMatch(/aria-label\s*=\s*\{[^}]*['"]Collapse sidebar['"]/);
    expect(src).not.toMatch(/aria-label\s*=\s*\{[^}]*['"]Expand sidebar['"]/);
  });

  it('CatalystShell must not carve admin out of the global sidebarVisuallyOpen width gate', () => {
    const src = readFileSync(CATALYST_SHELL, 'utf8');
    expect(src).not.toMatch(/!isAdminRoute\s*&&\s*sidebarVisuallyOpen/);
  });

  it('CatalystShell must not branch on isAdminRoute when mounting the sidebar (admin goes through renderSidebar like every other hub)', () => {
    const src = readFileSync(CATALYST_SHELL, 'utf8');
    // The wrapper used to ternary on isAdminRoute to mount AdminSidebarV2
    // directly, bypassing the renderSidebar() pipeline. After the fix, admin
    // is just another case inside renderSidebar() — no special-case JSX.
    expect(src).not.toMatch(/isAdminRoute\s*\?\s*\(\s*\n[\s\S]*?<AdminSidebarV2/);
  });
});
