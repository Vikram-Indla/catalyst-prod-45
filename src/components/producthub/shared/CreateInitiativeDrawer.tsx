/**
 * CreateInitiativeDrawer — Slide-in form for creating a new initiative.
 * Stage C redesign: dark header, grouped sections, type selector, roadmap toggle.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, FileText, Tag, Users, Calendar, Map, Bot, FolderKanban, Zap, Wrench, RefreshCw, GitMerge, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalystToast } from '@/lib/catalystToast';
import { useDepartmentOptions, useProfileOptions } from '@/hooks/useInitiativeLookups';
import { useInitiativeTypes } from '@/hooks/useInitiativeTypes';
import { StatusSelect } from './StatusSelect';
import { QuarterSelect } from './QuarterSelect';
import { PeopleSelect } from './PeopleSelect';
import { DepartmentSelect } from './DepartmentSelect';

export interface ConversionSource {
  type: 'single' | 'merge';
  primaryIdea: { key: string; title: string; description?: string; impact: number; votes: number; dept: string; assignee?: string; priority: string };
  mergeIdea?: { key: string; title: string; description?: string; impact: number; votes: number };
}

interface CreateInitiativeDrawerProps {
  open: boolean;
  onClose: () => void;
  conversionSource?: ConversionSource | null;
  onCreated?: (initiativeKey: string) => void;
}

function useNextInitiativeKey() {
  return useQuery({
    queryKey: ['next-initiative-key'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('ph_initiatives')
        .select('initiative_key');
      if (data && data.length > 0) {
        let maxNum = 0;
        for (const row of data) {
          const match = row.initiative_key?.match(/MIM-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
        return `MIM-${String(maxNum + 1).padStart(3, '0')}`;
      }
      return 'MIM-001';
    },
    staleTime: 0,
  });
}

function useCreateInitiative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newInit: Record<string, any>) => {
      const { data, error } = await (supabase as any)
        .from('ph_initiatives')
        .insert({
          title: newInit.title,
          description: newInit.description || null,
          status: newInit.status || 'new',
          department_id: newInit.department_id || null,
          assignee_id: newInit.assignee_id || null,
          business_owner_id: newInit.business_owner_id || null,
          reporter_id: newInit.reporter_id || null,
          target_quarter: newInit.target_quarter || null,
          kickoff_date: newInit.kickoff_date || null,
          target_complete: newInit.target_complete || null,
          business_ask_date: newInit.business_ask_date || null,
          initiative_key: newInit.initiative_key,
          progress: 0,
          sort_order: 0,
          is_archived: false,
          initiative_type_id: newInit.initiative_type_id || null,
          on_roadmap: newInit.on_roadmap || false,
          roadmap_added_at: newInit.on_roadmap ? new Date().toISOString() : null,
          health_status: newInit.health_status || 'on_track',
          business_value: newInit.business_value || null,
          estimated_budget: newInit.estimated_budget || null,
          roadmap_priority: newInit.roadmap_priority || null,
          tags: newInit.tags || [],
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ph-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
      queryClient.invalidateQueries({ queryKey: ['next-initiative-key'] });
      queryClient.invalidateQueries({ queryKey: ['backlog-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-summary'] });
      catalystToast.success(`${data.initiative_key} created`);
    },
    onError: (err: Error) => {
      catalystToast.error('Failed to create: ' + err.message);
    },
  });
}

const TYPE_OPTIONS: { key: string; label: string; Icon: LucideIcon; color: string }[] = [
  { key: 'project', label: 'Project', Icon: FolderKanban, color: '#2563EB' },
  { key: 'enhancement', label: 'Enhancement', Icon: Zap, color: '#0D9488' },
  { key: 'improvement', label: 'Improvement', Icon: Wrench, color: '#D97706' },
];

const LABEL = "block text-[11px] font-semibold text-[#334155] uppercase tracking-[0.05em] mb-1.5";
const INPUT = "w-full h-9 px-3 text-[13px] bg-white border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow placeholder:text-[#94A3B8]";

export function CreateInitiativeDrawer({ open, onClose, conversionSource, onCreated }: CreateInitiativeDrawerProps) {
  const { data: nextKey } = useNextInitiativeKey();
  const createMutation = useCreateInitiative();
  const { data: departmentOptions } = useDepartmentOptions();
  const { data: profileOptions } = useProfileOptions();
  const { data: initiativeTypes } = useInitiativeTypes();

  const [form, setForm] = useState({
    title: '', description: '', status: 'new',
    department_id: '', assignee_id: '', business_owner_id: '',
    reporter_id: '', target_quarter: '', kickoff_date: '',
    target_complete: '', business_ask_date: '',
  });
  const [titleError, setTitleError] = useState(false);
  const [selectedType, setSelectedType] = useState('project');
  const [onRoadmap, setOnRoadmap] = useState(false);
  const [roadmapPriority, setRoadmapPriority] = useState('');
  const [healthStatus, setHealthStatus] = useState('on_track');
  const [businessValue, setBusinessValue] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');

  const resetNewFields = () => {
    setSelectedType('project');
    setOnRoadmap(false);
    setRoadmapPriority('');
    setHealthStatus('on_track');
    setBusinessValue('');
    setEstimatedBudget('');
  };

  useEffect(() => {
    if (open) {
      if (conversionSource) {
        const src = conversionSource;
        const resolveDeptId = (deptName?: string): string => {
          if (!deptName || !departmentOptions) return '';
          const exact = departmentOptions.find((d: any) => d.label.toLowerCase() === deptName.toLowerCase());
          if (exact) return exact.value;
          const q = deptName.toLowerCase().replace(/[.\s]+/g, '');
          const partial = departmentOptions.find((d: any) => {
            const dl = d.label.toLowerCase().replace(/[.\s]+/g, '');
            return dl.includes(q) || q.includes(dl);
          });
          return partial?.value || '';
        };
        const resolveAssigneeId = (name?: string): string => {
          if (!name || !profileOptions) return '';
          const q = name.toLowerCase().replace(/[.\s]+/g, '');
          const match = profileOptions.find((p: any) => {
            const pl = (p.label || '').toLowerCase().replace(/[.\s]+/g, '');
            return pl.includes(q) || q.includes(pl);
          });
          return match?.value || '';
        };

        if (src.type === 'single') {
          const p = src.primaryIdea;
          setForm({
            title: p.title,
            description: `Converted from Ideation · ${p.key}\n\n${p.description || p.title}\n\n---\nIMPACT Score: ${p.impact.toFixed(2)}/5.00\nVotes: ${p.votes} · Priority: ${p.priority}`,
            status: 'new', department_id: resolveDeptId(p.dept),
            assignee_id: resolveAssigneeId(p.assignee), business_owner_id: '',
            reporter_id: '', target_quarter: '', kickoff_date: '', target_complete: '', business_ask_date: '',
          });
        } else if (src.type === 'merge' && src.mergeIdea) {
          const p = src.primaryIdea;
          const m = src.mergeIdea;
          setForm({
            title: `${p.title} & ${m.title.split(' ').slice(0, 3).join(' ')} Platform`,
            description: `Consolidated from 2 ideation submissions:\n\n• ${p.key}: ${p.title} (IMPACT ${p.impact.toFixed(2)}, ${p.votes} votes)\n• ${m.key}: ${m.title} (IMPACT ${m.impact.toFixed(2)}, ${m.votes} votes)\n\n---\nCombined IMPACT: ${p.impact.toFixed(2)} (weighted by vote count)\nTotal votes: ${p.votes + m.votes}`,
            status: 'new', department_id: resolveDeptId(p.dept),
            assignee_id: resolveAssigneeId(p.assignee), business_owner_id: '',
            reporter_id: '', target_quarter: '', kickoff_date: '', target_complete: '', business_ask_date: '',
          });
        }
      } else {
        setForm({
          title: '', description: '', status: 'new',
          department_id: '', assignee_id: '', business_owner_id: '',
          reporter_id: '', target_quarter: '', kickoff_date: '',
          target_complete: '', business_ask_date: '',
        });
      }
      setTitleError(false);
      resetNewFields();
    }
  }, [open, conversionSource, departmentOptions, profileOptions]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const updateField = useCallback((field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'title') setTitleError(false);
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) { setTitleError(true); return; }
    const key = nextKey || 'MIM-001';
    const typeId = initiativeTypes?.find((t: any) => t.key === selectedType)?.id || null;
    await createMutation.mutateAsync({
      ...form,
      initiative_key: key,
      initiative_type_id: typeId,
      on_roadmap: onRoadmap,
      health_status: healthStatus || 'on_track',
      business_value: businessValue || null,
      estimated_budget: estimatedBudget ? parseFloat(estimatedBudget) : null,
      roadmap_priority: roadmapPriority ? parseInt(roadmapPriority) : null,
    });
    onCreated?.(key);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[200]"
            style={{ background: 'rgba(0,0,0,0.20)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-0 right-0 h-screen z-[201] flex flex-col overflow-hidden bg-white"
            style={{ width: '55%', maxWidth: 840, minWidth: 480, boxShadow: '-8px 0 24px rgba(0,0,0,0.12)' }}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Dark Header */}
            <div className="flex-shrink-0 px-5 py-3.5 flex items-center justify-between" style={{ background: '#0F172A' }}>
              <div>
                <h2 className="text-[15px] font-bold text-white">New Initiative</h2>
                {nextKey && (
                  <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: '#0D9488', color: '#fff' }}>
                    {nextKey}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto">
              {/* Conversion Banners */}
              {conversionSource?.type === 'single' && (
                <div className="mx-5 mt-4 p-3 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div className="text-[13px] font-bold flex items-center gap-1.5" style={{ color: '#0F172A' }}><RefreshCw className="w-3.5 h-3.5" /> Converting idea to initiative</div>
                  <div className="text-[12px] mt-1" style={{ color: '#334155' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#2563EB' }}>{conversionSource.primaryIdea.key}</span>
                    {' · '}{conversionSource.primaryIdea.title}
                  </div>
                </div>
              )}
              {conversionSource?.type === 'merge' && conversionSource.mergeIdea && (
                <div className="mx-5 mt-4 p-3 rounded-lg" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                  <div className="text-[13px] font-bold flex items-center gap-1.5" style={{ color: '#0F172A' }}><GitMerge className="w-3.5 h-3.5" /> Merging 2 ideas into 1 initiative</div>
                  <div className="text-[12px] mt-1" style={{ color: '#334155' }}>
                    Primary: <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#2563EB' }}>{conversionSource.primaryIdea.key}</span>
                    {' · '}{conversionSource.primaryIdea.title}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: '#334155' }}>
                    Merging: <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#2563EB' }}>{conversionSource.mergeIdea.key}</span>
                    {' · '}{conversionSource.mergeIdea.title}
                  </div>
                </div>
              )}

              {/* Section 1: Details */}
              <div className="px-5 py-4 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] mb-3" style={{ color: '#0F172A' }}>
                  <FileText className="w-3.5 h-3.5" /> Details
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={LABEL}>Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={e => updateField('title', e.target.value)}
                      placeholder="e.g. Digital Platform Modernization"
                      className={cn(INPUT, titleError && 'border-red-500 ring-2 ring-red-500/20')}
                      autoFocus
                    />
                    {titleError && <p className="text-xs text-red-500 mt-1">Title is required</p>}
                  </div>
                  <div>
                    <label className={LABEL}>Description</label>
                    <textarea
                      value={form.description}
                      onChange={e => updateField('description', e.target.value)}
                      placeholder="Brief description of the initiative scope and objectives..."
                      rows={3}
                      className="w-full px-3 py-2 text-[13px] bg-white border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-shadow placeholder:text-[#94A3B8]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Classification */}
              <div className="px-5 py-4 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] mb-3" style={{ color: '#0F172A' }}>
                  <Tag className="w-3.5 h-3.5" /> Classification
                </div>
                <div className="space-y-3">
                  {/* Type Selector */}
                  <div>
                    <label className={LABEL}>Initiative Type</label>
                    <div className="grid grid-cols-3 gap-1.5 bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0]">
                      {TYPE_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setSelectedType(opt.key)}
                          className={cn(
                            'flex flex-col items-center p-2 rounded-md cursor-pointer transition-all border-2',
                            selectedType === opt.key
                              ? 'bg-white shadow-sm'
                              : 'border-transparent hover:bg-white/60'
                          )}
                          style={{ borderColor: selectedType === opt.key ? opt.color : 'transparent' }}
                        >
                          <opt.Icon className="w-[18px] h-[18px]" style={{ color: selectedType === opt.key ? opt.color : '#64748B' }} />
                          <span className="text-[11px] font-semibold mt-0.5" style={{ color: '#334155' }}>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Status + Department */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Status</label>
                      <StatusSelect value={form.status} onChange={v => updateField('status', v)} />
                    </div>
                    <div>
                      <label className={LABEL}>Department</label>
                      <DepartmentSelect
                        value={form.department_id}
                        onChange={v => updateField('department_id', v)}
                        departments={departmentOptions || []}
                      />
                    </div>
                  </div>
                  {/* Business Value + Health */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Business Value</label>
                      <select value={businessValue} onChange={e => setBusinessValue(e.target.value)} className={cn(INPUT, 'appearance-none')}>
                        <option value="">Not set</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Health Status</label>
                      <select value={healthStatus} onChange={e => setHealthStatus(e.target.value)} className={cn(INPUT, 'appearance-none')}>
                        <option value="on_track">On Track</option>
                        <option value="at_risk">At Risk</option>
                        <option value="off_track">Off Track</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: People */}
              <div className="px-5 py-4 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] mb-3" style={{ color: '#0F172A' }}>
                  <Users className="w-3.5 h-3.5" /> People
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Assignee</label>
                      <PeopleSelect value={form.assignee_id} onChange={v => updateField('assignee_id', v)} profiles={profileOptions || []} placeholder="Select assignee" />
                    </div>
                    <div>
                      <label className={LABEL}>Business Owner</label>
                      <PeopleSelect value={form.business_owner_id} onChange={v => updateField('business_owner_id', v)} profiles={profileOptions || []} placeholder="Select business owner" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Reporter</label>
                      <PeopleSelect value={form.reporter_id} onChange={v => updateField('reporter_id', v)} profiles={profileOptions || []} placeholder="Select reporter" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Planning */}
              <div className="px-5 py-4 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] mb-3" style={{ color: '#0F172A' }}>
                  <Calendar className="w-3.5 h-3.5" /> Planning
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Target Quarter</label>
                      <QuarterSelect value={form.target_quarter} onChange={v => updateField('target_quarter', v)} />
                    </div>
                    <div>
                      <label className={LABEL}>Estimated Budget</label>
                      <input
                        value={estimatedBudget}
                        onChange={e => setEstimatedBudget(e.target.value)}
                        placeholder="e.g. 500000"
                        className={INPUT}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Kickoff Date</label>
                      <input type="date" value={form.kickoff_date} onChange={e => updateField('kickoff_date', e.target.value)} className={cn(INPUT, 'appearance-none')} />
                    </div>
                    <div>
                      <label className={LABEL}>Target Complete</label>
                      <input type="date" value={form.target_complete} onChange={e => updateField('target_complete', e.target.value)} className={cn(INPUT, 'appearance-none')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Business Ask Date</label>
                      <input type="date" value={form.business_ask_date} onChange={e => updateField('business_ask_date', e.target.value)} className={cn(INPUT, 'appearance-none')} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Roadmap */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] mb-3" style={{ color: '#0F172A' }}>
                  <Map className="w-3.5 h-3.5" /> Roadmap
                </div>

                <div className={cn(
                  'rounded-lg p-3 border transition-colors',
                  onRoadmap ? 'bg-[#EFF6FF] border-[#BFDBFE]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: '#2563EB' }}><Map className="w-4 h-4" /></div>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>Add to Roadmap</div>
                        <div className="text-[11px]" style={{ color: '#64748B' }}>Make visible on the Product Roadmap timeline</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOnRoadmap(!onRoadmap)}
                      className={cn(
                        'relative w-10 h-[22px] rounded-full transition-colors',
                        onRoadmap ? 'bg-[#2563EB]' : 'bg-[#E2E8F0]'
                      )}
                    >
                      <span className={cn(
                        'absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform',
                        onRoadmap ? 'left-[20px]' : 'left-[2px]'
                      )} />
                    </button>
                  </div>

                  {onRoadmap && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#BFDBFE] grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Roadmap Priority</label>
                        <select value={roadmapPriority} onChange={e => setRoadmapPriority(e.target.value)} className={cn(INPUT, 'appearance-none border-[#BFDBFE]')}>
                          <option value="">Auto (by score)</option>
                          <option value="1">1 — Critical</option>
                          <option value="2">2 — High</option>
                          <option value="3">3 — Medium</option>
                          <option value="4">4 — Low</option>
                        </select>
                      </div>
                      <div>
                        <label className={LABEL}>Delivery Window</label>
                        <select disabled className={cn(INPUT, 'appearance-none border-[#BFDBFE] bg-[#F8FAFC]')} style={{ color: '#64748B' }}>
                          <option>{form.target_quarter || 'Set in Planning ↑'}</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Tip Banner */}
                <div className="flex items-start gap-2 p-2.5 rounded-lg mt-3" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                  <Bot className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#7C3AED' }} />
                  <p className="text-[11.5px] leading-relaxed" style={{ color: '#334155' }}>
                    <strong style={{ color: '#7C3AED' }} className="font-semibold">Req Assist™:</strong> Score will be calculated after the initiative is created. Use the Score tab to set scoring criteria.
                  </p>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-5 py-3 border-t border-[#E2E8F0] bg-white flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#E2E8F0] bg-white rounded-md text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors"
                style={{ color: '#334155' }}
              >
                Cancel
              </button>
              <div className="flex-1" />
              <button
                type="button"
                className="px-4 py-2 border rounded-md text-[13px] font-medium hover:bg-[#EFF6FF] transition-colors"
                style={{ borderColor: '#2563EB', color: '#2563EB' }}
              >
                + Create & Add Another
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createMutation.isPending || !form.title.trim()}
                className="px-5 py-2 text-white rounded-md text-[13px] font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                style={{ background: '#2563EB' }}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                + Create
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CreateInitiativeDrawer;
