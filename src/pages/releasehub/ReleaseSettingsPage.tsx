/**
 * Release Operations — Settings (route /release-hub/settings)
 *
 * Phase 14: a read-only reference of the module's current configuration —
 * release/change types, environments, deployment categories, risk levels,
 * approval roles, SOP step types, lifecycle stages, change numbering, and
 * notification policy. These values are currently fixed enums consumed by the
 * create modals + lifecycle trackers; making them editable requires config
 * tables + sourcing every consumer from the DB (a future phase). This page
 * documents what is in effect so admins can see the contract.
 */
import React from 'react';
import { RH } from '@/constants/releasehub.design';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  card: 'var(--ds-surface-raised, #FFFFFF)',
  sunken: 'var(--ds-surface-sunken, #F7F8F9)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
};

function label(v: string) {
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ');
}

function ChipList({ values }: { values: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {values.map((v) => (
        <span key={v} style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: 500, color: T.subtle, background: T.sunken, border: `1px solid ${T.border}`, borderRadius: 12, padding: '0 8px', lineHeight: '24px' }}>{label(v)}</span>
      ))}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h2 style={{ fontFamily: RH.fontDisplay, fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>{title}</h2>
      {description && <p style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtlest, margin: '4px 0 12px' }}>{description}</p>}
      {!description && <div style={{ height: 12 }} />}
      {children}
    </div>
  );
}

const RELEASE_TYPES = ['regular', 'minor', 'major', 'hotfix', 'emergency'];
const CHANGE_TYPES = ['standard', 'normal', 'emergency', 'hotfix'];
const ENVIRONMENTS = ['qa', 'beta', 'staging', 'production'];
const DEPLOY_CATEGORIES = ['frontend', 'backend', 'integration', 'database', 'full_stack', 'configuration'];
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
const APPROVAL_ROLES = ['qa', 'uat', 'product_owner', 'project_manager', 'change_manager'];
const SOP_STEP_TYPES = ['manual', 'script', 'deployment', 'validation', 'communication', 'rollback'];
const RELEASE_STAGES = ['draft', 'planned', 'in_readiness', 'ready_for_signoff', 'approved', 'scheduled', 'deploying', 'monitoring', 'completed'];
const CHANGE_STAGES = ['draft', 'assessing', 'ready_for_approval', 'approved', 'scheduled', 'implementing', 'validating', 'implemented', 'closed'];

export default function ReleaseSettingsPage() {
  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: RH.fontDisplay, fontSize: 24, fontWeight: 600, color: T.text, margin: 0 }}>Settings</h1>
        <p style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtlest, margin: '4px 0 0' }}>Release Operations configuration (read-only reference)</p>
      </div>

      <div style={{ background: 'var(--ds-background-information, #E9F2FE)', border: '1px solid var(--ds-border-information, #8FB8F6)', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
        <p style={{ fontFamily: RH.fontBody, fontSize: 12, color: 'var(--ds-text-information, #0055CC)', margin: 0 }}>
          These values are the configuration currently in effect across the create modals and lifecycle trackers. Editable settings (backed by config tables) are a future enhancement.
        </p>
      </div>

      <Section title="Release types"><ChipList values={RELEASE_TYPES} /></Section>
      <Section title="Change types"><ChipList values={CHANGE_TYPES} /></Section>
      <Section title="Environments"><ChipList values={ENVIRONMENTS} /></Section>
      <Section title="Deployment categories"><ChipList values={DEPLOY_CATEGORIES} /></Section>
      <Section title="Risk levels"><ChipList values={RISK_LEVELS} /></Section>
      <Section title="Approval roles" description="Sign-off roles available when adding approvers to a change."><ChipList values={APPROVAL_ROLES} /></Section>
      <Section title="SOP step types"><ChipList values={SOP_STEP_TYPES} /></Section>
      <Section title="Release lifecycle" description="The 9 release stages, in order."><ChipList values={RELEASE_STAGES} /></Section>
      <Section title="Change lifecycle" description="The 9 change stages, in order."><ChipList values={CHANGE_STAGES} /></Section>

      <Section title="Change numbering" description="Catalyst-created change records are numbered sequentially.">
        <p style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 14, color: T.text, margin: 0 }}>CAT-CHG-0001, CAT-CHG-0002, …</p>
      </Section>

      <Section title="Notification policy" description="How subscribers are notified.">
        <p style={{ fontFamily: RH.fontBody, fontSize: 13, color: T.subtle, margin: 0, lineHeight: 1.5 }}>
          Every release and change carries an editable Notify list. Subscribers are notified on change creation and on every lifecycle status transition, through the Notifications module and Caty chat. (Delivery wiring lands in Phase 16.)
        </p>
      </Section>
    </div>
  );
}
