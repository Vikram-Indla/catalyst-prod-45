import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src/modules/strata');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

describe('STRATA five-engine closure integration guards', () => {
  it('never scopes Strategic KPI Assignment authoring to an OKR Theme', () => {
    const kr = read('pages/StrataKrDetailPage.tsx');
    const okr = read('pages/StrataOkrDetailPage.tsx');

    expect(kr).not.toMatch(/objective_id\s*\?\?\s*okr\?\.theme_id/);
    expect(kr).not.toContain('okrThemeId');
    expect(kr).toContain('element=${objectiveId}');
    expect(kr).toContain('&objective=${objectiveId}');
    expect(kr).toContain('&kr=${kr.id}');
    expect(okr).not.toMatch(/objective_id\s*\?\?\s*okr\.theme_id/);
    expect(okr).toContain('element=${okr.objective_id}');
    expect(okr).toContain('&objective=${okr.objective_id}');
    expect(okr).toContain('&okr=${okr.id}');
  });

  it('visibly parks assignment authoring when Objective ownership is missing', () => {
    expect(read('pages/StrataKrDetailPage.tsx')).toContain("OKR has no Strategic Objective");
    expect(read('pages/StrataOkrDetailPage.tsx')).toContain('Assignment unavailable · no Strategic Objective');
  });

  it('keeps slim governance card options out of the full Execution card cache', () => {
    const governance = read('components/kpiGovernanceSections.tsx');
    const hooks = read('hooks/useStrata.tsx');

    expect(governance).toContain("['strata', 'kpi-governance', 'project-card-options']");
    expect(governance).not.toMatch(/queryKey:\s*\['strata',\s*'project-cards'\]/);
    expect(hooks).toContain("queryKey: ['strata', 'project-cards']");
    expect(hooks).toContain('queryFn: executionApi.projectCards');
  });

  it('uses Objective-owned OKR authoring copy', () => {
    const library = read('pages/StrataKpiLibraryPage.tsx');
    expect(library).toContain('Add OKR on an Objective');
    expect(library).not.toContain('Add OKR on a Theme');
  });
});
