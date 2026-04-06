/**
 * CreateInitiativeDialog — Centered modal for creating a new initiative.
 * MARAM V3.1 · Catalyst V11 Carbon Precision
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, FileText, Tag, Users, Calendar, RefreshCw, GitMerge } from 'lucide-react';
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
import { InitiativeTypeSelect } from './InitiativeTypeSelect';

/* ── Token constants ── */
const T = {
  ink: '#09090B', inkSec: '#18181B', inkMuted: '#71717A',
  surface: '#FFFFFF', surfSec: 'var(--bg-1, #1A1A1A)',
  border: 'var(--bd-default, rgba(255,255,255,0.10))', borderStrong: 'rgba(237,237,237,0.53)',
  primary: '#2563EB', primaryHover: '#1D4ED8', primaryBg: 'rgba(59,130,246,0.06)',
  danger: '#DC2626',
};

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

/* ── Hooks ── */
function useNextInitiativeKey() {
  return useQuery({
    queryKey: ['next-initiative-key'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('ph_initiatives').select('initiative_key');
      if (data && data.length > 0) {
        let maxNum = 0;
        for (const row of data) {
          const match = row.initiative_key?.match(/MIM-(\d+)/);
          if (match) { const num = parseInt(match[1], 10); if (num > maxNum) maxNum = num; }
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
          progress: 0, sort_order: 0, is_archived: false,
          initiative_type_id: newInit.initiative_type_id || null,
          on_roadmap: false,
        })
        .select().single();
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
    onError: (err: Error) => { catalystToast.error('Failed to create: ' + err.message); },
  });
}

const TYPE_OPTIONS = [
  { key: 'project', label: 'Project' },
  { key: 'enhancement', label: 'Enhancement' },
  { key: 'improvement', label: 'Improvement' },
  { key: 'entity_integration', label: 'Entity Integration' },
];

const EMPTY_FORM = {
  title: '', description: '', status: 'new',
  department_id: '', assignee_id: '', business_owner_id: '',
  reporter_id: '', target_quarter: '', kickoff_date: '',
  target_complete: '', business_ask_date: '',
};

/* ── Sub-components ── */
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-3 border-t" style={{ borderColor: T.border, marginTop: 4 }}>
      <span style={{ color: T.inkSec, display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.inkSec, fontFamily: "'Inter',sans-serif", letterSpacing: '.02em' }}>{label}</span>
    </div>
  );
}

function FieldWrapper({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: T.inkSec }}>
        {label}{required && <span style={{ color: T.danger, marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS = "w-full h-9 px-3 text-[13px] bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow placeholder:text-[#71717A]";

/* ── Main Component ── */
export function CreateInitiativeDrawer({ open, onClose, conversionSource, onCreated }: CreateInitiativeDrawerProps) {
  const { data: nextKey } = useNextInitiativeKey();
  const createMutation = useCreateInitiative();
  const { data: departmentOptions } = useDepartmentOptions();
  const { data: profileOptions } = useProfileOptions();
  const { data: initiativeTypes } = useInitiativeTypes();

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [titleError, setTitleError] = useState(false);
  const [selectedType, setSelectedType] = useState('project');
  const [closing, setClosing] = useState(false);

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setTitleError(false);
    setSelectedType('project');
  }, []);

  useEffect(() => {
    if (open) {
      setClosing(false);
      if (conversionSource) {
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
        const src = conversionSource;
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
          const p = src.primaryIdea; const m = src.mergeIdea;
          setForm({
            title: `${p.title} & ${m.title.split(' ').slice(0, 3).join(' ')} Platform`,
            description: `Consolidated from 2 ideation submissions:\n\n• ${p.key}: ${p.title} (IMPACT ${p.impact.toFixed(2)}, ${p.votes} votes)\n• ${m.key}: ${m.title} (IMPACT ${m.impact.toFixed(2)}, ${m.votes} votes)\n\n---\nCombined IMPACT: ${p.impact.toFixed(2)} (weighted by vote count)\nTotal votes: ${p.votes + m.votes}`,
            status: 'new', department_id: resolveDeptId(p.dept),
            assignee_id: resolveAssigneeId(p.assignee), business_owner_id: '',
            reporter_id: '', target_quarter: '', kickoff_date: '', target_complete: '', business_ask_date: '',
          });
        }
      } else {
        resetForm();
      }
    }
  }, [open, conversionSource, departmentOptions, profileOptions, resetForm]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') doClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const updateField = useCallback((field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'title') setTitleError(false);
  }, []);

  const doClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { onClose(); setClosing(false); }, 200);
  }, [onClose]);

  const handleCreate = async (addAnother: boolean) => {
    if (!form.title.trim()) { setTitleError(true); return; }
    const key = nextKey || 'MIM-001';
    const typeId = initiativeTypes?.find((t: any) => t.key === selectedType)?.id || null;
    await createMutation.mutateAsync({
      ...form,
      initiative_key: key,
      initiative_type_id: typeId,
    });
    onCreated?.(key);
    if (addAnother) {
      resetForm();
    } else {
      doClose();
    }
  };

  if (!open) return null;

  const dialog = (
    <>
      <style>{`
        @keyframes niSlideIn{from{opacity:0;transform:translate(-50%,-50%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes niSlideOut{from{opacity:1;transform:translate(-50%,-50%) scale(1)}to{opacity:0;transform:translate(-50%,-50%) scale(.96)}}
        @keyframes niFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes niFadeOut{from{opacity:1}to{opacity:0}}
      `}</style>

      {/* Backdrop */}
      <div
        onClick={doClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 600,
          background: 'rgba(0,0,0,.5)',
          animation: `${closing ? 'niFadeOut 200ms' : 'niFadeIn 150ms'} ease-out forwards`,
        }}
      />

      {/* Dialog */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 610, width: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        background: T.surface, borderRadius: 16,
        boxShadow: '0 24px 80px rgba(0,0,0,.18)',
        fontFamily: "'Inter',-apple-system,'Segoe UI',system-ui,sans-serif",
        animation: `${closing ? 'niSlideOut 200ms' : 'niSlideIn 250ms'} cubic-bezier(.4,0,.2,1) forwards`,
      }}>

        {/* ─── HEADER ─── */}
        <div style={{ padding: '20px 24px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, fontFamily: "'Sora',sans-serif", letterSpacing: '-.02em' }}>New Initiative</div>
              {nextKey && (
                <div style={{
                  display: 'inline-block', marginTop: 6, fontSize: 12, fontWeight: 600,
                  color: T.primary, background: T.primaryBg, padding: '2px 10px',
                  borderRadius: 4, fontFamily: "'JetBrains Mono',monospace", lineHeight: '20px',
                }}>{nextKey}</div>
              )}
            </div>
            <button onClick={doClose} style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 20, color: T.inkMuted, padding: 4, lineHeight: 1, marginTop: -2,
            }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── SCROLLABLE BODY ─── */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 24px 4px' }}>

          {/* Conversion banners */}
          {conversionSource?.type === 'single' && (
            <div className="p-3 rounded-lg mb-3" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid #BBF7D0' }}>
              <div className="text-[13px] font-bold flex items-center gap-1.5" style={{ color: T.ink }}>
                <RefreshCw className="w-3.5 h-3.5" /> Converting idea to initiative
              </div>
              <div className="text-[12px] mt-1" style={{ color: 'var(--fg-2)' }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: T.primary }}>{conversionSource.primaryIdea.key}</span>
                {' · '}{conversionSource.primaryIdea.title}
              </div>
            </div>
          )}
          {conversionSource?.type === 'merge' && conversionSource.mergeIdea && (
            <div className="p-3 rounded-lg mb-3" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid #BFDBFE' }}>
              <div className="text-[13px] font-bold flex items-center gap-1.5" style={{ color: T.ink }}>
                <GitMerge className="w-3.5 h-3.5" /> Merging 2 ideas into 1 initiative
              </div>
              <div className="text-[12px] mt-1" style={{ color: 'var(--fg-2)' }}>
                Primary: <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: T.primary }}>{conversionSource.primaryIdea.key}</span>
                {' · '}{conversionSource.primaryIdea.title}
              </div>
              <div className="text-[12px] mt-0.5" style={{ color: 'var(--fg-2)' }}>
                Merging: <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: T.primary }}>{conversionSource.mergeIdea.key}</span>
                {' · '}{conversionSource.mergeIdea.title}
              </div>
            </div>
          )}

          {/* §1 DETAILS */}
          <SectionHeader icon={<FileText className="w-4 h-4" />} label="DETAILS" />
          <FieldWrapper label="Title" required>
            <input
              type="text"
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder="e.g. Digital Platform Modernization"
              autoFocus
              className={cn(INPUT_CLS, titleError && 'border-red-500 ring-2 ring-red-500/20')}
              style={{ borderColor: titleError ? undefined : T.border }}
            />
            {titleError && <p className="text-xs text-red-500 mt-1">Title is required</p>}
          </FieldWrapper>
          <FieldWrapper label="Description">
            <textarea
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Brief description of the initiative scope and objectives..."
              rows={3}
              className="w-full px-3 py-2 text-[13px] bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-shadow placeholder:text-[#71717A]"
              style={{ borderColor: T.border }}
            />
          </FieldWrapper>

          {/* §2 CLASSIFICATION */}
          <SectionHeader icon={<Tag className="w-4 h-4" />} label="CLASSIFICATION" />
          <FieldWrapper label="Initiative Type">
            <InitiativeTypeSelect value={selectedType} onChange={setSelectedType} />
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="Status">
              <StatusSelect value={form.status} onChange={v => updateField('status', v)} />
            </FieldWrapper>
            <FieldWrapper label="Department">
              <DepartmentSelect
                value={form.department_id}
                onChange={v => updateField('department_id', v)}
                departments={departmentOptions || []}
              />
            </FieldWrapper>
          </div>

          {/* §3 PEOPLE */}
          <SectionHeader icon={<Users className="w-4 h-4" />} label="PEOPLE" />
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="Assignee">
              <PeopleSelect value={form.assignee_id} onChange={v => updateField('assignee_id', v)} profiles={profileOptions || []} placeholder="Select assignee" />
            </FieldWrapper>
            <FieldWrapper label="Business Owner">
              <PeopleSelect value={form.business_owner_id} onChange={v => updateField('business_owner_id', v)} profiles={profileOptions || []} placeholder="Select business owner" />
            </FieldWrapper>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="Reporter">
              <PeopleSelect value={form.reporter_id} onChange={v => updateField('reporter_id', v)} profiles={profileOptions || []} placeholder="Select reporter" />
            </FieldWrapper>
            <div />
          </div>

          {/* §4 PLANNING */}
          <SectionHeader icon={<Calendar className="w-4 h-4" />} label="PLANNING" />
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="Target Quarter">
              <QuarterSelect value={form.target_quarter} onChange={v => updateField('target_quarter', v)} />
            </FieldWrapper>
            <div />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="Kickoff Date">
              <input type="date" value={form.kickoff_date} onChange={e => updateField('kickoff_date', e.target.value)}
                className={cn(INPUT_CLS, 'appearance-none')} style={{ borderColor: T.border, fontFamily: "'JetBrains Mono',monospace" }} />
            </FieldWrapper>
            <FieldWrapper label="Target Complete">
              <input type="date" value={form.target_complete} onChange={e => updateField('target_complete', e.target.value)}
                className={cn(INPUT_CLS, 'appearance-none')} style={{ borderColor: T.border, fontFamily: "'JetBrains Mono',monospace" }} />
            </FieldWrapper>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="Business Ask Date">
              <input type="date" value={form.business_ask_date} onChange={e => updateField('business_ask_date', e.target.value)}
                className={cn(INPUT_CLS, 'appearance-none')} style={{ borderColor: T.border, fontFamily: "'JetBrains Mono',monospace" }} />
            </FieldWrapper>
            <div />
          </div>

          <div style={{ height: 8 }} />
        </div>

        {/* ─── FOOTER ─── */}
        <div style={{
          padding: '16px 24px', flexShrink: 0,
          borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <button onClick={doClose} style={{
            padding: '9px 20px', border: `1px solid ${T.border}`, borderRadius: 8,
            background: T.surface, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            color: T.inkSec,
          }}>Cancel</button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => handleCreate(true)}
              disabled={createMutation.isPending}
              style={{
                padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: `1.5px solid ${T.primary}`,
                background: T.surface, color: T.primary, opacity: createMutation.isPending ? 0.5 : 1,
              }}
            >+ Create &amp; Add Another</button>

            <button
              onClick={() => handleCreate(false)}
              disabled={createMutation.isPending || !form.title.trim()}
              className="flex items-center gap-2"
              style={{
                padding: '9px 24px', border: 'none', borderRadius: 8,
                background: T.primary, color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,.25)',
                opacity: (createMutation.isPending || !form.title.trim()) ? 0.5 : 1,
              }}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              + Create
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(dialog, document.body);
}

export default CreateInitiativeDrawer;
