/**
 * BrStatusSection — Business Request status pill (workflow-driven).
 *
 * Reads the canonical Business Request workflow from
 * `useCatalystWorkflow('Business Request')` and renders a Lozenge +
 * ChevronDown trigger that opens an Atlaskit DropdownMenu of every status
 * configured in /admin/workflows. Selecting a status writes
 * `process_step` on the BR row.
 *
 * 100% ADS — no shadcn, no bespoke chrome. Mirrors the BRStatusChip
 * pattern from CreateBusinessRequestModal (cycle 6 audit) but operates
 * against the parent's `onUpdate` callback rather than local state.
 *
 * Atlaskit DropdownMenu trigger render-prop: `isSelected` and `testId`
 * MUST be destructured out of `triggerProps` before spreading onto the
 * native button — see CLAUDE.md "Atlaskit DropdownMenu portal mount race"
 * lesson.
 */
import { type Ref } from 'react';
import DropdownMenu, { DropdownItemGroup, DropdownItem } from '@atlaskit/dropdown-menu';
import Lozenge from '@atlaskit/lozenge';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { token } from '@atlaskit/tokens';
import { useCatalystWorkflow } from '@/hooks/useCatalystWorkflow';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
import type { BusinessRequest } from '@/types/business-request';

type LozengeAppearance = 'default' | 'inprogress' | 'success' | 'removed' | 'moved' | 'new';

function categoryToLozenge(
  cat: 'todo' | 'in_progress' | 'done' | undefined,
): LozengeAppearance {
  if (cat === 'done') return 'success';
  if (cat === 'in_progress') return 'inprogress';
  return 'default';
}

/**
 * Canonical header-pill background palette — copied verbatim from
 * CatalystStatusPill (the project status pill). Keyed by statusToLozenge
 * appearance so the BR pill renders IDENTICALLY to project: solid
 * category colour, 14px/500/none dark text, 32px tall, 0 10px padding.
 */
const PILL_BG: Record<string, string> = {
  success:    'rgb(148, 199, 72)',
  inprogress: 'rgb(143, 184, 246)',
  moved:      'rgb(243, 214, 100)',
  removed:    'rgb(221, 222, 225)',
  new:        'rgb(184, 172, 246)',
  default:    'rgb(221, 222, 225)',
};

interface Props {
  request: BusinessRequest | null;
  onUpdate: (field: string, value: unknown) => Promise<void>;
}

export function BrStatusSection({ request, onUpdate }: Props) {
  const { statuses, isLoading } = useCatalystWorkflow('Business Request');

  if (!request) return null;

  const options = statuses.map((s) => ({
    value: s.slug,
    label: s.name,
    category: s.category,
  }));

  const current =
    options.find((o) => o.value === request.process_step) ??
    options[0] ?? {
      value: '',
      label: isLoading ? 'Loading…' : 'No status',
      category: 'todo' as const,
    };

  return (
    <section
      data-cv-section="br-status"
      style={{ marginBottom: 16 }}
      aria-label="Status"
    >
      <DropdownMenu
        placement="bottom-start"
        shouldRenderToParent={false}
        trigger={({ triggerRef, ...triggerProps }) => {
          const { isSelected: _isSelected, testId: _innerTestId, ...rest } =
            triggerProps as Record<string, unknown>;
          const appearance = statusToLozenge(current.label, current.category);
          return (
            <button
              {...rest}
              ref={triggerRef as Ref<HTMLButtonElement>}
              type="button"
              data-testid="br-view--status-pill"
              aria-label={`${current.label} — Change status`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'filter 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.88)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
            >
              {/* Canonical header pill — IDENTICAL to CatalystStatusPill:
                  32px / 14px / 500 / none / padding 0 10px / category bg / dark text. */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                height: 32,
                lineHeight: '32px',
                padding: '0 10px',
                borderRadius: 3,
                fontSize: 14,
                fontWeight: 500,
                textTransform: 'none',
                letterSpacing: 'normal',
                background: PILL_BG[appearance] ?? PILL_BG.default,
                color: 'rgb(41, 42, 46)',
              }}>
                {current.label}
                <ChevronDownIcon label="" size="small" />
              </span>
            </button>
          );
        }}
      >
        <DropdownItemGroup title="Change status">
          {options.length === 0 && (
            <div
              style={{
                padding: '8px 12px',
                fontSize: 13,
                color: token('color.text.subtlest', '#8590A2'),
                fontFamily: 'var(--cp-font-body)',
              }}
            >
              {isLoading ? 'Loading…' : 'No statuses configured'}
            </div>
          )}
          {options.map((opt) => (
            <DropdownItem
              key={opt.value}
              isSelected={request.process_step === opt.value}
              onClick={() => {
                if (request.process_step !== opt.value) {
                  void onUpdate('process_step', opt.value);
                }
              }}
            >
              <Lozenge appearance={categoryToLozenge(opt.category)}>
                {opt.label}
              </Lozenge>
            </DropdownItem>
          ))}
        </DropdownItemGroup>
      </DropdownMenu>
    </section>
  );
}

export default BrStatusSection;
