import { useState, useEffect } from 'react';
import { X, Check, ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { useJiraTickets, useCreateRADocument, useQueueJob, RA_KEYS } from '@/hooks/useReqAssist';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

const PROJECTS = [
  { key: 'SEN', name: 'SEN — Senaia Digital Platform', color: '#2563EB' },
  { key: 'MDT', name: 'MDT — MIM Digital Transformation', color: '#0D9488' },
];

type ImportState = 'select' | 'importing' | 'done';

export default function RAImportDrawer({ onClose }: Props) {
  const [expanded, setExpanded] = useState<string | null>('SEN');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importState, setImportState] = useState<ImportState>('select');
  const [importProgress, setImportProgress] = useState<Record<string, { pct: number; status: string }>>({});
  const [ticketTitleMap, setTicketTitleMap] = useState<Record<string, { title: string; page_count: number | null; project: string }>>({});

  const createDoc = useCreateRADocument();
  const queueJob = useQueueJob();
  const qc = useQueryClient();

  const { data: senTickets = [] } = useJiraTickets('SEN');
  const { data: mdtTickets = [] } = useJiraTickets('MDT');
  const ticketsByProject: Record<string, any[]> = { SEN: senTickets, MDT: mdtTickets };

  // Build ticket title map for import progress display
  useEffect(() => {
    const map: Record<string, { title: string; page_count: number | null; project: string }> = {};
    [...senTickets, ...mdtTickets].forEach((t: any) => {
      map[t.jira_ticket_key] = { title: t.title, page_count: t.page_count, project: t.jira_ticket_key.split('-')[0] || 'SEN' };
    });
    setTicketTitleMap(map);
  }, [senTickets, mdtTickets]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggleTicket = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  };

  const handleImport = async () => {
    setImportState('importing');
    const keys = Array.from(selected);

    // Initialize progress
    const initProgress: Record<string, { pct: number; status: string }> = {};
    keys.forEach(k => { initProgress[k] = { pct: 0, status: 'Queuing...' }; });
    setImportProgress(initProgress);

    let completedCount = 0;

    for (const key of keys) {
      const info = ticketTitleMap[key];
      const title = info?.title || key;
      const project = info?.project || key.split('-')[0] || 'SEN';
      const pageCount = info?.page_count ?? null;

      setImportProgress(p => ({ ...p, [key]: { pct: 10, status: 'Creating document...' } }));

      try {
        // INSERT into ra_documents
        const doc = await createDoc.mutateAsync({
          title,
          source_type: 'jira_pdf',
          language: 'ar',
          jira_ticket_key: key,
          jira_project: project,
          page_count: pageCount ?? undefined,
          status: 'processing',
        });

        setImportProgress(p => ({ ...p, [key]: { pct: 30, status: 'Extracting...' } }));

        // Queue import job
        await queueJob.mutateAsync({
          ra_document_id: doc.id,
          job_type: 'import',
          eta_seconds: (pageCount ?? 10) * 3,
        });

        setImportProgress(p => ({ ...p, [key]: { pct: 60, status: 'Translating...' } }));

        // Simulate processing stages (the real processing happens server-side)
        await new Promise(r => setTimeout(r, 800));
        setImportProgress(p => ({ ...p, [key]: { pct: 85, status: 'WikiHub indexing...' } }));
        await new Promise(r => setTimeout(r, 600));
        setImportProgress(p => ({ ...p, [key]: { pct: 100, status: 'Done' } }));

        completedCount++;
      } catch (err: any) {
        setImportProgress(p => ({ ...p, [key]: { pct: 100, status: `Error: ${err.message}` } }));
      }
    }

    // All done
    qc.invalidateQueries({ queryKey: RA_KEYS.all });
    setImportState('done');

    setTimeout(() => {
      toast.success(`${completedCount} documents imported`, {
        description: 'WikiHub updated with new content',
        duration: 6000,
      });
    }, 500);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 600, background: '#FFFFFF', zIndex: 50, display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(15,23,42,0.12)', animation: 'ra-slide-left 200ms ease-out' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 650, color: '#0F172A', margin: 0, fontFamily: "'Sora', sans-serif" }}>Import from Jira</h3>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0', fontFamily: "'Inter', sans-serif" }}>Select tickets with PDF attachments to import</p>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}><X size={16} color="#64748B" /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {importState === 'select' && (
            <>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 12, display: 'block', fontFamily: "'Inter', sans-serif" }}>Connected Projects</span>
              {PROJECTS.map(proj => {
                const tickets = ticketsByProject[proj.key] || [];
                const isExp = expanded === proj.key;
                return (
                  <div key={proj.key} style={{ marginBottom: 8 }}>
                    <button onClick={() => setExpanded(isExp ? null : proj.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 'var(--ra-radius-card)', border: '1px solid rgba(15,23,42,0.08)', background: '#FFFFFF', cursor: 'pointer', textAlign: 'left' as const }}>
                      {isExp ? <ChevronDown size={14} color="#64748B" /> : <ChevronRight size={14} color="#64748B" />}
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: proj.color + '15', color: proj.color, fontFamily: "'JetBrains Mono', monospace" }}>{proj.key}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', flex: 1, fontFamily: "'Inter', sans-serif" }}>{proj.name}</span>
                      <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{tickets.length} tickets</span>
                    </button>
                    {isExp && tickets.length > 0 && (
                      <div style={{ marginTop: 4, border: '1px solid rgba(15,23,42,0.06)', borderRadius: 'var(--ra-radius-card)', overflow: 'hidden' }}>
                        {tickets.map((t: any) => {
                          const inLib = t.status === 'ready' || t.status === 'processing';
                          const isSel = selected.has(t.jira_ticket_key);
                          return (
                            <div key={t.jira_ticket_key} onClick={() => !inLib && toggleTicket(t.jira_ticket_key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid rgba(15,23,42,0.04)', cursor: inLib ? 'default' : 'pointer', background: isSel ? 'rgba(13,148,136,0.04)' : 'transparent' }}>
                              {inLib ? (
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#16A34A', background: '#F0FDF4', padding: '1px 6px', borderRadius: 3 }}>In Library</span>
                              ) : (
                                <input type="checkbox" checked={isSel} readOnly style={{ accentColor: '#0D9488' }} />
                              )}
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: '#2563EB', minWidth: 90 }}>{t.jira_ticket_key}</span>
                              <span style={{ fontSize: 13, color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>{t.title}</span>
                              {t.page_count && <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{t.page_count}pp</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
          {(importState === 'importing' || importState === 'done') && (
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', margin: '0 0 16px', fontFamily: "'Inter', sans-serif" }}>
                {importState === 'done' ? '✓ Import complete' : `Importing ${selected.size} documents...`}
              </h4>
              {Array.from(selected).map(key => {
                const prog = importProgress[key];
                const pct = prog?.pct ?? 0;
                const isDone = pct >= 100 && !prog?.status?.startsWith('Error');
                const isError = prog?.status?.startsWith('Error');
                return (
                  <div key={key} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: '#2563EB' }}>{key}</span>
                      {isDone && <Check size={14} color="#16A34A" />}
                    </div>
                    <div style={{ height: 4, background: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, background: isError ? '#DC2626' : isDone ? '#16A34A' : '#2563EB', width: `${Math.min(pct, 100)}%`, transition: 'width 300ms ease' }} />
                    </div>
                    <span style={{ fontSize: 11, color: isError ? '#DC2626' : isDone ? '#0D9488' : '#94A3B8', marginTop: 2, display: 'block', fontFamily: "'Inter', sans-serif" }}>
                      {prog?.status || 'Waiting...'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(15,23,42,0.08)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>{importState === 'done' ? '✓ Import complete' : `${selected.size} tickets selected`}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {importState === 'select' && (
              <>
                <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-btn)', background: '#FFFFFF', color: '#334155', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Cancel</button>
                <button onClick={handleImport} disabled={selected.size === 0} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: selected.size > 0 ? '#2563EB' : '#E2E8F0', color: selected.size > 0 ? '#FFFFFF' : '#94A3B8', cursor: selected.size > 0 ? 'pointer' : 'not-allowed', fontFamily: "'Inter', sans-serif" }}>Import {selected.size} Selected</button>
              </>
            )}
            {importState === 'done' && (
              <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Done</button>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes ra-slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}
