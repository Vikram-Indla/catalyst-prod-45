/**
 * Release hub filters wiring (Phase G8). Source-grep guardrails mirroring the
 * incident/tasks wrappers + a real assertion on the visibility sentinel map.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hubTypeToProjectKey } from '@/lib/filters/filterVisibility';

const root = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

describe('release hub — filter visibility', () => {
  it("maps the 'release' hub to the RELEASES sentinel projectKey", () => {
    expect(hubTypeToProjectKey('release', undefined)).toBe('RELEASES');
  });
});

describe('release hub — canonical trio mounts via thin wrappers', () => {
  it('ReleaseFiltersListPage passes hubType="release"', () => {
    expect(read('src/pages/releasehub/ReleaseFiltersListPage.tsx')).toMatch(/hubType="release"/);
  });
  it('ReleaseFilterPreviewPage passes mode="release"', () => {
    expect(read('src/pages/releasehub/ReleaseFilterPreviewPage.tsx')).toMatch(/mode="release"/);
  });
  it('ReleaseFilterDetailPage passes mode="release"', () => {
    expect(read('src/pages/releasehub/ReleaseFilterDetailPage.tsx')).toMatch(/mode="release"/);
  });
});

describe('release hub — trio unions include release', () => {
  it('FiltersListPage HubType union', () => {
    expect(read('src/pages/project-hub/filters/FiltersListPage.tsx')).toMatch(/HubType =[^;]*'release'/);
  });
  it('FilterPreviewPage + FilterDetailPage mode unions', () => {
    expect(read('src/pages/project-hub/filters/FilterPreviewPage.tsx')).toMatch(/mode\?:[^;]*'release'/);
    expect(read('src/pages/project-hub/filters/FilterDetailPage.tsx')).toMatch(/mode\?:[^;]*'release'/);
  });
});

describe('release hub — routes + nav', () => {
  it('FullAppRoutes registers the 3 release filter routes before :releaseId', () => {
    const src = read('src/routes/FullAppRoutes.tsx');
    expect(src).toMatch(/path="\/release-hub\/filters"/);
    expect(src).toMatch(/path="\/release-hub\/filters\/create"/);
    expect(src).toMatch(/path="\/release-hub\/filters\/:filterId"/);
    // ordering: filters routes must appear before the :releaseId catch
    expect(src.indexOf('/release-hub/filters"')).toBeLessThan(src.indexOf('/release-hub/:releaseId'));
  });
  it('ReleaseHubSidebar has a Filters nav item', () => {
    expect(read('src/components/layout/ReleaseHubSidebar.tsx')).toMatch(/id: 'filters'.*\/release-hub\/filters/);
  });
});
