import { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, FileText, Search, Inbox, Loader2, Check } from 'lucide-react';
import { useCreateRADocument, useQueueJob, useJiraProjects, useJiraProjectTickets, RA_KEYS } from '@/hooks/useReqAssist';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

type WizardStep = 1 | 2;

// Priority lozenge colours (NOT status — amber for High/Critical per spec)
const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  Critical: { bg: '#FEF3C7', color: '#92400E' },
  High:     { bg: '#FEF3C7', color: '#92400E' },
  Medium:   { bg: '#DFE1E6', color: '#253858' },
  Low:      { bg: '#DFE1E6', color: '#253858' },
};

// Status lozenge — 3-color guardrail
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  'To Do':       { bg: '#DFE1E6', color: '#253858' },
  'Backlog':     { bg: '#DFE1E6', color: '#253858' },
  'In Progress': { bg: '#DEEBFF', color: '#0747A6' },
  'In Review':   { bg: '#DEEBFF', color: '#0747A6' },
  'Done':        { bg: '#E3FCEF', color: '#006644' },
  'Resolved':    { bg: '#E3FCEF', color: '#006644' },
};

function StatusLozenge({ label, styleMap }: { label: string; styleMap: Record<string, { bg: string; color: string }> }) {
  const s = styleMap[label] || { bg: '#DFE1E6', color: '#253858' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 3,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
      background: s.bg, color: s.color, lineHeight: '16px', height: 20,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

// Jira project colour by key
const PROJECT_COLORS: Record<string, string> = {
  SEN: '#2563EB',
  MDT: '#7C3AED',
};

export default function RAImportDrawer({ onClose }: Props) {
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Step 2 state
  const [search, setSearch] = useState('');
  const [pdfOnly, setPdfOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const { data: projects = [], isLoading: projectsLoading } = useJiraProjects();
  const { data: tickets = [] } = useJiraProjectTickets(step === 2 ? selectedProject : null);

  const createDoc = useCreateRADocument();
  const queueJob = useQueueJob();
  const qc = useQueryClient();

  // Existing library keys to mark "In Library"
  const { data: existingDocs = [] } = useQuery({
    queryKey: ['ra', 'existing-keys'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('ra_documents').select('jira_ticket_key');
      return data ?? [];
    },
    staleTime: 10_000,
  });
  const existingKeys = useMemo(() => new Set((existingDocs as any[]).map((d: any) => d.jira_ticket_key)), [existingDocs]);

  // Ticket count per project (all tickets, not just PDF)
  const projectTicketCounts = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach((p: any) => { map[p.project_key] = 0; });
    return map;
  }, [projects]);

  // We need counts from the DB — use the projects query data + a separate count query
  const { data: projectCounts = [] } = useQuery({
    queryKey: ['ra', 'jira_project_counts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ra_jira_tickets')
        .select('project_key');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        counts[r.project_key] = (counts[r.project_key] || 0) + 1;
      });
      return Object.entries(counts).map(([key, count]) => ({ project_key: key, count }));
    },
    staleTime: 60_000,
  });
  const countMap = useMemo(() => {
    const m: Record<string, number> = {};
    projectCounts.forEach((p: any) => { m[p.project_key] = p.count; });
    return m;
  }, [projectCounts]);

  // Selected project info
  const selectedProjectInfo = useMemo(
    () => projects.find((p: any) => p.project_key === selectedProject),
    [projects, selectedProject]
  );

  // Filtered tickets for Step 2
  const filteredTickets = useMemo(() => {
    let list = tickets as any[];
    if (pdfOnly) list = list.filter((t: any) => t.has_pdf);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t: any) =>
        t.ticket_key.toLowerCase().includes(q) ||
        t.ticket_summary.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tickets, pdfOnly, search]);

  // Select all visible (non-library) tickets
  const selectableKeys = useMemo(
    () => filteredTickets.filter((t: any) => !existingKeys.has(t.ticket_key)).map((t: any) => t.ticket_key),
    [filteredTickets, existingKeys]
  );
  const allSelected = selectableKeys.length > 0 && selectableKeys.every(k => selected.has(k));

  const toggleTicket = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    const next = new Set(selected);
    if (allSelected) {
      selectableKeys.forEach(k => next.delete(k));
    } else {
      selectableKeys.forEach(k => next.add(k));
    }
    setSelected(next);
  };

  // Navigate to step 2
  const goToStep2 = (projKey: string) => {
    setSelectedProject(projKey);
    setSelected(new Set());
    setSearch('');
    setPdfOnly(false);
    setStep(2);
  };

  // Import handler — creates docs + fires edge function
  const handleImport = async () => {
    setImporting(true);
    const keys = Array.from(selected);
    let successCount = 0;

    for (const key of keys) {
      const ticket = (tickets as any[]).find((t: any) => t.ticket_key === key);
      if (!ticket) continue;
      try {
        const doc = await createDoc.mutateAsync({
          title: ticket.ticket_summary,
          source_type: 'jira_pdf',
          language: 'ar',
          jira_ticket_key: key,
          jira_project: ticket.project_key,
          page_count: ticket.page_count ?? undefined,
          status: 'processing',
        });
        await queueJob.mutateAsync({
          ra_document_id: doc.id,
          job_type: 'import',
          eta_seconds: (ticket.page_count ?? 10) * 3,
        });
        // Fire-and-forget
        supabase.functions.invoke('ra-pdf-extract', { body: { document_id: doc.id } }).catch(() => {});
        successCount++;
      } catch (err: any) {
        console.error(`Import failed for ${key}:`, err);
      }
    }

    qc.invalidateQueries({ queryKey: RA_KEYS.all });
    toast.success(`${successCount} ticket${successCount !== 1 ? 's' : ''} imported`, {
      description: 'Processing has started in the background',
      duration: 5000,
    });
    setImporting(false);
    onClose();
  };

  const stepLabel = step === 1 ? 'Step 1 of 2' : 'Step 2 of 2';

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', top: 48, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 48, right: 0, height: 'calc(100vh - 48px)', width: 600,
        background: '#FFFFFF', zIndex: 50, display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid rgba(15,23,42,0.12)',
        animation: 'ra-slide-left 200ms ease-out',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {step === 2 && (
                <button
                  onClick={() => { setStep(1); setSelectedProject(null); setSelected(new Set()); }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2 }}
                >
                  <ChevronLeft size={16} color="#64748B" />
                </button>
              )}
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 650, color: '#111827', margin: 0, fontFamily: "'Sora', sans-serif" }}>
                  Import from Jira
                </h3>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0 0', fontFamily: "'Inter', sans-serif" }}>
                  {step === 1 ? 'Connected via Catalyst integration' : `${selectedProjectInfo?.project_name ?? selectedProject} → Select Tickets`}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                fontSize: 11, fontWeight: 600, background: '#F3E8FF', color: '#7C3AED',
                fontFamily: "'Inter', sans-serif",
              }}>AI-Assisted Import</span>
              <span style={{ fontSize: 12, color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>{stepLabel}</span>
              <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}>
                <X size={16} color="#64748B" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* ══════ STEP 1 — SELECT PROJECT ══════ */}
          {step === 1 && (
            <div>
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' as const,
                letterSpacing: '0.04em', display: 'block', marginBottom: 12,
                fontFamily: "'Inter', sans-serif",
              }}>SELECT PROJECT</span>

              {projectsLoading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                  <Loader2 size={20} color="#94A3B8" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              )}

              {!projectsLoading && projects.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Inbox size={32} color="#D1D5DB" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', margin: '0 0 4px', fontFamily: "'Inter', sans-serif" }}>
                    No Jira projects found
                  </p>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 12px', fontFamily: "'Inter', sans-serif" }}>
                    Check your Catalyst integration settings.
                  </p>
                  <a href="/admin/settings" style={{ fontSize: 13, color: '#2563EB', fontWeight: 500, textDecoration: 'none', fontFamily: "'Inter', sans-serif" }}>
                    Go to Settings →
                  </a>
                </div>
              )}

              {!projectsLoading && projects.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {projects.map((proj: any) => {
                    const isSelected = selectedProject === proj.project_key;
                    const iconColor = PROJECT_COLORS[proj.project_key] || '#64748B';
                    const count = countMap[proj.project_key] ?? 0;
                    return (
                      <button
                        key={proj.project_key}
                        onClick={() => setSelectedProject(isSelected ? null : proj.project_key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          width: '100%', padding: '12px 14px', borderRadius: 6,
                          border: isSelected ? '1.5px solid #2563EB' : '0.75px solid #E5E7EB',
                          background: isSelected ? 'rgba(37,99,235,0.04)' : '#FFFFFF',
                          cursor: 'pointer', textAlign: 'left' as const,
                          transition: 'border-color 150ms, background 150ms',
                          height: 48, boxSizing: 'border-box',
                        }}
                      >
                        {/* Project icon */}
                        <div style={{
                          width: 24, height: 24, borderRadius: 4,
                          background: iconColor, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
                            {proj.project_key.slice(0, 2)}
                          </span>
                        </div>

                        {/* Name + key */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', fontFamily: "'Inter', sans-serif" }}>
                            {proj.project_name}
                          </span>
                          <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 6, fontFamily: "'Inter', sans-serif" }}>
                            ({proj.project_key})
                          </span>
                        </div>

                        {/* Ticket count badge */}
                        <span style={{
                          padding: '2px 10px', borderRadius: 10,
                          fontSize: 12, fontWeight: 600, background: '#DFE1E6', color: '#374151',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>{count} tickets</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════ STEP 2 — SELECT TICKETS ══════ */}
          {step === 2 && (
            <div>
              {/* Filter bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                {/* Search */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search tickets..."
                    style={{
                      width: '100%', height: 36, borderRadius: 6,
                      border: '1px solid #E5E7EB', padding: '0 12px 0 32px',
                      fontSize: 13, fontFamily: "'Inter', sans-serif",
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* PDF only toggle */}
                <button
                  onClick={() => setPdfOnly(!pdfOnly)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 16,
                    border: pdfOnly ? '1px solid #2563EB' : '1px solid #E5E7EB',
                    background: pdfOnly ? 'rgba(37,99,235,0.08)' : '#FFFFFF',
                    color: pdfOnly ? '#2563EB' : '#6B7280',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    transition: 'all 150ms',
                  }}
                >
                  <FileText size={12} />
                  PDF only
                </button>
              </div>

              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '20px 80px 1fr 80px 60px 80px',
                alignItems: 'center', gap: 8,
                padding: '0 12px', height: 36,
                background: '#F9FAFB', borderRadius: '6px 6px 0 0',
                borderBottom: '0.75px solid #E5E7EB',
              }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  style={{ accentColor: '#2563EB', width: 14, height: 14 }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' as const, fontFamily: "'Inter', sans-serif" }}>KEY</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' as const, fontFamily: "'Inter', sans-serif" }}>SUMMARY</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' as const, fontFamily: "'Inter', sans-serif" }}>PRIORITY</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' as const, fontFamily: "'Inter', sans-serif", textAlign: 'center' as const }}>PDF</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' as const, fontFamily: "'Inter', sans-serif" }}>STATUS</span>
              </div>

              {/* Ticket rows */}
              <div style={{ border: '0.75px solid #E5E7EB', borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
                {filteredTickets.length === 0 && (
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>No tickets match your filters.</p>
                  </div>
                )}
                {filteredTickets.map((t: any) => {
                  const inLib = existingKeys.has(t.ticket_key);
                  const isSel = selected.has(t.ticket_key);
                  return (
                    <div
                      key={t.ticket_key}
                      onClick={() => !inLib && toggleTicket(t.ticket_key)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '20px 80px 1fr 80px 60px 80px',
                        alignItems: 'center', gap: 8,
                        padding: '0 12px', height: 36,
                        borderBottom: '0.75px solid #F3F4F6',
                        cursor: inLib ? 'default' : 'pointer',
                        background: isSel ? 'rgba(37,99,235,0.06)' : 'transparent',
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={e => { if (!inLib && !isSel) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                      onMouseLeave={e => { if (!inLib) e.currentTarget.style.background = isSel ? 'rgba(37,99,235,0.06)' : 'transparent'; }}
                    >
                      {/* Checkbox / In Library */}
                      <div>
                        {inLib ? (
                          <span style={{ fontSize: 9, fontWeight: 600, color: '#16A34A', background: '#F0FDF4', padding: '1px 4px', borderRadius: 3, whiteSpace: 'nowrap' }}>✓</span>
                        ) : (
                          <input type="checkbox" checked={isSel} readOnly style={{ accentColor: '#2563EB', width: 14, height: 14 }} />
                        )}
                      </div>

                      {/* Key */}
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: '#374151' }}>
                        {t.ticket_key}
                      </span>

                      {/* Summary */}
                      <span style={{
                        fontSize: 13, color: '#111827', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontFamily: "'Inter', sans-serif",
                      }}>{t.ticket_summary}</span>

                      {/* Priority */}
                      <StatusLozenge label={t.priority || 'Medium'} styleMap={PRIORITY_STYLES} />

                      {/* PDF indicator */}
                      <div style={{ textAlign: 'center' }}>
                        {t.has_pdf && <FileText size={14} color="#2563EB" />}
                      </div>

                      {/* Status */}
                      <StatusLozenge label={t.status || 'To Do'} styleMap={STATUS_STYLES} />
                    </div>
                  );
                })}
              </div>

              {/* Selection count */}
              <div style={{ marginTop: 12, fontSize: 13, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>
                {selected.size} of {filteredTickets.length} tickets selected
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid rgba(15,23,42,0.08)',
          flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {step === 1 && (
            <>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6,
                  background: '#FFFFFF', color: '#374151', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >Cancel</button>
              <button
                onClick={() => selectedProject && goToStep2(selectedProject)}
                disabled={!selectedProject}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  border: 'none', borderRadius: 6,
                  background: selectedProject ? '#2563EB' : '#9CA3AF',
                  color: selectedProject ? '#FFFFFF' : '#E2E8F0',
                  cursor: selectedProject ? 'pointer' : 'not-allowed',
                  opacity: !selectedProject ? 0.6 : 1,
                  fontFamily: "'Inter', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                Next: Select Tickets <ChevronRight size={14} />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                onClick={() => { setStep(1); setSelectedProject(null); setSelected(new Set()); }}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6,
                  background: '#FFFFFF', color: '#374151', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <ChevronLeft size={14} /> Back
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0 || importing}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  border: 'none', borderRadius: 6,
                  background: selected.size > 0 ? '#2563EB' : '#9CA3AF',
                  color: selected.size > 0 ? '#FFFFFF' : '#E2E8F0',
                  cursor: selected.size > 0 && !importing ? 'pointer' : 'not-allowed',
                  opacity: selected.size === 0 ? 0.6 : 1,
                  fontFamily: "'Inter', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {importing && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                {importing ? 'Importing...' : selected.size > 0 ? `Import ${selected.size} Ticket${selected.size !== 1 ? 's' : ''}` : 'Import Tickets'}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ra-slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
