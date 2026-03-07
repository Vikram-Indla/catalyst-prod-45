import { useState, useMemo, useCallback } from 'react';
import { X, FileText, Search, Inbox, Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Sheet, SheetContent, SheetOverlay } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  useConnectedProjects,
  useProjectTickets,
  useVerifyProject,
  useSyncTickets,
  useImportTickets,
} from '@/hooks/useReqAssistJira';
import { useQueryClient } from '@tanstack/react-query';

/* ── Constants ── */
const PROJECT_COLORS: Record<string, string> = { SEN: '#2563EB', MDT: '#3F3F46' };
const getAvatarColor = (key: string) => PROJECT_COLORS[key] || '#3F3F46';

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  HIGH:     { bg: '#FEF3C7', color: '#92400E' },
  CRITICAL: { bg: '#FEF3C7', color: '#92400E' },
  MEDIUM:   { bg: '#DFE1E6', color: '#374151' },
  LOW:      { bg: '#DFE1E6', color: '#374151' },
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  'Open':        { bg: '#DFE1E6', color: '#253858' },
  'To Do':       { bg: '#DFE1E6', color: '#253858' },
  'Backlog':     { bg: '#DFE1E6', color: '#253858' },
  'In Progress': { bg: '#DEEBFF', color: '#0747A6' },
  'In Review':   { bg: '#DEEBFF', color: '#0747A6' },
  'Done':        { bg: '#E3FCEF', color: '#006644' },
  'Resolved':    { bg: '#E3FCEF', color: '#006644' },
  'Closed':      { bg: '#E3FCEF', color: '#006644' },
};

function Lozenge({ label, styles }: { label: string; styles: Record<string, { bg: string; color: string }> }) {
  const s = styles[label] || { bg: '#DFE1E6', color: '#253858' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 6px', borderRadius: 3,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      background: s.bg, color: s.color, lineHeight: '16px', height: 20,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function ImportJiraDrawer({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [addInput, setAddInput] = useState('');
  const [verifyState, setVerifyState] = useState<'idle' | 'loading' | 'success' | 'not_found' | 'not_configured'>('idle');
  const [verifyResult, setVerifyResult] = useState<{ project_name: string; count: number } | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [pdfOnly, setPdfOnly] = useState(false);
  const [ticketSearch, setTicketSearch] = useState('');

  const qc = useQueryClient();
  const { data: projects = [], isLoading: loadingProjects } = useConnectedProjects();
  const selectedProjectData = projects.find(p => p.project_key === selectedProject);
  const { data: tickets = [], isLoading: loadingTickets } = useProjectTickets(step === 2 ? selectedProject : null, pdfOnly);
  const verifyMutation = useVerifyProject();
  const syncMutation = useSyncTickets();
  const importMutation = useImportTickets();

  const filteredTickets = useMemo(() => {
    if (!ticketSearch) return tickets;
    const q = ticketSearch.toLowerCase();
    return tickets.filter(t =>
      t.ticket_key.toLowerCase().includes(q) || (t.ticket_summary || '').toLowerCase().includes(q)
    );
  }, [tickets, ticketSearch]);

  const handleVerify = useCallback(async () => {
    const key = addInput.trim().toUpperCase();
    if (!key) return;
    setVerifyState('loading');
    try {
      const result = await verifyMutation.mutateAsync(key);
      // Insert into ra_jira_connections
      await (supabase as any).from('ra_jira_connections').upsert({
        project_key: result.project_key,
        project_name: result.project_name,
        project_avatar: result.avatar_url,
        avatar_color: getAvatarColor(result.project_key),
      }, { onConflict: 'project_key' });
      // Trigger sync
      const syncResult = await syncMutation.mutateAsync(result.project_key);
      setVerifyState('success');
      setVerifyResult({ project_name: result.project_name, count: syncResult.synced });
      qc.invalidateQueries({ queryKey: ['ra_jira_connections'] });
      setAddInput('');
      setTimeout(() => setVerifyState('idle'), 3000);
    } catch (err: any) {
      if (err.message === 'PROJECT_NOT_FOUND') {
        setVerifyState('not_found');
      } else if (err.message === 'JIRA_NOT_CONFIGURED') {
        setVerifyState('not_configured');
      } else {
        setVerifyState('not_found');
        toast.error(err.message || 'Verification failed');
      }
    }
  }, [addInput, verifyMutation, syncMutation, qc]);

  const handleSyncAll = useCallback(async () => {
    for (const p of projects) {
      await syncMutation.mutateAsync(p.project_key);
    }
    toast.success('All projects synced');
  }, [projects, syncMutation]);

  const handleSyncOne = useCallback(async (key: string) => {
    await syncMutation.mutateAsync(key);
    toast.success(`${key} synced`);
  }, [syncMutation]);

  const toggleTicket = (key: string) => {
    setSelectedTickets(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedTickets.size === filteredTickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(filteredTickets.map(t => t.ticket_key)));
    }
  };

  const handleImport = useCallback(async () => {
    const keys = Array.from(selectedTickets);
    if (!keys.length) return;
    try {
      const result = await importMutation.mutateAsync(keys);
      toast.success(`Imported ${result.imported} tickets, ${result.processing} queued for processing`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    }
  }, [selectedTickets, importMutation, onOpenChange]);

  const handleClose = () => {
    setStep(1);
    setSelectedProject(null);
    setSelectedTickets(new Set());
    setVerifyState('idle');
    setAddInput('');
    setPdfOnly(false);
    setTicketSearch('');
    onOpenChange(false);
  };

  return (
    <>
      {open && <style>{`
        .ra-import-overlay {
          top: 48px !important;
          right: 600px !important;
          bottom: 0 !important;
          left: 0 !important;
          z-index: 49 !important;
          background: rgba(0,0,0,0.4) !important;
          backdrop-filter: none !important;
          pointer-events: auto !important;
        }
        .ra-import-content {
          z-index: 50 !important;
          top: 48px !important;
          bottom: 0 !important;
          height: calc(100vh - 48px) !important;
          max-height: calc(100vh - 48px) !important;
          inset: auto !important;
          right: 0 !important;
        }
      `}</style>}
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        hideClose
        className="!p-0 !border-0 !shadow-none !top-[48px] !bottom-0 !h-[calc(100vh-48px)] !max-h-[calc(100vh-48px)] !w-[600px] !z-50 !rounded-none"
        style={{
          background: '#FFFFFF',
          display: 'flex', flexDirection: 'column',
          borderLeft: '0.75px solid #E5E7EB',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* HEADER */}
        <div style={{ padding: '0 24px', height: 64, borderBottom: '0.75px solid #E5E7EB', display: 'flex', flexDirection: 'column', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 650, color: '#111827', fontFamily: "'Sora', sans-serif" }}>Import from Jira</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: '#F3E8FF', borderRadius: 3, padding: '2px 8px' }}>AI-Assisted Import</span>
            <span style={{ fontSize: 12, color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>Step {step} of 2</span>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280' }}>
              <X size={16} />
            </button>
          </div>
          <span style={{ fontSize: 13, color: '#6B7280', fontFamily: "'Inter', sans-serif", marginTop: 2 }}>Connected via Catalyst integration</span>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {step === 1 ? <Step1
            projects={projects}
            loadingProjects={loadingProjects}
            selectedProject={selectedProject}
            onSelect={setSelectedProject}
            addInput={addInput}
            onAddInput={setAddInput}
            verifyState={verifyState}
            verifyResult={verifyResult}
            onVerify={handleVerify}
            onSyncAll={handleSyncAll}
            onSyncOne={handleSyncOne}
            syncingKey={syncMutation.isPending ? (syncMutation.variables as string) : null}
          /> : <Step2
            projectName={selectedProjectData?.project_name ?? selectedProject ?? ''}
            tickets={filteredTickets}
            loading={loadingTickets}
            selectedTickets={selectedTickets}
            onToggle={toggleTicket}
            onToggleAll={toggleAll}
            pdfOnly={pdfOnly}
            onPdfToggle={() => setPdfOnly(!pdfOnly)}
            search={ticketSearch}
            onSearch={setTicketSearch}
            onSync={() => selectedProject && handleSyncOne(selectedProject)}
            syncing={syncMutation.isPending}
          />}
        </div>

        {/* FOOTER */}
        <div style={{ height: 64, borderTop: '0.75px solid #E5E7EB', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          {step === 1 ? (
            <>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>Cancel</button>
              <button
                onClick={() => { if (selectedProject) { setStep(2); setSelectedTickets(new Set()); } }}
                disabled={!selectedProject}
                style={{
                  background: selectedProject ? '#2563EB' : '#93C5FD', color: '#FFFFFF',
                  border: 'none', borderRadius: 6, padding: '0 16px', height: 36,
                  fontSize: 13, fontWeight: 600, cursor: selectedProject ? 'pointer' : 'not-allowed',
                  fontFamily: "'Inter', sans-serif", opacity: selectedProject ? 1 : 0.6,
                }}
              >Next: Select Tickets →</button>
            </>
          ) : (
            <>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>← Back</button>
              <button
                onClick={handleImport}
                disabled={selectedTickets.size === 0 || importMutation.isPending}
                style={{
                  background: selectedTickets.size > 0 ? '#2563EB' : '#93C5FD', color: '#FFFFFF',
                  border: 'none', borderRadius: 6, padding: '0 16px', height: 36,
                  fontSize: 13, fontWeight: 600,
                  cursor: selectedTickets.size > 0 ? 'pointer' : 'not-allowed',
                  fontFamily: "'Inter', sans-serif", opacity: selectedTickets.size > 0 ? 1 : 0.6,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {importMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Import {selectedTickets.size} Ticket{selectedTickets.size !== 1 ? 's' : ''}
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}

/* ════════════════════════════════════════════════════════════ */
/* STEP 1 */
/* ════════════════════════════════════════════════════════════ */

function Step1({
  projects, loadingProjects, selectedProject, onSelect,
  addInput, onAddInput, verifyState, verifyResult, onVerify,
  onSyncAll, onSyncOne, syncingKey,
}: {
  projects: any[];
  loadingProjects: boolean;
  selectedProject: string | null;
  onSelect: (k: string) => void;
  addInput: string;
  onAddInput: (v: string) => void;
  verifyState: string;
  verifyResult: { project_name: string; count: number } | null;
  onVerify: () => void;
  onSyncAll: () => void;
  onSyncOne: (k: string) => void;
  syncingKey: string | null;
}) {
  return (
    <>
      {/* Section label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Inter', sans-serif" }}>SELECT PROJECT</span>
        {projects.length > 0 && (
          <button onClick={onSyncAll} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>
            <RefreshCw size={14} className={syncingKey ? 'animate-spin' : ''} />
            Sync All
          </button>
        )}
      </div>

      {/* Project cards or empty state */}
      {loadingProjects ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <Loader2 size={20} className="animate-spin" style={{ color: '#9CA3AF' }} />
        </div>
      ) : projects.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <Inbox size={32} style={{ color: '#9CA3AF' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 12, fontFamily: "'Inter', sans-serif" }}>No projects connected yet</span>
          <span style={{ fontSize: 13, color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>Add your first Jira project below</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projects.map(p => {
            const selected = selectedProject === p.project_key;
            return (
              <button
                key={p.project_key}
                onClick={() => onSelect(p.project_key)}
                style={{
                  height: 48, border: selected ? '1.5px solid #2563EB' : '0.75px solid #E5E7EB',
                  borderRadius: 6, background: selected ? 'rgba(37,99,235,0.04)' : '#FFFFFF',
                  padding: '0 12px', display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.02)'; }}
                onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = '#FFFFFF'; }}
              >
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: getAvatarColor(p.project_key), color: '#FFFFFF', fontSize: 13, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                }}>
                  {p.project_key.slice(0, 2)}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', fontFamily: "'Inter', sans-serif", flex: 1 }}>
                  {p.project_name} <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 400 }}>({p.project_key})</span>
                </span>
                <span style={{ background: '#DFE1E6', color: '#374151', fontSize: 11, fontWeight: 600, borderRadius: 3, padding: '2px 6px', fontFamily: "'Inter', sans-serif" }}>
                  {p.ticket_count}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); onSyncOne(p.project_key); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280' }}
                >
                  <RefreshCw size={12} className={syncingKey === p.project_key ? 'animate-spin' : ''} />
                </button>
              </button>
            );
          })}
        </div>
      )}

      {/* ADD PROJECT SECTION */}
      <div style={{ marginTop: 24, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, height: '0.75px', background: '#F3F4F6' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", background: '#FFFFFF', padding: '0 8px' }}>ADD PROJECT</span>
          <div style={{ flex: 1, height: '0.75px', background: '#F3F4F6' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={addInput}
            onChange={e => onAddInput(e.target.value.toUpperCase())}
            placeholder="Project key (e.g. SEN, MDT)"
            style={{
              flex: 1, height: 36, border: '0.75px solid #E5E7EB', borderRadius: 4,
              padding: '0 12px', fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
              outline: 'none', color: '#111827',
            }}
            onKeyDown={e => { if (e.key === 'Enter') onVerify(); }}
          />
          <button
            onClick={onVerify}
            disabled={!addInput.trim() || verifyState === 'loading'}
            style={{
              background: addInput.trim() ? '#2563EB' : '#93C5FD', color: '#FFFFFF',
              border: 'none', borderRadius: 6, padding: '0 16px', height: 36,
              fontSize: 13, fontWeight: 600, cursor: addInput.trim() ? 'pointer' : 'not-allowed',
              fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', gap: 6,
              opacity: addInput.trim() ? 1 : 0.6,
            }}
          >
            {verifyState === 'loading' ? <Loader2 size={14} className="animate-spin" /> : null}
            Verify →
          </button>
        </div>
        {/* Verify feedback */}
        <div style={{ marginTop: 8 }}>
          {verifyState === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Loader2 size={14} className="animate-spin" style={{ color: '#6B7280' }} />
              <span style={{ fontSize: 13, color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>Verifying with Jira...</span>
            </div>
          )}
          {verifyState === 'success' && verifyResult && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} style={{ color: '#16A34A' }} />
              <span style={{ fontSize: 13, color: '#16A34A', fontFamily: "'Inter', sans-serif" }}>{verifyResult.project_name} found · {verifyResult.count} tickets</span>
            </div>
          )}
          {verifyState === 'not_found' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <XCircle size={14} style={{ color: '#DC2626' }} />
              <span style={{ fontSize: 13, color: '#DC2626', fontFamily: "'Inter', sans-serif" }}>Project not found. Check the key and try again.</span>
            </div>
          )}
          {verifyState === 'not_configured' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#FEF3C7', border: '0.75px solid #D97706', borderRadius: 6, padding: '10px 12px', marginTop: 4 }}>
              <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
              <div>
                <span style={{ fontSize: 13, color: '#92400E', fontFamily: "'Inter', sans-serif" }}>Jira integration not configured. Go to Settings → Integrations. </span>
                <a href="/settings/integrations" style={{ fontSize: 13, color: '#2563EB', textDecoration: 'underline', fontFamily: "'Inter', sans-serif" }}>Go to Settings →</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════ */
/* STEP 2 */
/* ════════════════════════════════════════════════════════════ */

function Step2({
  projectName, tickets, loading, selectedTickets, onToggle, onToggleAll,
  pdfOnly, onPdfToggle, search, onSearch, onSync, syncing,
}: {
  projectName: string;
  tickets: any[];
  loading: boolean;
  selectedTickets: Set<string>;
  onToggle: (key: string) => void;
  onToggleAll: () => void;
  pdfOnly: boolean;
  onPdfToggle: () => void;
  search: string;
  onSearch: (v: string) => void;
  onSync: () => void;
  syncing: boolean;
}) {
  return (
    <>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, fontFamily: "'Inter', sans-serif" }}>
        {projectName} · Showing tickets with attachments only
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: '#9CA3AF' }} />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search tickets..."
            style={{
              width: '100%', height: 36, border: '0.75px solid #E5E7EB', borderRadius: 4,
              padding: '0 12px 0 32px', fontSize: 13, fontFamily: "'Inter', sans-serif",
              outline: 'none', color: '#111827',
            }}
          />
        </div>
        <button
          onClick={onPdfToggle}
          style={{
            height: 36, borderRadius: 6, padding: '0 12px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            background: pdfOnly ? '#DEEBFF' : '#F3F4F6',
            color: pdfOnly ? '#0747A6' : '#374151',
            border: `0.75px solid ${pdfOnly ? '#BFDBFE' : '#E5E7EB'}`,
          }}
        >PDF Only</button>
        <button onClick={onSync} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280' }}>
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ height: 36, background: '#F3F4F6', marginBottom: 1, borderRadius: 2, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <Inbox size={32} style={{ color: '#9CA3AF' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 12, fontFamily: "'Inter', sans-serif" }}>No tickets with attachments found</span>
          <span style={{ fontSize: 13, color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>Only Jira tickets with file attachments appear here.</span>
          <button onClick={onSync} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#2563EB', textDecoration: 'underline', fontFamily: "'Inter', sans-serif" }}>Sync Now →</button>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div style={{ display: 'flex', alignItems: 'center', height: 36, background: '#F9FAFB', borderBottom: '0.75px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 1 }}>
            <div style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Checkbox
                checked={selectedTickets.size === tickets.length && tickets.length > 0}
                onCheckedChange={onToggleAll}
              />
            </div>
            {[
              { label: 'KEY', w: 96 },
              { label: 'SUMMARY', w: undefined },
              { label: 'PRIORITY', w: 88 },
              { label: 'PDF', w: 48 },
              { label: 'STATUS', w: 80 },
            ].map(col => (
              <div key={col.label} style={{
                width: col.w, flex: col.w ? undefined : 1,
                padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#6B7280',
                textTransform: 'uppercase', fontFamily: "'Inter', sans-serif",
              }}>{col.label}</div>
            ))}
          </div>

          {/* Table rows */}
          {tickets.map(t => {
            const checked = selectedTickets.has(t.ticket_key);
            return (
              <div
                key={t.ticket_key}
                onClick={() => onToggle(t.ticket_key)}
                style={{
                  display: 'flex', alignItems: 'center', height: 36,
                  borderBottom: '0.75px solid #F3F4F6', cursor: 'pointer',
                  background: checked ? 'rgba(37,99,235,0.04)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.02)'; }}
                onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Checkbox checked={checked} onCheckedChange={() => onToggle(t.ticket_key)} />
                </div>
                <div style={{ width: 96, padding: '8px 12px', fontSize: 12, fontWeight: 500, color: '#374151', fontFamily: "'JetBrains Mono', monospace" }}>{t.ticket_key}</div>
                <div style={{ flex: 1, padding: '8px 12px', fontSize: 13, color: '#111827', fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.ticket_summary}</div>
                <div style={{ width: 88, padding: '8px 12px' }}>
                  <Lozenge label={t.priority || 'MEDIUM'} styles={PRIORITY_STYLES} />
                </div>
                <div style={{ width: 48, padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
                  {t.has_pdf && <FileText size={14} style={{ color: '#2563EB' }} />}
                </div>
                <div style={{ width: 80, padding: '8px 12px' }}>
                  <Lozenge label={t.status || 'Open'} styles={STATUS_STYLES} />
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div style={{ padding: '8px 0', marginTop: 8, fontSize: 13, color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>
            {selectedTickets.size} of {tickets.length} tickets selected
          </div>
        </>
      )}
    </>
  );
}
