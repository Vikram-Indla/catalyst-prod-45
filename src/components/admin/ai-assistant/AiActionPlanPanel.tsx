import React from 'react';
import { Lozenge, Button } from '@/components/ads';
import { CommandPlan, AssistantStatus, T, RISK_LOZENGE, RiskLevel } from './aiAdminAssistant.types';

// ── Empty plan state ──────────────────────────────────────────────────────────

function NoPlan() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 20,
        gap: 8,
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 6, background: T.neutral, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
        📋
      </div>
      <p style={{ fontSize: 12, color: T.subtlest, textAlign: 'center', margin: 0 }}>
        Action plan will appear here once AI generates a proposal.
      </p>
    </div>
  );
}

// ── Row helpers ───────────────────────────────────────────────────────────────

function PlanRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '7px 0', borderBottom: `1px solid ${T.borderSubtle}`, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: T.subtlest, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <div style={{ fontSize: 12, color: T.text }}>
        {children}
      </div>
    </div>
  );
}

function ListRows({ items, color }: { items: string[]; color?: string }) {
  if (!items.length) return <span style={{ color: T.subtlest }}>—</span>;
  return (
    <ul style={{ margin: 0, padding: '0 0 0 14px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 12, color: color ?? T.text, lineHeight: '18px' }}>{item}</li>
      ))}
    </ul>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface AiActionPlanPanelProps {
  plan: CommandPlan | null;
  status: AssistantStatus;
  onConfirm: () => void;
  onCancel: () => void;
  onEditRequest?: () => void;
}

export function AiActionPlanPanel({ plan, status, onConfirm, onCancel, onEditRequest }: AiActionPlanPanelProps) {
  const isAwaiting = status === 'awaiting_confirm';
  const isExecuting = status === 'executing';
  const riskLevel = plan?.risk_level ?? 'Low';
  const riskCfg = RISK_LOZENGE[riskLevel as RiskLevel];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderLeft: `1px solid ${T.border}`,
        background: T.sunken,
      }}
    >
      {/* Panel header */}
      <div style={{ padding: '10px 14px 8px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.subtlest, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Live Action Plan
        </span>
      </div>

      {!plan ? (
        <NoPlan />
      ) : (
        <>
          {/* Scrollable plan body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px' }}>

            {/* Risk + summary */}
            <div style={{ padding: '10px 0 6px', borderBottom: `1px solid ${T.border}`, marginBottom: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ display: 'inline-block' }}>
                  <Lozenge appearance={riskCfg.appearance} isBold={riskCfg.isBold}>
                    {riskLevel} risk
                  </Lozenge>
                </span>
                {plan.confidence != null && (
                  <span style={{ fontSize: 11, color: T.subtlest }}>{Math.round(plan.confidence * 100)}% confidence</span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: T.text, lineHeight: '17px' }}>
                {plan.summary}
              </p>
            </div>

            {plan.intent && (
              <PlanRow label="Detected intent">
                <span>{plan.intent}</span>
              </PlanRow>
            )}

            {plan.entities && plan.entities.length > 0 && (
              <PlanRow label="Resolved entities">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {plan.entities.map((e, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6 }}>
                      <span style={{ color: T.subtlest, minWidth: 60, fontSize: 11 }}>{e.label}</span>
                      <span style={{ fontWeight: 500 }}>{e.value}</span>
                    </div>
                  ))}
                </div>
              </PlanRow>
            )}

            {plan.current_state && plan.current_state.length > 0 && (
              <PlanRow label="Current state">
                <ListRows items={plan.current_state} />
              </PlanRow>
            )}

            {/* Steps */}
            <PlanRow label={`${plan.steps.length} step${plan.steps.length !== 1 ? 's' : ''} planned`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
                {plan.steps.map((step, i) => (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: T.neutral,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.subtle,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 12, color: T.text, lineHeight: '18px' }}>{step.label}</span>
                  </div>
                ))}
              </div>
            </PlanRow>

            {plan.preserve && plan.preserve.length > 0 && (
              <PlanRow label="Will be preserved">
                <ListRows items={plan.preserve} color={T.success} />
              </PlanRow>
            )}

            {plan.impacted_tables && plan.impacted_tables.length > 0 && (
              <PlanRow label="Impacted tables">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                  {plan.impacted_tables.map(table => (
                    <code
                      key={table}
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        background: T.neutral,
                        border: `1px solid ${T.border}`,
                        borderRadius: 3,
                        color: T.subtle,
                        fontFamily: 'var(--ds-font-family-code, monospace)',
                      }}
                    >
                      {table}
                    </code>
                  ))}
                </div>
              </PlanRow>
            )}

            {plan.missing_info && plan.missing_info.length > 0 && (
              <PlanRow label="Missing information">
                <ListRows items={plan.missing_info} color={T.warning} />
              </PlanRow>
            )}

            {plan.warnings.length > 0 && (
              <PlanRow label="Warnings">
                {plan.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: T.warning }}>⚠ {w}</div>
                ))}
              </PlanRow>
            )}

            <PlanRow label="Confirmation status">
              <span style={{ display: 'inline-block' }}>
                {isAwaiting
                  ? <Lozenge appearance="moved">Awaiting confirmation</Lozenge>
                  : isExecuting
                  ? <Lozenge appearance="inprogress">Executing…</Lozenge>
                  : <Lozenge appearance="default">Idle</Lozenge>
                }
              </span>
            </PlanRow>

            <PlanRow label="Audit destination">
              <span style={{ color: T.subtlest }}>In-session audit log</span>
            </PlanRow>
          </div>

          {/* Action buttons */}
          {isAwaiting && (
            <div
              style={{
                flexShrink: 0,
                padding: '10px 14px',
                borderTop: `1px solid ${T.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                background: T.surface,
              }}
            >
              <Button
                appearance="primary"
                onClick={onConfirm}
                isDisabled={isExecuting}
                isLoading={isExecuting}
                shouldFitContainer
              >
                Confirm & Execute
              </Button>
              <div style={{ display: 'flex', gap: 6 }}>
                {onEditRequest && (
                  <Button appearance="subtle" onClick={onEditRequest} isDisabled={isExecuting} shouldFitContainer>
                    Edit request
                  </Button>
                )}
                <Button appearance="subtle" onClick={onCancel} isDisabled={isExecuting} shouldFitContainer>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
