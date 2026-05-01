/**
 * RequestRisksTab — Risk register with 5×5 matrix, severity badges, risk cards, and add drawer.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { logRequestAudit } from '@/lib/requestAudit';
import { Plus, ShieldAlert, X, ChevronDown, Search } from 'lucide-react';
import { useProfileOptions } from '@/hooks/useRequestLookups';

interface RequestRisksTabProps {
  requestId: string;
}

const SEVERITY_BANDS = [
  { label: 'Critical', min: 20, max: 25, dot: 'bg-red-500', bg: 'bg-red-50 border-red-200', text: 'text-red-700' },
  { label: 'High', min: 15, max: 19, dot: 'bg-orange-500', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
  { label: 'Medium', min: 8, max: 14, dot: 'bg-amber-500', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
  { label: 'Low', min: 1, max: 7, dot: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
];

const CATEGORIES = ['technical', 'financial', 'resource', 'schedule', 'scope', 'external', 'compliance', 'organizational'];

function getSeverity(score: number) {
  if (score >= 20) return { label: 'Critical', border: 'border-l-red-500', badge: 'bg-red-100 text-red-700' };
  if (score >= 15) return { label: 'High', border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-700' };
  if (score >= 8) return { label: 'Medium', border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700' };
  return { label: 'Low', border: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700' };
}

function getStatusBg(status: string) {
  if (status === 'open') return 'bg-blue-50 text-blue-700';
  if (status === 'mitigating') return 'bg-amber-50 text-amber-700';
  if (status === 'mitigated') return 'bg-emerald-50 text-emerald-700';
  if (status === 'closed') return 'bg-zinc-100 text-zinc-600';
  if (status === 'occurred') return 'bg-red-50 text-red-700';
  return 'bg-zinc-100 text-zinc-600';
}

export function RequestRisksTab({ requestId }: RequestRisksTabProps) {
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [riskForm, setRiskForm] = useState({
    title: '', description: '', category: 'technical', probability: 3, impact: 3,
    mitigation_plan: '', contingency_plan: '', owner_id: '', due_date: '',
  });
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const { data: profileOptions } = useProfileOptions();

  const { data: risks = [], refetch: refetchRisks } = useQuery({
    queryKey: ['request-risks', requestId],
    queryFn: async () => {
      const { data, error } = await typedQuery('ph_request_risks')
        .select('*, owner:profiles!owner_id(id, full_name, email)')
        .eq('request_id', requestId)
        .order('risk_score', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!requestId,
  });

  const handleCreateRisk = async () => {
    if (!riskForm.title.trim()) return;
    const maxKey = risks.reduce((max: number, r: any) => {
      const num = parseInt(r.risk_key?.replace('RSK-', '') || '0');
      return num > max ? num : max;
    }, 0);
    const nextKey = `RSK-${String(maxKey + 1).padStart(3, '0')}`;

    const { error } = await typedQuery('ph_request_risks').insert({
      request_id: requestId,
      risk_key: nextKey,
      title: riskForm.title.trim(),
      description: riskForm.description.trim() || null,
      category: riskForm.category,
      probability: riskForm.probability,
      impact: riskForm.impact,
      // risk_score is a GENERATED column — DB computes it as (probability * impact)
      mitigation_plan: riskForm.mitigation_plan.trim() || null,
      contingency_plan: riskForm.contingency_plan.trim() || null,
      owner_id: riskForm.owner_id || null,
      due_date: riskForm.due_date || null,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    } as any);

    if (error) { catalystToast.error('Failed to create risk'); return; }
    catalystToast.success(`${nextKey} created`);
    logRequestAudit({
      request_id: requestId,
      action: 'risk_added',
      entity_type: 'risk',
      new_value: JSON.stringify({ risk_key: nextKey, title: riskForm.title.trim(), category: riskForm.category, risk_score: riskForm.probability * riskForm.impact }),
    });
    refetchRisks();
    setShowAddRisk(false);
    setRiskForm({ title: '', description: '', category: 'technical', probability: 3, impact: 3, mitigation_plan: '', contingency_plan: '', owner_id: '', due_date: '' });
  };

  const getRiskCount = (prob: number, imp: number) =>
    risks.filter((r: any) => r.probability === prob && r.impact === imp).length;

  const liveScore = riskForm.probability * riskForm.impact;
  const liveSeverity = liveScore >= 20 ? 'Critical' : liveScore >= 15 ? 'High' : liveScore >= 8 ? 'Medium' : 'Low';
  const scoreBg = liveScore >= 20 ? 'bg-red-100 text-red-700 border-red-200' :
                  liveScore >= 15 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                  liveScore >= 8 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  'bg-emerald-100 text-emerald-700 border-emerald-200';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Risk Register</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {risks.length} risk{risks.length !== 1 ? 's' : ''} identified
          </p>
        </div>
        <button onClick={() => setShowAddRisk(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Risk
        </button>
      </div>

      {/* Severity badges */}
      <div className="flex items-center gap-3 mb-6">
        {SEVERITY_BANDS.map(({ label, min, max, dot, bg, text }) => {
          const count = risks.filter((r: any) => r.risk_score >= min && r.risk_score <= max).length;
          return (
            <div key={label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${bg}`}>
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              <span className={`text-xs font-medium ${text}`}>{count} {label}</span>
            </div>
          );
        })}
      </div>

      {/* Risk Matrix — always visible */}
      {(
        <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50 mb-6">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">Risk Matrix</p>
          <div className="flex gap-2">
            <div className="flex flex-col justify-between py-1 pr-1">
              {[5,4,3,2,1].map(v => <span key={v} className="text-[10px] text-zinc-400">{v}</span>)}
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-5 gap-0.5">
                {[5,4,3,2,1].map(prob =>
                  [1,2,3,4,5].map(imp => {
                    const score = prob * imp;
                    const count = getRiskCount(prob, imp);
                    const bg = score >= 20 ? 'bg-red-200 text-red-800' :
                               score >= 15 ? 'bg-orange-200 text-orange-800' :
                               score >= 8 ? 'bg-amber-100 text-amber-800' :
                               'bg-emerald-100 text-emerald-800';
                    return (
                      <div key={`${prob}-${imp}`} className={`${bg} rounded-sm h-8 flex items-center justify-center text-[11px] font-semibold`}>
                        {count > 0 ? count : ''}
                      </div>
                    );
                  })
                ).flat()}
              </div>
              <div className="grid grid-cols-5 gap-0.5 mt-1">
                {[1,2,3,4,5].map(i => <span key={i} className="text-[10px] text-zinc-400 text-center">{i}</span>)}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-zinc-400 italic">Probability ↑</span>
            <span className="text-[10px] text-zinc-400 italic">Impact →</span>
          </div>
        </div>
      )}

      {/* Risk Cards */}
      {risks.length === 0 ? (
        <div className="border border-zinc-200 rounded-lg px-4 py-12 text-center">
          <div className="mx-auto w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-600">No risks identified</p>
          <p className="text-xs text-zinc-400 mt-1">Add risks to track threats and mitigation plans</p>
          <button onClick={() => setShowAddRisk(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
            <Plus className="w-4 h-4" /> Add Risk
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {risks.map((risk: any) => {
            const sev = getSeverity(risk.risk_score || 0);
            return (
              <div key={risk.id} className={`bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-zinc-200 dark:border-[var(--ds-border,#2E2E2E)] border-l-4 ${sev.border} rounded-lg p-4`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">{risk.risk_key}</span>
                    <h4 className="text-sm font-semibold text-zinc-900">{risk.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getStatusBg(risk.status || '')}`}>
                      {(risk.status || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.badge}`}>
                      {risk.risk_score} ({sev.label})
                    </span>
                  </div>
                </div>
                {risk.description && <p className="text-xs text-zinc-600 mb-3 line-clamp-2">{risk.description}</p>}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase">Category</p>
                    <p className="text-xs text-zinc-700 capitalize">{risk.category}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase">Probability</p>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[1,2,3,4,5].map(i => <div key={i} className={`w-3 h-3 rounded-sm ${i <= (risk.probability || 0) ? 'bg-blue-500' : 'bg-zinc-200'}`} />)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase">Impact</p>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[1,2,3,4,5].map(i => <div key={i} className={`w-3 h-3 rounded-sm ${i <= (risk.impact || 0) ? 'bg-orange-500' : 'bg-zinc-200'}`} />)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase">Due Date</p>
                    <p className="text-xs text-zinc-700">
                      {risk.due_date ? new Date(risk.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>
                {risk.mitigation_plan && (
                  <div className="bg-zinc-50 rounded-md px-3 py-2 mb-2">
                    <p className="text-[10px] text-zinc-400 uppercase mb-0.5">Mitigation Plan</p>
                    <p className="text-xs text-zinc-600 italic">{risk.mitigation_plan}</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                  <div className="flex items-center gap-2">
                    {risk.owner?.full_name && (
                      <>
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-[9px] font-semibold text-white">
                            {risk.owner.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-600">{risk.owner.full_name}</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    Raised {risk.raised_date ? new Date(risk.raised_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Risk Drawer */}
      {showAddRisk && (
        <>
          <div className="fixed inset-0 z-[300] bg-black/20" onClick={() => setShowAddRisk(false)} />
          <div className="fixed top-0 right-0 h-full w-[420px] max-w-[90vw] z-[301] bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 shrink-0">
              <h3 className="text-sm font-semibold text-zinc-900">Add Risk</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAddRisk(false)} className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-md">Cancel</button>
                <button onClick={handleCreateRisk} disabled={!riskForm.title.trim()}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                  <Plus className="w-3 h-3 inline mr-1" />Save
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5 block">Title *</label>
                <input value={riskForm.title} onChange={e => setRiskForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Risk title..." className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              {/* Description */}
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5 block">Description</label>
                <textarea value={riskForm.description} onChange={e => setRiskForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Describe the risk..." className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y" />
              </div>
              {/* Category dropdown */}
              <div className="relative">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5 block">Category</label>
                <button type="button" onClick={() => setShowCatDropdown(v => !v)}
                  className="w-full flex items-center justify-between border border-zinc-200 dark:border-[var(--ds-border,#2E2E2E)] rounded-lg px-3 py-2.5 text-sm text-zinc-700 bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] hover:bg-zinc-50 dark:hover:bg-[var(--ds-surface,#0A0A0A)]">
                  <span className="capitalize">{riskForm.category}</span>
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </button>
                {showCatDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-zinc-200 dark:border-[var(--ds-border,#2E2E2E)] rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => { setRiskForm(f => ({ ...f, category: cat })); setShowCatDropdown(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs capitalize transition-colors ${riskForm.category === cat ? 'bg-blue-50 text-blue-700 font-medium' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Probability & Impact */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 block">Probability</label>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(v => (
                      <button key={v} type="button" onClick={() => setRiskForm(f => ({ ...f, probability: v }))}
                        className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${riskForm.probability === v ? 'bg-blue-600 text-white shadow-sm' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1"><span className="text-[10px] text-zinc-400">Very Low</span><span className="text-[10px] text-zinc-400">Very High</span></div>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 block">Impact</label>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(v => (
                      <button key={v} type="button" onClick={() => setRiskForm(f => ({ ...f, impact: v }))}
                        className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${riskForm.impact === v ? 'bg-orange-600 text-white shadow-sm' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1"><span className="text-[10px] text-zinc-400">Very Low</span><span className="text-[10px] text-zinc-400">Very High</span></div>
                </div>
              </div>
              {/* Live Score */}
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5 block">Risk Score</label>
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${scoreBg}`}>
                  <span className="text-lg font-bold">{liveScore}</span>
                  <span className="text-xs font-medium">— {liveSeverity}</span>
                </div>
              </div>
              {/* Mitigation */}
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5 block">Mitigation Plan</label>
                <textarea value={riskForm.mitigation_plan} onChange={e => setRiskForm(f => ({ ...f, mitigation_plan: e.target.value }))}
                  rows={2} placeholder="How to prevent or reduce this risk..." className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
              </div>
              {/* Contingency */}
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5 block">Contingency Plan</label>
                <textarea value={riskForm.contingency_plan} onChange={e => setRiskForm(f => ({ ...f, contingency_plan: e.target.value }))}
                  rows={2} placeholder="What to do if this risk occurs..." className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
              </div>
              {/* Due Date */}
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5 block">Due Date</label>
                <input type="date" value={riskForm.due_date} onChange={e => setRiskForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
