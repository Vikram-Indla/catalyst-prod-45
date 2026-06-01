/**
 * BrCenterDetails — center-column "Details" section for Business Request.
 *
 * Mirrors Story's center "Key details" placement (below title, above
 * Description). Holds the descriptive/classification fields that do NOT
 * belong in the right-rail metadata strip:
 *   - Type            → request_type
 *   - Category        → category
 *   - Theme           → theme
 *   - Stakeholders    → stakeholders (multi)
 *   - Targeted feature → targeted_feature (checkbox)
 *
 * The right rail (BrSidebarDetails) keeps only the Story-equivalent
 * metadata set: Priority, Delivery Manager, Product Owner, Planned release,
 * Target date, Created, Updated.
 *
 * Collapsible section header matches the canonical Story spec
 * (16px/653, ChevronRight toggle, no uppercase). Fields are borderless
 * editable Selects — the grey/border chrome is suppressed via the
 * [data-cv-section="br-center-details"] CSS rule in index.css.
 */
import React, { type ReactNode, useState } from 'react';
import Select, { CreatableSelect } from '@atlaskit/select';
import { Checkbox } from '@atlaskit/checkbox';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import {
  THEME_OPTIONS,
  STAKEHOLDER_OPTIONS,
  REQUEST_TYPE_OPTIONS,
} from '@/types/business-request';
import type { BusinessRequest } from '@/types/business-request';

const CATEGORY_OPTIONS = [
  { value: 'Industrial', label: 'Industrial' },
  { value: 'Ministry Website', label: 'Ministry Website' },
  { value: 'Internal Services', label: 'Internal Services' },
  { value: 'Innovation Platform', label: 'Innovation Platform' },
];

const THEME_SELECT_OPTIONS = THEME_OPTIONS.map((t) => ({
  value: t.value,
  label: t.labelEn ?? t.label,
}));
const STAKEHOLDER_SELECT_OPTIONS = STAKEHOLDER_OPTIONS.map((s) => ({
  value: s.value,
  label: s.label,
}));
const TYPE_SELECT_OPTIONS = REQUEST_TYPE_OPTIONS.map((t) => ({
  value: t.value,
  label: t.label,
}));

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', minHeight: 32 }}>
      <div style={{
        fontSize: 12, fontWeight: 500, lineHeight: '20px',
        color: 'var(--ds-text-subtle, #505258)',
        flexShrink: 0, width: 128, alignSelf: 'center',
        fontFamily: 'var(--cp-font-body)',
      }}>
        {label}
      </div>
      <div style={{ flex: 1, minWidth: 0, fontFamily: 'var(--cp-font-body)' }}>
        {children}
      </div>
    </div>
  );
}

interface Props {
  request: BusinessRequest | null;
  onUpdate: (field: string, value: unknown) => Promise<void> | void;
}

export function BrCenterDetails({ request, onUpdate }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (!request) return null;

  const requestTypeRaw = (request as unknown as { request_type?: string | null }).request_type ?? null;
  const categoryRaw = (request as unknown as { category?: string | null }).category ?? null;

  return (
    <section
      data-cv-section="br-center-details"
      aria-label="Details"
      style={{ marginBottom: 16 }}
    >
      {/* Section header — exact Story spec (16px/653, ChevronRight, no uppercase) */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, height: 40,
          background: 'transparent', cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{
          display: 'inline-flex',
          transition: 'transform 0.15s ease',
          transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
          color: 'var(--ds-icon-subtle, #626F86)',
        }}>
          <ChevronRightIcon size="small" primaryColor="currentColor" />
        </span>
        <div style={{ margin: 0, fontSize: 16, fontWeight: 653, lineHeight: '20px', color: 'var(--ds-text, #292A2E)' }}>
          Details
        </div>
      </div>

      {!collapsed && (
        <div>
          <DetailRow label="Type">
            <Select
              inputId="br-center--type"
              classNamePrefix="cv-br-center-select"
              options={TYPE_SELECT_OPTIONS}
              value={TYPE_SELECT_OPTIONS.find((o) => o.value === requestTypeRaw) ?? null}
              onChange={(opt) => void onUpdate('request_type', (opt as { value: string } | null)?.value ?? null)}
              isClearable
              isSearchable={false}
              placeholder="Feature · Gap · Integration · Data Request"
            />
          </DetailRow>

          <DetailRow label="Category">
            <Select
              inputId="br-center--category"
              classNamePrefix="cv-br-center-select"
              options={CATEGORY_OPTIONS}
              value={CATEGORY_OPTIONS.find((o) => o.value === categoryRaw) ?? null}
              onChange={(opt) => void onUpdate('category', (opt as { value: string } | null)?.value ?? null)}
              isClearable
              isSearchable={false}
              placeholder="Select category"
            />
          </DetailRow>

          <DetailRow label="Theme">
            <Select
              inputId="br-center--theme"
              classNamePrefix="cv-br-center-select"
              options={THEME_SELECT_OPTIONS}
              value={THEME_SELECT_OPTIONS.find((o) => o.value === request.theme) ?? null}
              onChange={(opt) => void onUpdate('theme', (opt as { value: string } | null)?.value ?? null)}
              isClearable
              isSearchable
              placeholder="Select theme"
            />
          </DetailRow>

          <DetailRow label="Stakeholders">
            <CreatableSelect
              inputId="br-center--stakeholders"
              classNamePrefix="cv-br-center-select"
              isMulti
              isClearable={false}
              options={STAKEHOLDER_SELECT_OPTIONS}
              value={[
                ...STAKEHOLDER_SELECT_OPTIONS.filter((o) =>
                  (request.stakeholders ?? []).includes(o.value),
                ),
                ...(request.stakeholders ?? [])
                  .filter((v) => !STAKEHOLDER_SELECT_OPTIONS.find((o) => o.value === v))
                  .map((v) => ({ value: v, label: v })),
              ]}
              onChange={(vals) =>
                void onUpdate(
                  'stakeholders',
                  (Array.from(vals ?? []) as { value: string }[]).map((v) => v.value),
                )
              }
              placeholder="+ Add stakeholder"
              formatCreateLabel={(input: string) => `Add "${input}"`}
            />
          </DetailRow>

          <DetailRow label="Targeted feature">
            <Checkbox
              isChecked={!!request.targeted_feature}
              onChange={(e) =>
                void onUpdate('targeted_feature', (e.target as HTMLInputElement).checked)
              }
              label="Priority feature for the current cycle"
              name="br-center--targeted-feature"
            />
          </DetailRow>
        </div>
      )}
    </section>
  );
}

export default BrCenterDetails;
