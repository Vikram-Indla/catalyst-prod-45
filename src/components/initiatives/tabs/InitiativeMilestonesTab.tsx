/**
 * InitiativeMilestonesTab — Timeline dots, progress bar, milestone cards, inline add form.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { Plus, Flag, Check, ChevronDown } from 'lucide-react';

interface InitiativeMilestonesTabProps {
  initiativeId: string;
}

const TYPES = ['phase_gate', 'deliverable', 'decision_point', 'external_dependency', 'event'];
const TYPE_LABELS: Record<string, string> = {
  phase_gate: 'Phase Gate', deliverable: 'Deliverable', decision_point: 'Decision Point',
  external_dependency: 'External Dependency', event: 'Event',
};

export function InitiativeMilestonesTab({ initiativeId }: InitiativeMilestonesTabProps) {
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [msForm, setMsForm] = useState({
    title: '', description: '', type: 'deliverable', planned_date: '', owner_id: '',
    completion_criteria: '', budget_release: '', is_critical_path: false,
  });

  const { data: milestones = [], refetch: refetchMilestones } = useQuery({
    queryKey: ['initiative-milestones', initiativeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_initiative_milestones')
        .select('*, owner:profiles!owner_id(id, full_name, email)')
        .eq('initiative_id', initiativeId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!initiativeId,
  });

  const handleCreateMilestone = async () => {
    if (!msForm.title.trim() || !msForm.planned_date) return;
    const nextOrder = milestones.length > 0 ? Math.max(...milestones.map((m: any) => m.sort_order || 0)) + 1 : 1;
    const { error } = await supabase.from('ph_initiative_milestones').insert({
      initiative_id: initiativeId, title: msForm.title.trim(),
      description: msForm.description.trim() || null, type: msForm.type,
      planned_date: msForm.planned_date, owner_id: msForm.owner_id || null,
      completion_criteria: msForm.completion_criteria.trim() || null,
      budget_release: msForm.budget_release ? parseFloat(msForm.budget_release) : 0,
      is_critical_path: msForm.is_critical_path, sort_order: nextOrder,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    } as any);
    if (error) { catalystToast.error('Failed to create milestone'); return; }
    catalystToast.success('Milestone created');
    refetchMilestones();
    setShowAddMilestone(false);
    setMsForm({ title: '', description: '', type: 'deliverable', planned_date: '', owner_id: '', completion_criteria: '', budget_release: '', is_critical_path: false });
  };

  const completed = milestones.filter((m: any) => m.status === 'completed').length;
  const inProgress = milestones.filter((m: any) => m.status === 'in_progress').length;
  const missed = milestones.filter((m: any) => m.status === 'missed').length;
  const pct = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Milestones</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{completed} of {milestones.length} completed</p>
        </div>
        <button onClick={() => setShowAddMilestone(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Milestone
        </button>
      </div>

      {/* Progress Bar */}
      {milestones.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-700">{pct}% Complete</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500" /> {completed} Done</span>
              <span className="flex items-center gap-1 text-[10px] text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-500" /> {inProgress} Active</span>
              {missed > 0 && <span className="flex items-center gap-1 text-[10px] text-red-600"><span className="w-2 h-2 rounded-full bg-red-500" /> {missed} Missed</span>}
            </div>
          </div>
          <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Timeline Dots */}
      {milestones.length > 0 && (
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {milestones.map((m: any, idx: number) => {
            const dotColor = m.status === 'completed' ? 'bg-emerald-500' : m.status === 'in_progress' ? 'bg-blue-500' :
              m.status === 'missed' ? 'bg-red-500' : m.status === 'deferred' ? 'bg-zinc-300' : 'bg-zinc-200';
            const borderColor = m.status === 'completed' ? 'border-emerald-500' : m.status === 'in_progress' ? 'border-blue-500' :
              m.status === 'missed' ? 'border-red-500' : 'border-zinc-300';
            const isFilled = ['completed', 'in_progress', 'missed'].includes(m.status);
            return (
              <div key={m.id} className="flex items-center flex-shrink-0">
                {idx > 0 && <div className={`w-8 h-0.5 ${m.status === 'completed' ? 'bg-emerald-300' : 'bg-zinc-200'}`} />}
                <div className="flex flex-col items-center" style={{ minWidth: '64px' }}>
                  <div className={`w-4 h-4 rounded-full border-2 ${borderColor} ${isFilled ? dotColor : 'bg-white'} flex items-center justify-center`}>
                    {m.status === 'completed' && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-[9px] text-zinc-500 mt-1 text-center leading-tight max-w-[60px] truncate">{m.title}</span>
                  <span className="text-[9px] text-zinc-400">{m.planned_date ? new Date(m.planned_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Add Form */}
      {showAddMilestone && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 space-y-4">
          <h4 className="text-xs font-semibold text-zinc-700">New Milestone</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Title *</label>
              <input value={msForm.title} onChange={e => setMsForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Milestone name..." className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            <div className="relative">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Type</label>
              <button type="button" onClick={() => setShowTypeDropdown(v => !v)}
                className="w-full flex items-center justify-between border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-700 bg-white hover:bg-zinc-50">
                <span>{TYPE_LABELS[msForm.type]}</span><ChevronDown className="w-4 h-4 text-zinc-400" />
              </button>
              {showTypeDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 py-1">
                  {TYPES.map(t => (
                    <button key={t} onClick={() => { setMsForm(f => ({ ...f, type: t })); setShowTypeDropdown(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${msForm.type === t ? 'bg-blue-50 text-blue-700 font-medium' : 'text-zinc-600 hover:bg-zinc-50'}`}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Planned Date *</label>
            <input type="date" value={msForm.planned_date} onChange={e => setMsForm(f => ({ ...f, planned_date: e.target.value }))}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Completion Criteria</label>
            <textarea value={msForm.completion_criteria} onChange={e => setMsForm(f => ({ ...f, completion_criteria: e.target.value }))}
              rows={2} placeholder="What must be true for this to be done..." className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-y" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Budget Release (SAR)</label>
              <input type="number" value={msForm.budget_release} onChange={e => setMsForm(f => ({ ...f, budget_release: e.target.value }))}
                placeholder="0.00" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                <input type="checkbox" checked={msForm.is_critical_path} onChange={e => setMsForm(f => ({ ...f, is_critical_path: e.target.checked }))}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
                Critical Path Milestone
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button onClick={() => setShowAddMilestone(false)} className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-md">Cancel</button>
            <button onClick={handleCreateMilestone} disabled={!msForm.title.trim() || !msForm.planned_date}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">Save Milestone</button>
          </div>
        </div>
      )}

      {/* Milestone Cards */}
      {milestones.length === 0 && !showAddMilestone ? (
        <div className="border border-zinc-200 rounded-lg px-4 py-12 text-center">
          <div className="mx-auto w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-3">
            <Flag className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-600">No milestones set</p>
          <p className="text-xs text-zinc-400 mt-1">Add milestones to track key checkpoints and deliverables</p>
          <button onClick={() => setShowAddMilestone(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
            <Plus className="w-4 h-4" /> Add Milestone
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {milestones.map((m: any, idx: number) => {
            const statusIcon = m.status === 'completed' ? '✅' : m.status === 'in_progress' ? '🔵' :
              m.status === 'missed' ? '🔴' : m.status === 'deferred' ? '⏸️' : '○';
            const typeLabel = TYPE_LABELS[m.type] || m.type;
            const planned = m.planned_date ? new Date(m.planned_date) : null;
            const today = new Date();
            const daysUntil = planned ? Math.ceil((planned.getTime() - today.getTime()) / (1000*60*60*24)) : null;
            let dateNote = '';
            if (m.status === 'completed' && m.actual_date && planned) {
              const actual = new Date(m.actual_date);
              const diff = Math.ceil((planned.getTime() - actual.getTime()) / (1000*60*60*24));
              dateNote = diff > 0 ? `${diff} day${diff!==1?'s':''} early` : diff < 0 ? `${Math.abs(diff)} day${Math.abs(diff)!==1?'s':''} late` : 'on time';
            } else if (m.status !== 'completed' && daysUntil !== null) {
              dateNote = daysUntil > 0 ? `${daysUntil} day${daysUntil!==1?'s':''} remaining` : daysUntil === 0 ? 'Due today' : `${Math.abs(daysUntil)} day${Math.abs(daysUntil)!==1?'s':''} overdue`;
            }
            return (
              <div key={m.id} className="bg-white border border-zinc-200 rounded-lg p-4 hover:border-zinc-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-zinc-500">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{statusIcon}</span>
                        <h4 className="text-sm font-semibold text-zinc-900">{m.title}</h4>
                        {m.is_critical_path && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">Critical Path</span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 flex-shrink-0 ml-2">
                        {planned ? planned.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                    {dateNote && (
                      <p className={`text-[11px] mt-0.5 ${m.status === 'completed' ? 'text-emerald-600' : (daysUntil !== null && daysUntil < 0) ? 'text-red-600' : 'text-zinc-400'}`}>
                        {m.status === 'completed' ? `Completed ${m.actual_date ? new Date(m.actual_date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : ''} — ${dateNote}` : dateNote}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{typeLabel}</span>
                      {m.owner?.full_name && (
                        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-[8px] font-semibold text-white">{m.owner.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}</span>
                          </div>
                          {m.owner.full_name}
                        </span>
                      )}
                      {m.budget_release && m.budget_release > 0 && (
                        <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
                          SAR {Number(m.budget_release).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {m.completion_criteria && <p className="text-[11px] text-zinc-500 mt-2 italic">Criteria: {m.completion_criteria}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
