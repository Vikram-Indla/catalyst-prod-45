/**
 * ReleasePeekPanel — right drawer opened from a calendar release chip.
 * Tabs: Predictor (date-based forecast), Notes (rh_release_notes + Caty
 * generate), Changes (rh_changes), Sprints (product_sprints). Read-only;
 * the Caty generate CTA is transparent with the signature CatyPulseIcon.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
import { RH } from '@/constants/releasehub.design';
import { ReleasePredictorCard } from '@/components/releasehub/ReleasePredictorCard';
import { useReleaseBits, useGenerateReleaseNotes, type Prediction } from '@/hooks/useReleaseHub';

const T = {
  surface: 'var(--ds-surface)',
  sunken: 'var(--ds-surface-sunken)',
  border: 'var(--ds-border)',
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
};

type Tab = 'predictor' | 'notes' | 'changes' | 'sprints';

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '8px 0', marginRight: 16, background: 'transparent', border: 'none', borderBottom: active ? `2px solid ${T.text}` : '2px solid transparent', color: active ? T.text : T.subtle, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', cursor: 'pointer' }}
    >
      {label}
    </button>
  );
}

export function ReleasePeekPanel({
  id, label, prediction, onClose,
}: {
  id: string;
  label: string;
  prediction: Prediction | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('predictor');
  const { data: bits, isLoading } = useReleaseBits(id);
  const gen = useGenerateReleaseNotes();

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--ds-blanket, rgba(9,30,66,0.36))', zIndex: 400, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: '92vw', height: '100%', background: T.surface, borderLeft: `1px solid ${T.border}`, overflowY: 'auto', boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.18))' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 16px 0' }}>
          <span style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: T.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          <button onClick={() => navigate(`/release-hub/${id}`)} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, background: 'transparent', border: `0.5px solid ${T.border}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', marginRight: 8 }}>Open release</button>
          <button onClick={onClose} aria-label="Close" style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-500)', color: T.subtle, background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', padding: '8px 16px 0', borderBottom: `0.5px solid ${T.border}` }}>
          <TabButton active={tab === 'predictor'} label="Predictor" onClick={() => setTab('predictor')} />
          <TabButton active={tab === 'notes'} label="Notes" onClick={() => setTab('notes')} />
          <TabButton active={tab === 'changes'} label={`Changes${bits?.changes.length ? ` (${bits.changes.length})` : ''}`} onClick={() => setTab('changes')} />
          <TabButton active={tab === 'sprints'} label={`Sprints${bits?.sprints.length ? ` (${bits.sprints.length})` : ''}`} onClick={() => setTab('sprints')} />
        </div>

        <div style={{ padding: 16 }}>
          {tab === 'predictor' && (
            <ReleasePredictorCard kind="release" id={id} label={label} prediction={prediction} />
          )}

          {tab === 'notes' && (
            <div>
              {gen.data || bits?.notes?.contentMd ? (
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, lineHeight: 1.55, margin: 0 }}>{gen.data ?? bits?.notes?.contentMd}</pre>
              ) : (
                <div style={{ background: T.sunken, borderRadius: 8, padding: 16, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.subtle }}>
                  <div style={{ fontWeight: 600, color: T.text, marginBottom: 4 }}>No release notes yet</div>
                  Draft from linked changes + completed work items.
                </div>
              )}
              <button
                onClick={() => gen.mutate(id)}
                disabled={gen.isPending}
                style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: `0.5px solid ${T.border}`, borderRadius: 6, padding: '8px 12px', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: T.text, cursor: gen.isPending ? 'default' : 'pointer' }}
              >
                {gen.isPending ? <Spinner size="small" /> : <CatyPulseIcon size={15} />}
                {bits?.notes ? 'Regenerate with Caty' : 'Generate with Caty'}
              </button>
              {gen.isError && <div style={{ marginTop: 8, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-danger)' }}>Could not generate notes.</div>}
            </div>
          )}

          {tab === 'changes' && (
            <div>
              {isLoading ? <Spinner size="small" /> : (bits?.changes.length ? bits.changes.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `0.5px solid ${T.border}` }}>
                  <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>{c.chgNumber ?? '—'}</span>
                  <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                  {c.status && <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest }}>{c.status}</span>}
                </div>
              )) : <Empty text="No changes linked to this release." />)}
            </div>
          )}

          {tab === 'sprints' && (
            <div>
              {isLoading ? <Spinner size="small" /> : (bits?.sprints.length ? bits.sprints.map((s) => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `0.5px solid ${T.border}` }}>
                  <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.text }}>{s.name}</span>
                  <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', color: T.subtlest, marginLeft: 'auto' }}>{s.start ?? '—'} → {s.end ?? '—'}</span>
                </div>
              )) : <Empty text="No sprints linked to this release." />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest)', padding: 16, textAlign: 'center' }}>{text}</div>;
}

export default ReleasePeekPanel;
