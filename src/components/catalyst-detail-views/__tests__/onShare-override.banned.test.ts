/**
 * Per-type CatalystView* — onShare override ban
 *
 * 2026-05-10 root-cause: all 8 per-type views (Defect, Epic, Task,
 * Incident, Feature, Subtask, Story, BusinessRequest v1) override
 * onShare with an inline handler that just copies
 * `window.location.href` — i.e. the page the modal was opened from
 * (hub URL), NOT the ticket URL.  This bypasses the canonical
 * CatalystViewBase.handleShare which constructs the proper ticket URL.
 *
 * Vikram defect: "When I click Share, it shows the hub URL but not
 * the ticket URL."
 *
 * Canonical contract: per-type views do NOT pass onShare. The
 * CatalystViewBase canonical handler is the single source of truth.
 * If a type genuinely needs custom share behaviour (e.g. v2 BR uses
 * permalink hook), it must construct the ticket URL — never copy
 * window.location.href directly.
 *
 * Static scan — fails if any per-type CatalystView* file contains the
 * banned `navigator.clipboard.writeText(window.location.href)` pattern.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const detailViewsRoot = resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === '__tests__' || entry === 'shared' || entry === 'improve') continue;
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (entry.startsWith('CatalystView') && entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

const perTypeFiles = walk(detailViewsRoot);

describe('CatalystView* — Share URL canonical parity', () => {
  it('no per-type view copies window.location.href as share URL', () => {
    const offenders: string[] = [];
    for (const f of perTypeFiles) {
      const src = readFileSync(f, 'utf-8');
      // Match the broken inline handler pattern. Allow constructed URLs
      // that reference window.location.origin (canonical ticket URL).
      if (src.match(/clipboard\.writeText\(window\.location\.href\)/)) {
        offenders.push(f.replace(detailViewsRoot + '/', ''));
      }
    }
    expect(
      offenders,
      'Per-type CatalystView* files must not pass an inline onShare that ' +
      'copies window.location.href. Either remove the onShare prop entirely ' +
      '(canonical CatalystViewBase.handleShare constructs the ticket URL), ' +
      'or build the canonical /project-hub/{projectKey}/issue/{itemKey} URL.\n' +
      'Offenders: ' + offenders.join(', '),
    ).toEqual([]);
  });
});
