/**
 * Version Diff View — side-by-side comparison of two tm_test_case_versions
 * snapshots. Rewritten for P1-S4b-2 (CAT-TESTHUB-PROD-20260703-001, VER-023):
 * the previous version hard-coded Tailwind colors (banned) and read fields
 * that don't exist on the real snapshot shape (`objective`, `priority` —
 * the RPC writes `priority_id`/`case_type_id`, see D-006). Priority/type are
 * UUID FKs with no resolved label available here, so they are intentionally
 * left out of the field diff rather than showing a raw UUID or a fabricated
 * name (zero-assumption law).
 */
import { useMemo, useState } from 'react';
import { GitCompare } from '@/lib/atlaskit-icons';
import { Modal, ModalHeader, ModalTitle, ModalBody } from '@/components/ads/Modal';
import { Select } from '@/components/ads/Select';
import { Lozenge } from '@/components/ads';
import type { TestCaseVersion } from '@/hooks/test-management/useTestCaseVersions';
import { format } from 'date-fns';

interface VersionDiffViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: TestCaseVersion[];
  initialLeft?: number;
  initialRight?: number;
}

interface StepSnapshot {
  step_number: number;
  action: string;
  expected_result: string;
  test_data?: string | null;
}

const DIFF_FIELDS = ['title', 'description', 'preconditions', 'status'] as const;

const FIELD_LABELS: Record<(typeof DIFF_FIELDS)[number], string> = {
  title: 'Title',
  description: 'Description',
  preconditions: 'Preconditions',
  status: 'Status',
};

function DiffField({ label, left, right }: { label: string; left?: string | null; right?: string | null }) {
  const changed = left !== right;
  return (
    <div style={{
      borderRadius: 8, border: `1px solid ${changed ? 'var(--ds-border-warning)' : 'var(--ds-border)'}`,
      padding: 12, marginBottom: 12,
      background: changed ? 'var(--ds-background-warning)' : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ds-text-subtlest)' }}>{label}</span>
        {changed && <Lozenge appearance="moved">Changed</Lozenge>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{
          fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)',
          ...(changed ? { background: 'var(--ds-background-danger)', border: '1px solid var(--ds-border-danger)', borderRadius: 4, padding: 8 } : {}),
        }}>
          {left || <span style={{ color: 'var(--ds-text-subtlest)', fontStyle: 'italic' }}>Empty</span>}
        </div>
        <div style={{
          fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)',
          ...(changed ? { background: 'var(--ds-background-success)', border: '1px solid var(--ds-border-success)', borderRadius: 4, padding: 8 } : {}),
        }}>
          {right || <span style={{ color: 'var(--ds-text-subtlest)', fontStyle: 'italic' }}>Empty</span>}
        </div>
      </div>
    </div>
  );
}

function StepsDiff({ leftSteps, rightSteps }: { leftSteps: StepSnapshot[]; rightSteps: StepSnapshot[] }) {
  const maxLen = Math.max(leftSteps.length, rightSteps.length);
  if (maxLen === 0) return <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest)' }}>No steps</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: maxLen }, (_, i) => {
        const left = leftSteps[i];
        const right = rightSteps[i];
        const isNew = !left && !!right;
        const isRemoved = !!left && !right;
        const isChanged = !!left && !!right && (left.action !== right.action || left.expected_result !== right.expected_result);

        const borderColor = isNew ? 'var(--ds-border-success)' : isRemoved ? 'var(--ds-border-danger)' : isChanged ? 'var(--ds-border-warning)' : 'var(--ds-border)';
        const bg = isNew ? 'var(--ds-background-success)' : isRemoved ? 'var(--ds-background-danger)' : isChanged ? 'var(--ds-background-warning)' : 'transparent';

        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 12, borderRadius: 8, border: `1px solid ${borderColor}`, background: bg }}>
            <div>
              {left ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)' }}>Step {left.step_number}</span>
                    {isRemoved && <Lozenge appearance="removed">Removed</Lozenge>}
                  </div>
                  <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', margin: 0 }}>{left.action}</p>
                  {left.expected_result && <p style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', marginTop: 4, marginBottom: 0 }}>Expected: {left.expected_result}</p>}
                </div>
              ) : (
                <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)', fontStyle: 'italic' }}>—</span>
              )}
            </div>
            <div>
              {right ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)' }}>Step {right.step_number}</span>
                    {isNew && <Lozenge appearance="success">New</Lozenge>}
                    {isChanged && <Lozenge appearance="moved">Modified</Lozenge>}
                  </div>
                  <p style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', margin: 0 }}>{right.action}</p>
                  {right.expected_result && <p style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', marginTop: 4, marginBottom: 0 }}>Expected: {right.expected_result}</p>}
                </div>
              ) : (
                <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)', fontStyle: 'italic' }}>—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function versionOptionLabel(v: TestCaseVersion): string {
  const who = v.changed_by_profile?.full_name ? ` by ${v.changed_by_profile.full_name}` : '';
  return `v${v.version_number} — ${format(new Date(v.created_at), 'MMM d, yyyy')}${who}`;
}

export function VersionDiffView({ open, onOpenChange, versions, initialLeft, initialRight }: VersionDiffViewProps) {
  const sorted = useMemo(() => [...versions].sort((a, b) => a.version_number - b.version_number), [versions]);
  const [leftVersion, setLeftVersion] = useState<number>(initialLeft || sorted[0]?.version_number || 1);
  const [rightVersion, setRightVersion] = useState<number>(initialRight || sorted[sorted.length - 1]?.version_number || 1);

  const left = sorted.find(v => v.version_number === leftVersion);
  const right = sorted.find(v => v.version_number === rightVersion);

  const leftSnapshot = (left?.snapshot ?? {}) as Record<string, unknown>;
  const rightSnapshot = (right?.snapshot ?? {}) as Record<string, unknown>;
  const leftSteps: StepSnapshot[] = (leftSnapshot.steps as StepSnapshot[]) || [];
  const rightSteps: StepSnapshot[] = (rightSnapshot.steps as StepSnapshot[]) || [];

  const changedCount = DIFF_FIELDS.filter(f => leftSnapshot[f] !== rightSnapshot[f]).length +
    (JSON.stringify(leftSteps) !== JSON.stringify(rightSteps) ? 1 : 0);

  const options = sorted.map(v => ({ value: String(v.version_number), label: versionOptionLabel(v) }));
  const leftOption = options.find(o => o.value === String(leftVersion)) ?? null;
  const rightOption = options.find(o => o.value === String(rightVersion)) ?? null;

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)} width="x-large" aria-label="Compare versions">
      <ModalHeader>
        <ModalTitle>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GitCompare size={18} />
            Compare Versions
            {changedCount > 0 && (
              <Lozenge appearance="inprogress">{changedCount} change{changedCount !== 1 ? 's' : ''}</Lozenge>
            )}
          </span>
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--ds-text-subtlest)', minWidth: 40 }}>From:</span>
            <div style={{ flex: 1 }}>
              <Select options={options} value={leftOption} onChange={o => o && setLeftVersion(Number(o.value))} width="medium" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--ds-text-subtlest)', minWidth: 24 }}>To:</span>
            <div style={{ flex: 1 }}>
              <Select options={options} value={rightOption} onChange={o => o && setRightVersion(Number(o.value))} width="medium" />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
          <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text-danger)' }}>
            Version {leftVersion} {left?.changed_by_profile?.full_name ? `— ${left.changed_by_profile.full_name}` : ''}
          </div>
          <div style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text-success)' }}>
            Version {rightVersion} {right?.changed_by_profile?.full_name ? `— ${right.changed_by_profile.full_name}` : ''}
          </div>
        </div>

        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {DIFF_FIELDS.map(field => (
            <DiffField
              key={field}
              label={FIELD_LABELS[field]}
              left={leftSnapshot[field] as string | null}
              right={rightSnapshot[field] as string | null}
            />
          ))}

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ds-text-subtlest)' }}>Steps</span>
              <Lozenge appearance="default">{leftSteps.length} → {rightSteps.length}</Lozenge>
            </div>
            <StepsDiff leftSteps={leftSteps} rightSteps={rightSteps} />
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
