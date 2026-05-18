/**
 * CascadeImpactPanel — version-bump consumer audit list.
 *
 * Authored: 2026-05-17 (preflight Step 10).
 *
 * The mechanism Q3 of the preflight locked in:
 *   "Registry version bump + consumer audit list."
 *
 * Flow:
 *   1. Engineer picks a registry component about to change
 *   2. Panel shows current version + "what kind of change?" (patch/minor/major)
 *   3. Lists every consumer file (grouped by module path) with a checkbox
 *   4. Engineer ticks off each consumer as reviewed
 *   5. "Copy markdown checklist" → paste into the PR description
 *   6. When all checked, the safe-to-merge indicator turns green
 *
 * v1 is intentionally read-only (no persistence, no codegen). v2 may add:
 *   - ts-morph codemod path (auto-rewrite consumer call sites)
 *   - Pre-merge gate that fails CI if any checkbox is unchecked at commit time
 *   - Telemetry that records who reviewed what
 *
 * Hard guardrails:
 *   - @atlaskit/* primitives (Select, Checkbox, Button, Lozenge, Heading)
 *   - ADS tokens only
 *   - No hand-rolled menu state
 */
import { useMemo, useState } from 'react';
import Heading from '@atlaskit/heading';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button/new';
import { Checkbox } from '@atlaskit/checkbox';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';

import {
  componentsRegistry,
  type ComponentRegistryEntry,
} from '@/registry/components.registry';
import { getAllConsumersByName } from '@/registry/usage-map.generated';

const REPO_ROOT = '/Users/vikramindla/Documents/GitHub/catalyst-prod-45';

type ChangeKind = 'patch' | 'minor' | 'major';

const CHANGE_KIND_OPTIONS: Array<{ label: string; value: ChangeKind; description: string }> = [
  {
    label: 'patch — non-breaking refactor',
    value: 'patch',
    description: 'No prop changes. Internal refactor, dark-mode tweak, perf fix.',
  },
  {
    label: 'minor — new feature flag prop',
    value: 'minor',
    description: 'New optional prop with safe default. Consumers may opt in.',
  },
  {
    label: 'major — breaking prop change',
    value: 'major',
    description: 'Prop renamed, removed, or default behaviour changed. Every consumer must be reviewed.',
  },
];

function bumpVersion(current: string, kind: ChangeKind): string {
  const m = current.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return current;
  const [, maj, min, pat] = m.map(Number) as unknown as [string, number, number, number];
  if (kind === 'major') return `${(maj as unknown as number) + 1}.0.0`;
  if (kind === 'minor') return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

function moduleOf(path: string): string {
  // Group by top-level src/ subdirectory + one nested level.
  // e.g. src/modules/project-work-hub/components/Foo.tsx → modules/project-work-hub
  //      src/components/shared/JiraTable.tsx           → components/shared
  //      src/pages/admin/AdminAccessPage.tsx           → pages/admin
  const parts = path.split('/');
  if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
  if (parts.length >= 2) return parts[1];
  return path;
}

function groupByModule(paths: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const p of paths) {
    const mod = moduleOf(p);
    if (!groups[mod]) groups[mod] = [];
    groups[mod].push(p);
  }
  for (const k of Object.keys(groups)) groups[k].sort();
  return groups;
}

function VscodeLink({ path }: { path: string }) {
  const href = `vscode://file/${REPO_ROOT}/${path}`;
  return (
    <a
      href={href}
      style={{
        color: token('color.link', '#0C66E4'),
        textDecoration: 'none',
        fontFamily: 'ui-monospace, SFMono-Regular, "Menlo", "Roboto Mono", monospace',
        fontSize: 12,
      }}
    >
      {path}
    </a>
  );
}

export default function CascadeImpactPanel() {
  const auditableEntries = useMemo(
    () => componentsRegistry.filter(e => e.status !== 'banned'),
    [],
  );

  const [selectedId, setSelectedId] = useState<string>(auditableEntries[0]?.id ?? '');
  const [changeKind, setChangeKind] = useState<ChangeKind>('minor');
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  const entry: ComponentRegistryEntry | undefined = auditableEntries.find(
    e => e.id === selectedId,
  );

  const consumers = useMemo(() => (entry ? getAllConsumersByName(entry.name) : []), [entry]);
  const grouped = useMemo(() => groupByModule(consumers), [consumers]);
  const allReviewed = consumers.length > 0 && consumers.every(c => reviewed.has(c));
  const nextVersion = entry ? bumpVersion(entry.version, changeKind) : '';

  const componentOptions = auditableEntries.map(e => ({
    label: `${e.name} (v${e.version})`,
    value: e.id,
  }));

  const changeOption = CHANGE_KIND_OPTIONS.find(o => o.value === changeKind) ?? CHANGE_KIND_OPTIONS[1];

  function toggle(path: string) {
    setReviewed(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function checkAll() {
    setReviewed(new Set(consumers));
  }

  function clearAll() {
    setReviewed(new Set());
  }

  async function copyMarkdown() {
    if (!entry) return;
    const lines: string[] = [
      `## Cascade impact — ${entry.name} v${entry.version} → v${nextVersion} (${changeKind})`,
      '',
      `Registry entry: \`${entry.id}\``,
      entry.file_path ? `Canonical file: \`${entry.file_path}\`` : '',
      '',
      `### Consumers to review (${consumers.length})`,
      '',
    ].filter(Boolean);
    for (const mod of Object.keys(grouped).sort()) {
      lines.push(`**${mod}**`);
      for (const path of grouped[mod]) {
        const mark = reviewed.has(path) ? 'x' : ' ';
        lines.push(`- [${mark}] \`${path}\``);
      }
      lines.push('');
    }
    const md = lines.join('\n');
    try {
      await navigator.clipboard.writeText(md);
    } catch {
      // Fallback: select a hidden textarea so the engineer can copy manually.
      const ta = document.createElement('textarea');
      ta.value = md;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  return (
    <div
      style={{
        marginTop: token('space.200', '16px'),
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.200', '16px'),
      }}
    >
      <div>
        <Heading size="medium">Cascade impact</Heading>
        <p
          style={{
            marginTop: token('space.075', '6px'),
            marginBottom: 0,
            fontSize: 13,
            color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
            maxWidth: 760,
          }}
        >
          Pick the component you're about to change and the kind of change.
          The audit list below names every consumer that would be affected by
          the version bump — work through each, then copy the markdown
          checklist into your PR description so reviewers can verify coverage.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: token('space.200', '16px'),
          alignItems: 'start',
        }}
      >
        <div>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
              display: 'block',
              marginBottom: token('space.075', '6px'),
            }}
          >
            Component
          </label>
          <Select
            inputId="cascade-component-picker"
            options={componentOptions}
            value={componentOptions.find(o => o.value === selectedId) ?? null}
            onChange={opt => opt && setSelectedId((opt as { value: string }).value)}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
              display: 'block',
              marginBottom: token('space.075', '6px'),
            }}
          >
            Change kind
          </label>
          <Select
            inputId="cascade-change-kind"
            options={CHANGE_KIND_OPTIONS}
            value={changeOption}
            onChange={opt => opt && setChangeKind((opt as { value: ChangeKind }).value)}
          />
          <div
            style={{
              marginTop: token('space.075', '6px'),
              fontSize: 12,
              color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
            }}
          >
            {changeOption.description}
          </div>
        </div>
      </div>

      {entry && (
        <div
          style={{
            padding: token('space.200', '16px'),
            border: `1px solid ${token('color.border', '#DCDFE4')}`,
            borderRadius: 6,
            background: token('color.background.neutral.subtle', '#F7F8F9'),
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: token('space.100', '8px'),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <strong style={{ fontSize: 16 }}>{entry.name}</strong>
            <span style={{ fontSize: 13, color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)') }}>
              v{entry.version} → v{nextVersion}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: token('space.150', '12px') }}>
            <span style={{ fontSize: 13, color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)') }}>
              {reviewed.size} of {consumers.length} reviewed
            </span>
            {allReviewed ? (
              <Lozenge appearance="success">Safe to merge</Lozenge>
            ) : (
              <Lozenge appearance="moved">In review</Lozenge>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: token('space.100', '8px') }}>
        <Button appearance="default" spacing="compact" onClick={checkAll} isDisabled={consumers.length === 0}>
          Check all
        </Button>
        <Button appearance="subtle" spacing="compact" onClick={clearAll} isDisabled={reviewed.size === 0}>
          Clear
        </Button>
        <Button appearance="primary" spacing="compact" onClick={copyMarkdown} isDisabled={!entry || consumers.length === 0}>
          Copy markdown checklist
        </Button>
      </div>

      {consumers.length === 0 ? (
        <div
          style={{
            padding: token('space.300', '24px'),
            border: `1px solid ${token('color.border', '#DCDFE4')}`,
            borderRadius: 6,
            background: token('color.background.neutral.subtle', '#F7F8F9'),
            color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
            fontSize: 13,
          }}
        >
          No consumers found by the AST scan for <code>{entry?.name}</code>.
          Either the name doesn't match any imported identifier in src/, or
          re-run <code>npm run scan:components</code> to refresh the baseline.
        </div>
      ) : (
        <div
          style={{
            border: `1px solid ${token('color.border', '#DCDFE4')}`,
            borderRadius: 6,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {Object.keys(grouped).sort().map(mod => {
            const paths = grouped[mod];
            const modReviewedCount = paths.filter(p => reviewed.has(p)).length;
            return (
              <div key={mod}>
                <div
                  style={{
                    padding: '8px 12px',
                    background: token('color.background.neutral.subtle', '#F7F8F9'),
                    borderTop: `1px solid ${token('color.border', '#DCDFE4')}`,
                    fontSize: 12,
                    fontWeight: 600,
                    color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{mod}</span>
                  <span>
                    {modReviewedCount}/{paths.length}
                  </span>
                </div>
                {paths.map(path => (
                  <div
                    key={path}
                    style={{
                      padding: '6px 12px',
                      borderTop: `1px solid ${token('color.border', '#DCDFE4')}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: token('space.100', '8px'),
                    }}
                  >
                    <Checkbox
                      isChecked={reviewed.has(path)}
                      onChange={() => toggle(path)}
                      label=""
                    />
                    <VscodeLink path={path} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
