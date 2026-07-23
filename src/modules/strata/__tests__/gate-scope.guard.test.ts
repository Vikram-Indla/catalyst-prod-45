/**
 * Gate scope guard — CAT-STRATA-GATE-SCOPE-20260710-001.
 * Value Gates belong to the VMO domain (initiative | project_card | benefit)
 * only. Strategic Themes, Strategic Objectives, and OKRs must never be a
 * valid gate subject, in either the UI or the RPC/CHECK layer.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(__dirname, '../../../../supabase/migrations');
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
const corpus = files.map((f) => ({ f, sql: readFileSync(join(MIGRATIONS, f), 'utf8') }));

const STRATEGY_ROOM = join(__dirname, '../pages/StrataStrategyRoomPage.tsx');
const strategyRoomSrc = readFileSync(STRATEGY_ROOM, 'utf8');

describe('STRATA gate scope guards (CAT-STRATA-GATE-SCOPE-20260710-001)', () => {
  it('the last subject_type CHECK on strata_gate_instances excludes element/objective/okr', () => {
    const checkEdits = corpus
      .flatMap(({ f, sql }) => [...sql.matchAll(/strata_gate_instances_subject_type_check\s+CHECK\s*\(subject_type IN \(([^)]*)\)\)/g)]
        .map((m) => ({ f, list: m[1] })));
    expect(checkEdits.length).toBeGreaterThan(0);
    const last = checkEdits[checkEdits.length - 1];
    expect(last.list).toContain("'initiative'");
    expect(last.list).toContain("'project_card'");
    expect(last.list).toContain("'benefit'");
    expect(last.list).not.toContain("'element'");
    expect(last.list).not.toContain("'objective'");
    expect(last.list).not.toContain("'okr'");
  });

  it('strata_schedule_gate explicitly rejects element/objective/okr subjects with a domain error', () => {
    const correction = corpus.find((c) => c.f.includes('strata_gate_scope_correction'));
    expect(correction).toBeTruthy();
    expect(correction!.sql).toContain(
      "IF p_subject_type IN ('element', 'objective', 'okr') THEN",
    );
    expect(correction!.sql).toContain(
      'Value Gates cannot be scheduled against Strategic Themes, Strategic Objectives, or OKRs.',
    );
  });

  it('Strategy Room source no longer exposes Schedule Gate for any strategy element', () => {
    expect(strategyRoomSrc).not.toContain('GateScheduleModal');
    expect(strategyRoomSrc).not.toContain('schedule-gate');
    expect(strategyRoomSrc).not.toContain('Schedule gate');
  });

  it('Theme row actions still expose valid theme-only actions (no regression)', () => {
    expect(strategyRoomSrc).toContain("el.element_type === 'theme'");
    expect(strategyRoomSrc).toContain("key: 'charter', label: 'Charter'");
    expect(strategyRoomSrc).toContain("key: 'retire', label: 'Retire…'");
    // De-officialised (CAT-STRATA-EXECMODEL): direct element→KPI "KPI links" authoring was
    // removed in favour of Objective→approved OKR→reportable KR. The theme row menu must not
    // reintroduce it.
    expect(strategyRoomSrc).not.toContain("label: 'KPI links'");
  });
});
