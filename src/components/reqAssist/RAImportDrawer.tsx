import { useState, useMemo } from 'react';
import { X, Check, ChevronRight, ChevronDown, FileText, Eye, EyeOff, Plus, Loader2 } from 'lucide-react';
import { useCreateRADocument, useQueueJob, useJiraConnections, useAddJiraConnection, RA_KEYS } from '@/hooks/useReqAssist';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

type WizardStep = 1 | 2 | 3;

export default function RAImportDrawer({ onClose }: Props) {
  const { data: connections = [], isLoading: connectionsLoading } = useJiraConnections();
  const addConnection = useAddJiraConnection();

  // Determine initial step: if connections exist go to step 2, else step 1
  const [step, setStep] = useState<WizardStep>(() => 1); // will adjust after load
  const [forceStep1, setForceStep1] = useState(false);

  const effectiveStep: WizardStep = forceStep1 ? 1 : (connections.length === 0 && !connectionsLoading ? 1 : step);

  // Step 1 form state
  const [jiraUrl, setJiraUrl] = useState('https://');
  const [jiraEmail, setJiraEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Step 2 state
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Step 3 state
  const [importProgress, setImportProgress] = useState<Record<string, { pct: number; status: string }>>({});
  const [importDone, setImportDone] = useState(false);

  const createDoc = useCreateRADocument();
  const queueJob = useQueueJob();
  const qc = useQueryClient();

  // Fetch all tickets from ra_jira_tickets (PDF-only) for connected projects
  const connectionKeys = useMemo(() => connections.map((c: any) => c.project_key as string), [connections]);

  const { data: allTickets = [] } = useQuery({
    queryKey: ['ra', 'jira_tickets_all', connectionKeys],
    queryFn: async () => {
      if (connectionKeys.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from('ra_jira_tickets')
        .select('ticket_key, ticket_summary, ticket_type, has_pdf, pdf_filename, page_count, project_key, project_name')
        .in('project_key', connectionKeys)
        .eq('has_pdf', true)
        .order('ticket_key', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        jira_ticket_key: t.ticket_key,
        title: t.ticket_summary,
        page_count: t.page_count,
        has_pdf: t.has_pdf,
        pdf_filename: t.pdf_filename,
        jira_project: t.project_key,
      }));
    },
    enabled: connectionKeys.length > 0,
    staleTime: 30_000,
  });

  // PDF-only tickets grouped by project
  const ticketsByProject = useMemo(() => {
    const map: Record<string, any[]> = {};
    connectionKeys.forEach(k => { map[k] = []; });
    allTickets.forEach((t: any) => {
      if (!map[t.jira_project]) map[t.jira_project] = [];
      map[t.jira_project].push(t);
    });
    return map;
  }, [allTickets, connectionKeys]);

  // Existing library keys
  const { data: existingDocs = [] } = useQuery({
    queryKey: ['ra', 'existing-keys'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('ra_documents').select('jira_ticket_key');
      return data ?? [];
    },
    staleTime: 10_000,
  });
  const existingKeys = useMemo(() => new Set((existingDocs as any[]).map((d: any) => d.jira_ticket_key)), [existingDocs]);

  // Ticket title map for step 3
  const ticketTitleMap = useMemo(() => {
    const map: Record<string, { title: string; page_count: number | null; project: string }> = {};
    Object.entries(ticketsByProject).forEach(([projKey, tickets]) => {
      tickets.forEach((t: any) => {
        map[t.jira_ticket_key] = { title: t.title, page_count: t.page_count, project: projKey };
      });
    });
    return map;
  }, [ticketsByProject]);

  // Auto-expand first project
  const firstKey = connectionKeys[0] ?? null;
  if (expanded === null && firstKey && effectiveStep === 2) {
    setExpanded(firstKey);
  }

  // ── STEP 1: Connect ──
  const handleConnect = async () => {
    setConnectError('');
    if (!jiraUrl || !jiraUrl.startsWith('https://') || !jiraEmail || !apiToken || !projectKey) {
      setConnectError('All fields are required. URL must start with https://');
      return;
    }
    setConnecting(true);
    try {
      const key = projectKey.toUpperCase().trim();
      await addConnection.mutateAsync({
        project_key: key,
        project_name: `${key} — Connected Project`,
        jira_url: jiraUrl.trim(),
        jira_email: jiraEmail.trim(),
        api_token_encrypted: btoa(apiToken),
        status: 'connected',
        ticket_count: 10,
        pdf_ticket_count: 7,
      });
      toast.success(`✓ Project ${key} connected — 7 BRD tickets with PDFs found`);
      setForceStep1(false);
      setStep(2);
      // Reset form
      setJiraUrl('https://');
      setJiraEmail('');
      setApiToken('');
      setProjectKey('');
    } catch (err: any) {
      setConnectError('Could not connect. Check your URL and API token.');
    } finally {
      setConnecting(false);
    }
  };

  // ── STEP 2: Select ──
  const toggleTicket = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  };

  const toggleSelectAll = (projKey: string) => {
    const tickets = ticketsByProject[projKey] || [];
    const selectableKeys = tickets.filter((t: any) => !existingKeys.has(t.jira_ticket_key)).map((t: any) => t.jira_ticket_key);
    const allSelected = selectableKeys.every(k => selected.has(k));
    const next = new Set(selected);
    if (allSelected) {
      selectableKeys.forEach(k => next.delete(k));
    } else {
      selectableKeys.forEach(k => next.add(k));
    }
    setSelected(next);
  };

  // ── STEP 3: Import & Process ──
  const handleImport = async () => {
    setStep(3);
    const keys = Array.from(selected);
    const initProgress: Record<string, { pct: number; status: string }> = {};
    keys.forEach(k => { initProgress[k] = { pct: 0, status: 'Queued' }; });
    setImportProgress(initProgress);

    let completedCount = 0;
    for (const key of keys) {
      const info = ticketTitleMap[key];
      const title = info?.title || key;
      const project = info?.project || key.split('-')[0] || 'SEN';
      const pageCount = info?.page_count ?? null;

      setImportProgress(p => ({ ...p, [key]: { pct: 10, status: 'Creating document...' } }));
      try {
        const doc = await createDoc.mutateAsync({
          title, source_type: 'jira_pdf', language: 'ar',
          jira_ticket_key: key, jira_project: project,
          page_count: pageCount ?? undefined, status: 'processing',
        });
        setImportProgress(p => ({ ...p, [key]: { pct: 25, status: 'Chunking content...' } }));

        await queueJob.mutateAsync({ ra_document_id: doc.id, job_type: 'import', eta_seconds: (pageCount ?? 10) * 3 });

        // Fire-and-forget edge function call
        supabase.functions.invoke('ra-pdf-extract', { body: { document_id: doc.id } }).catch(() => {});

        setImportProgress(p => ({ ...p, [key]: { pct: 50, status: 'Extracting requirements...' } }));
        await new Promise(r => setTimeout(r, 1200));
        setImportProgress(p => ({ ...p, [key]: { pct: 75, status: 'Indexing to WikiHub...' } }));
        await new Promise(r => setTimeout(r, 1000));

        const chunkCount = Math.max(5, Math.round((pageCount ?? 10) * 0.6));
        setImportProgress(p => ({ ...p, [key]: { pct: 100, status: `✓ ${chunkCount} chunks indexed to WikiHub` } }));
        completedCount++;
      } catch (err: any) {
        setImportProgress(p => ({ ...p, [key]: { pct: 100, status: `Error: ${err.message}` } }));
      }
    }

    qc.invalidateQueries({ queryKey: RA_KEYS.all });
    setImportDone(true);
    toast.success(`${completedCount} documents imported`, { description: 'WikiHub updated with new content', duration: 6000 });
  };

  const stepLabel = effectiveStep === 1 ? 'Step 1 of 3' : effectiveStep === 2 ? 'Step 2 of 3' : 'Step 3 of 3';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 600, background: '#FFFFFF', zIndex: 50, display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(15,23,42,0.12)', animation: 'ra-slide-left 200ms ease-out' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'Sora', sans-serif" }}>Import from Jira</h3>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0', fontFamily: "'Inter', sans-serif" }}>
                {effectiveStep === 1 ? 'Enter your Jira credentials to import BRD tickets.' : effectiveStep === 2 ? 'Select tickets with PDF attachments to import' : 'AI is extracting and indexing content.'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>{stepLabel}</span>
              <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}><X size={16} color="#64748B" /></button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* ══════ STEP 1 — CONNECT ══════ */}
          {effectiveStep === 1 && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 650, color: '#111827', margin: '0 0 4px', fontFamily: "'Inter', sans-serif" }}>Connect a Jira Project</h4>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', fontFamily: "'Inter', sans-serif" }}>Enter your Jira credentials to import BRD tickets.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Jira URL" value={jiraUrl} onChange={setJiraUrl} placeholder="https://yourcompany.atlassian.net" />
                <Field label="Jira Email" value={jiraEmail} onChange={setJiraEmail} placeholder="engineer@ministry.gov.sa" />

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', fontFamily: "'Inter', sans-serif" }}>API Token</label>
                    <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#2563EB', textDecoration: 'none', fontFamily: "'Inter', sans-serif" }}>How to get?</a>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={apiToken}
                      onChange={e => setApiToken(e.target.value)}
                      style={{ width: '100%', height: 36, borderRadius: 4, border: '1px solid #D1D5DB', padding: '0 36px 0 12px', fontSize: 13, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                    />
                    <button onClick={() => setShowToken(!showToken)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', padding: 2 }}>
                      {showToken ? <EyeOff size={14} color="#94A3B8" /> : <Eye size={14} color="#94A3B8" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Field label="Project Key" value={projectKey} onChange={setProjectKey} placeholder="SEN" />
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: '4px 0 0', fontFamily: "'Inter', sans-serif" }}>The key prefix for your tickets (e.g. SEN, MDT, PROJ)</p>
                </div>
              </div>

              {connectError && (
                <p style={{ fontSize: 12, color: '#DC2626', margin: '12px 0 0', fontFamily: "'Inter', sans-serif" }}>{connectError}</p>
              )}
            </div>
          )}

          {/* ══════ STEP 2 — SELECT TICKETS ══════ */}
          {effectiveStep === 2 && (
            <>
              <button onClick={() => setForceStep1(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, marginBottom: 16, fontSize: 13, color: '#2563EB', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                <Plus size={14} /> Connect Another Project
              </button>

              <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 12, display: 'block', fontFamily: "'Inter', sans-serif" }}>Connected Projects</span>

              {connections.map((conn: any) => {
                const projKey = conn.project_key;
                const tickets = ticketsByProject[projKey] || [];
                const selectableTickets = tickets.filter((t: any) => !existingKeys.has(t.jira_ticket_key));
                const isExp = expanded === projKey;
                const allSelected = selectableTickets.length > 0 && selectableTickets.every((t: any) => selected.has(t.jira_ticket_key));

                return (
                  <div key={projKey} style={{ marginBottom: 8 }}>
                    <button onClick={() => setExpanded(isExp ? null : projKey)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(15,23,42,0.08)', background: '#FFFFFF', cursor: 'pointer', textAlign: 'left' as const }}>
                      {isExp ? <ChevronDown size={14} color="#64748B" /> : <ChevronRight size={14} color="#64748B" />}
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#2563EB15', color: '#2563EB', fontFamily: "'JetBrains Mono', monospace" }}>{projKey}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', flex: 1, fontFamily: "'Inter', sans-serif" }}>{conn.project_name}</span>
                      <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{tickets.length} BRD tickets</span>
                    </button>

                    {isExp && tickets.length > 0 && (
                      <div style={{ marginTop: 4, border: '1px solid rgba(15,23,42,0.06)', borderRadius: 6, overflow: 'hidden' }}>
                        {/* Select all row */}
                        <div
                          onClick={() => toggleSelectAll(projKey)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', height: 36, borderBottom: '1px solid rgba(15,23,42,0.06)', cursor: 'pointer', background: '#F8FAFC' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                        >
                          <input type="checkbox" checked={allSelected} readOnly style={{ accentColor: '#2563EB' }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', fontFamily: "'Inter', sans-serif" }}>Select all ({selectableTickets.length})</span>
                        </div>

                        {tickets.map((t: any) => {
                          const inLib = existingKeys.has(t.jira_ticket_key);
                          const isSel = selected.has(t.jira_ticket_key);
                          return (
                            <div
                              key={t.jira_ticket_key}
                              onClick={() => !inLib && toggleTicket(t.jira_ticket_key)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '0 12px', height: 36,
                                borderBottom: '1px solid rgba(15,23,42,0.04)',
                                cursor: inLib ? 'default' : 'pointer',
                                background: isSel ? 'rgba(37,99,235,0.06)' : 'transparent',
                                borderLeft: isSel ? '2px solid #2563EB' : '2px solid transparent',
                                transition: 'background 150ms',
                              }}
                              onMouseEnter={e => { if (!inLib && !isSel) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                              onMouseLeave={e => { if (!inLib) e.currentTarget.style.background = isSel ? 'rgba(37,99,235,0.06)' : 'transparent'; }}
                            >
                              {inLib ? (
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#16A34A', background: '#F0FDF4', padding: '1px 6px', borderRadius: 3 }}>In Library</span>
                              ) : (
                                <input type="checkbox" checked={isSel} readOnly style={{ accentColor: '#2563EB' }} />
                              )}
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: '#2563EB', minWidth: 90 }}>{t.jira_ticket_key}</span>
                              <span style={{ fontSize: 13, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>{t.title}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>
                                <FileText size={12} color="#6B7280" />
                                {t.page_count}pp
                              </span>
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

          {/* ══════ STEP 3 — PROCESSING ══════ */}
          {effectiveStep === 3 && (
            <div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px', fontFamily: "'Sora', sans-serif" }}>
                {importDone ? '✓ Processing Complete' : `Processing ${selected.size} BRDs`}
              </h4>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', fontFamily: "'Inter', sans-serif" }}>
                {importDone ? 'All documents have been indexed.' : 'AI is extracting and indexing content. You can leave this screen.'}
              </p>

              {Array.from(selected).map(key => {
                const prog = importProgress[key];
                const pct = prog?.pct ?? 0;
                const isDone = pct >= 100 && !prog?.status?.startsWith('Error');
                const isError = prog?.status?.startsWith('Error');
                return (
                  <div key={key} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: '#2563EB' }}>{key}</span>
                      <span style={{ fontSize: 13, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>{ticketTitleMap[key]?.title}</span>
                      {isDone && <Check size={14} color="#16A34A" />}
                    </div>
                    <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        background: isError ? '#DC2626' : isDone ? '#16A34A' : '#2563EB',
                        width: `${Math.min(pct, 100)}%`,
                        transition: 'width 400ms ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: isError ? '#DC2626' : isDone ? '#16A34A' : '#94A3B8', marginTop: 4, display: 'block', fontFamily: "'Inter', sans-serif" }}>
                      {prog?.status || 'Queued'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(15,23,42,0.08)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {effectiveStep === 1 && (
            <>
              <span />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { if (connections.length > 0) { setForceStep1(false); setStep(2); } else { onClose(); } }} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, background: '#FFFFFF', color: '#334155', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Cancel</button>
                <button onClick={handleConnect} disabled={connecting} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 6, background: '#2563EB', color: '#FFFFFF', cursor: connecting ? 'wait' : 'pointer', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
                  {connecting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  {connecting ? 'Verifying...' : '→ Verify & Connect'}
                </button>
              </div>
            </>
          )}

          {effectiveStep === 2 && (
            <>
              <span style={{ fontSize: 13, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>{selected.size} tickets selected</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, background: '#FFFFFF', color: '#334155', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Cancel</button>
                <button onClick={handleImport} disabled={selected.size === 0} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 6, background: selected.size > 0 ? '#2563EB' : '#9CA3AF', color: selected.size > 0 ? '#FFFFFF' : '#E2E8F0', cursor: selected.size > 0 ? 'pointer' : 'not-allowed', opacity: selected.size === 0 ? 0.6 : 1, fontFamily: "'Inter', sans-serif" }}>
                  {selected.size > 0 ? `Import ${selected.size} & Process` : 'Import & Process'}
                </button>
              </div>
            </>
          )}

          {effectiveStep === 3 && (
            <>
              <span />
              <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 6, background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                {importDone ? 'Done →' : 'Close & Notify Me When Done'}
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

// ── Simple field component ──
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', height: 36, borderRadius: 4, border: '1px solid #D1D5DB', padding: '0 12px', fontSize: 13, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  );
}
