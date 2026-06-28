/**
 * Release Operations — Settings (route /release-hub/settings)
 *
 * Read-only reference of the module's current configuration, now sourced LIVE
 * from public.rh_config_options + public.rh_config_settings (was hardcoded enum
 * arrays). Editing happens in the admin panel at /admin/release-ops; this page
 * shows what is currently in effect across the create modals + lifecycle
 * trackers. Lifecycle transition RULES remain enforced in lifecycle.ts.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import { RH } from '@/constants/releasehub.design';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { useReleaseConfig } from '@/hooks/releases/useReleaseConfig';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  card: 'var(--ds-surface-raised, #FFFFFF)',
  sunken: 'var(--ds-surface-sunken, #F7F8F9)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
};

function ChipList({ labels }: { labels: string[] }) {
  if (labels.length === 0) return <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtlest }}>—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {labels.map((l) => (
        <span key={l} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: T.subtle, background: T.sunken, border: `1px solid ${T.border}`, borderRadius: 12, padding: '0 8px', lineHeight: '24px' }}>{l}</span>
      ))}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h2 style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: T.text, margin: 0 }}>{title}</h2>
      {description && <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtlest, margin: '4px 0 12px' }}>{description}</p>}
      {!description && <div style={{ height: 12 }} />}
      {children}
    </div>
  );
}

export default function ReleaseSettingsPage() {
  const { data, isLoading } = useReleaseConfig();

  const labelsFor = (key: string): string[] =>
    (data?.options[key] || []).filter((o) => o.is_active).map((o) => o.label);

  const prefix = String(data?.settings?.change_number_prefix ?? 'CAT-CHG-');
  const pad = Math.max(1, Math.min(8, parseInt(String(data?.settings?.change_number_padding ?? 4), 10) || 4));
  const sample = `${prefix}${'1'.padStart(pad, '0')}`;
  const notifyCreate = data?.settings?.notify_on_create === true;
  const notifyStatus = data?.settings?.notify_on_status_change === true;

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ margin: '-24px -24px 16px' }}>
        <ProjectPageHeader projectKey="RELEASES" hubType="release" />
      </div>

      <div style={{ background: 'var(--ds-background-information, #E9F2FE)', border: '1px solid var(--ds-border-information, #8FB8F6)', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
        <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-information, #0055CC)', margin: 0 }}>
          These values are live from the module configuration. Edit them in the{' '}
          <Link to="/admin/release-ops" style={{ color: 'var(--ds-link, #0C66E4)', fontWeight: 600 }}>Release Operations admin panel</Link>.
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="large" /></div>
      ) : (
        <>
          <Section title="Release types"><ChipList labels={labelsFor('release_type')} /></Section>
          <Section title="Change types"><ChipList labels={labelsFor('change_type')} /></Section>
          <Section title="Environments"><ChipList labels={labelsFor('target_env')} /></Section>
          <Section title="Deployment categories"><ChipList labels={labelsFor('deployment_category')} /></Section>
          <Section title="Risk levels"><ChipList labels={labelsFor('risk_level')} /></Section>
          <Section title="Approval roles" description="Sign-off roles available when adding approvers to a change."><ChipList labels={labelsFor('approval_role')} /></Section>
          <Section title="SOP step types"><ChipList labels={labelsFor('sop_step_type')} /></Section>
          <Section title="Release lifecycle" description="Release stages, in order."><ChipList labels={labelsFor('release_status')} /></Section>
          <Section title="Change lifecycle" description="Change stages, in order."><ChipList labels={labelsFor('change_status')} /></Section>

          <Section title="Change numbering" description="Catalyst-created change records are numbered sequentially.">
            <p style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 'var(--ds-font-size-400)', color: T.text, margin: 0 }}>{sample}, {prefix}{'2'.padStart(pad, '0')}, …</p>
          </Section>

          <Section title="Notification policy" description="How subscribers are notified.">
            <p style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle, margin: 0, lineHeight: 1.5 }}>
              Notify on create: <strong>{notifyCreate ? 'On' : 'Off'}</strong>. Notify on status change: <strong>{notifyStatus ? 'On' : 'Off'}</strong>. Subscribers are reached through the Notifications module and Caty chat.
            </p>
          </Section>
        </>
      )}
    </div>
  );
}
