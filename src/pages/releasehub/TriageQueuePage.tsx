import React, { useState } from 'react';
import { useTriageCount, useChanges, useReleases } from '@/hooks/useReleaseHub';
import { RH } from '@/constants/releasehub.design';
import { StatusLozenge } from '@/components/releasehub/StatusLozenge';
import { SourceBadge } from '@/components/releasehub/SourceBadge';
import { RiskBadge } from '@/components/releasehub/RiskBadge';
import { SkeletonRows } from '@/components/releasehub/SkeletonRows';
import { CheckCircle, ChevronDown, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function mapRisk(risk: string) {
  const r = risk?.toLowerCase() || 'standard';
  if (r === 'low' || r === 'medium') return 'standard';
  if (r === 'critical') return 'emergency';
  return r;
}

function getAIRecommendation(change: any, releases: any[]) {
  // Simple heuristic: suggest the first non-released release, or closest by date
  const active = releases.filter((r: any) => r.status !== 'done' && r.status !== 'released' && r.status !== 'archived');
  if (active.length === 0) return null;
  // Pick one based on name similarity or just the first
  const suggested = active[0];
  return {
    releaseName: suggested.name,
    releaseId: suggested.id,
    reason: 'Matches scope + timeline',
  };
}

export default function TriageQueuePage() {
  const { data: triageCount = 0 } = useTriageCount();
  const { data: changes = [], isLoading } = useChanges();
  const { data: releases = [] } = useReleases();
  const queryClient = useQueryClient();
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const unlinked = changes.filter((c: any) => !c.release_id && !ignoredIds.has(c.id));

  const linkChangeToRelease = async (changeId: string, releaseId: string) => {
    const { error } = await supabase.from('rh_changes').update({ release_id: releaseId }).eq('id', changeId);
    if (error) { toast.error('Failed to link release'); return; }
    toast.success('Change linked to release');
    queryClient.invalidateQueries({ queryKey: ['releasehub', 'changes'] });
  };

  const ignoreTriageItem = (changeId: string) => {
    setIgnoredIds(prev => new Set(prev).add(changeId));
    toast.success('Item ignored');
  };

  return (
    <div style={{ background: 'var(--bg-app, #FFFFFF)', minHeight: '100%', padding: '24px' }}>
      <div className="mb-5">
        <h1 className="text-[22px] font-extrabold" style={{ fontFamily: RH.fontDisplay, color: RH.ink1 }}>Triage Queue</h1>
        <p className="text-[13px] text-[var(--ds-text-subtlest, #64748B)]" style={{ fontFamily: RH.fontBody }}>
          Changes without an assigned release — {unlinked.length} item{unlinked.length !== 1 ? 's' : ''} require{unlinked.length === 1 ? 's' : ''} action
        </p>
      </div>

      {isLoading ? (
        <SkeletonRows count={5} />
      ) : unlinked.length === 0 ? (
        <div className="bg-white dark:bg-[var(--ds-surface-raised, #1A1A1A)] rounded border border-[rgba(15,23,42,0.12)] dark:border-[var(--ds-border, #2E2E2E)] p-10 flex flex-col items-center gap-2">
          <CheckCircle size={24} className="text-[#15803D]" />
          <span className="text-[14px] font-bold text-[#15803D]" style={{ fontFamily: RH.fontDisplay }}>No unlinked work items — pipeline is clean ✓</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-[var(--ds-surface-raised, #1A1A1A)] rounded border border-[rgba(15,23,42,0.12)] dark:border-[var(--ds-border, #2E2E2E)] overflow-hidden">
          <table className="w-full text-[13px]" style={{ fontFamily: RH.fontBody }} role="table">
            <thead>
              <tr style={{ background: 'var(--ds-surface-sunken, #F1F5F9)' }}>
                {['KEY', 'TITLE', 'RISK', 'SOURCE', 'DATE', 'AI RECOMMENDATION', 'ACTIONS'].map(h => (
                  <th key={h} className="px-3 py-0 h-[50px] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ds-text-subtlest, #64748B)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {unlinked.map((c: any) => {
                const rec = getAIRecommendation(c, releases);
                return (
                  <tr key={c.id} className="border-b border-[rgba(15,23,42,0.06)]" style={{ background: 'var(--bg-app, #FFFFFF)' }}>
                    <td className="px-3 py-2">
                      <span className="text-[13px] font-medium text-[var(--ds-text-brand, #2563EB)]" style={{ fontFamily: RH.fontMono }}>{c.chg_number}</span>
                    </td>
                    <td className="px-3 py-2 max-w-[220px]">
                      <span className="text-[13px] text-[var(--ds-text, #0F172A)] truncate block">{c.title}</span>
                    </td>
                    <td className="px-3 py-2"><RiskBadge risk={mapRisk(c.risk_level)} /></td>
                    <td className="px-3 py-2"><SourceBadge source={c.source} /></td>
                    <td className="px-3 py-2 text-[var(--ds-text-subtlest, #64748B)]" style={{ fontFamily: RH.fontMono, fontSize: 12 }}>
                      {c.deployment_date ? new Date(c.deployment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {rec ? (
                        <div className="bg-[var(--ds-background-selected, #EFF6FF)] border border-[#DBEAFE] rounded-md px-2.5 py-2 flex items-start gap-2 max-w-[260px]">
                          <Sparkles className="w-3.5 h-3.5 text-[var(--ds-text-brand, #2563EB)] flex-shrink-0 mt-0.5" />
                          <div className="text-[12px] leading-relaxed">
                            <span className="font-semibold text-[var(--ds-text-brand, #2563EB)]">Suggested:</span>{' '}
                            <span className="text-[var(--ds-text, #0F172A)]">{rec.releaseName}</span>
                            <br />
                            <span className="text-[var(--ds-text-subtlest, #64748B)]">{rec.reason}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[var(--ds-text-subtlest, #94A3B8)] text-[12px]">No suggestion</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {rec ? (
                          <button onClick={() => linkChangeToRelease(c.id, rec.releaseId)}
                            className="h-7 px-3 rounded text-[11px] font-semibold text-white"
                            style={{ background: 'var(--ds-text-brand, #2563EB)' }}>
                            Link Release
                          </button>
                        ) : (
                          <TriageLinkDropdown releases={releases} onLink={(releaseId) => linkChangeToRelease(c.id, releaseId)} />
                        )}
                        <button onClick={() => ignoreTriageItem(c.id)}
                          className="h-7 px-3 rounded text-[11px] font-medium border border-[rgba(15,23,42,0.12)] dark:border-[var(--ds-border, #2E2E2E)] bg-white dark:bg-[var(--ds-surface-raised, #1A1A1A)] text-[var(--ds-text-subtlest, #94A3B8)] hover:text-[var(--ds-text-subtle, #475569)]">
                          Ignore
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TriageLinkDropdown({ releases, onLink }: { releases: any[]; onLink: (releaseId: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="h-7 px-3 rounded text-[11px] font-semibold border border-[rgba(15,23,42,0.12)] dark:border-[var(--ds-border, #2E2E2E)] bg-white dark:bg-[var(--ds-surface-raised, #1A1A1A)] text-[var(--ds-text-brand, #2563EB)] flex items-center gap-1">
        Link Release <ChevronDown size={10} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[var(--ds-surface-raised, #1A1A1A)] rounded-md shadow-lg border border-[rgba(15,23,42,0.12)] dark:border-[var(--ds-border, #2E2E2E)] z-50 py-1 max-h-48 overflow-y-auto">
            {releases.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-[var(--ds-text-subtlest, #94A3B8)]">No releases available</div>
            ) : releases.map((r: any) => (
              <button key={r.id} onClick={() => { onLink(r.id); setOpen(false); }}
                className="w-full px-3 h-8 text-left text-[12px] font-medium hover:bg-[var(--ds-surface-sunken, #F8FAFC)] text-[var(--ds-text-subtle, #475569)]">{r.name}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
