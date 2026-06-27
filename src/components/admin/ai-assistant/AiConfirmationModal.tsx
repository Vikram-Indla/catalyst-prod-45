import React from 'react';
import { Lozenge, Button, SectionMessage, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@/components/ads';
import { CommandPlan, T, RISK_LOZENGE, RiskLevel } from './aiAdminAssistant.types';

interface AiConfirmationModalProps {
  isOpen: boolean;
  plan: CommandPlan | null;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export function AiConfirmationModal({ isOpen, plan, onConfirm, onCancel, isExecuting }: AiConfirmationModalProps) {
  if (!plan) return null;

  const riskLevel = plan.risk_level ?? 'High';
  const riskCfg = RISK_LOZENGE[riskLevel as RiskLevel];
  const isCritical = riskLevel === 'Critical';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      width="medium"
      shouldCloseOnEscapePress={!isExecuting}
      shouldCloseOnOverlayClick={false}
    >
      <ModalHeader>
        <ModalTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: isCritical ? T.danger : T.warning }}>
              {isCritical ? '⛔' : '⚠'}
            </span>
            <span>{isCritical ? 'Critical action — confirm carefully' : 'High-risk action — confirm before running'}</span>
            <span style={{ display: 'inline-block' }}>
              <Lozenge appearance={riskCfg.appearance} isBold={riskCfg.isBold}>
                {riskLevel} risk
              </Lozenge>
            </span>
          </div>
        </ModalTitle>
      </ModalHeader>

      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Summary */}
          <p style={{ margin: 0, fontSize: 14, color: T.text }}>
            {plan.summary}
          </p>

          {/* Warnings */}
          {plan.warnings.length > 0 && (
            <SectionMessage appearance="warning" title="Before you confirm">
              {plan.warnings.map((w, i) => <p key={i} style={{ margin: '4px 0 0' }}>{w}</p>)}
            </SectionMessage>
          )}

          {/* Steps */}
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: T.subtlest, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {plan.steps.length} action{plan.steps.length !== 1 ? 's' : ''} will be executed
            </p>
            <div
              style={{
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              {plan.steps.map((step, i) => (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 12px',
                    borderBottom: i < plan.steps.length - 1 ? `1px solid ${T.borderSubtle}` : 'none',
                    background: i % 2 === 0 ? T.surface : T.sunken,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: T.neutral,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      color: T.subtle,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 13, color: T.text }}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Impacted tables */}
          {plan.impacted_tables && plan.impacted_tables.length > 0 && (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: T.subtlest, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Database tables affected
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {plan.impacted_tables.map(table => (
                  <code
                    key={table}
                    style={{
                      fontSize: 11,
                      padding: '2px 7px',
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
            </div>
          )}

          <p style={{ margin: 0, fontSize: 12, color: T.subtlest }}>
            This action will be executed immediately. Failed steps will be rolled back automatically.
          </p>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button appearance="subtle" onClick={onCancel} isDisabled={isExecuting}>
          Cancel
        </Button>
        <Button
          appearance={isCritical ? 'danger' : 'primary'}
          onClick={onConfirm}
          isLoading={isExecuting}
          isDisabled={isExecuting}
        >
          {isExecuting ? 'Executing…' : 'Confirm & Execute'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
