/**
 * WikiAdminSourcesTab — Sources & Documents with sub-tabs + CSV export
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWikiDocuments, useReembedDocument, useDeleteDocument } from '@/hooks/useWikiAdminData';
import { SkeletonBlock } from '@/components/wiki/WikiTokens';
import { EmptyState } from './WikiAdminSyncTab';
import { Download, Trash2, RefreshCw, Database, FileText } from 'lucide-react';
import { format } from 'date-fns';

export function WikiAdminSourcesTab() {
  const [subTab, setSubTab] = useState<'jira' | 'documents'>('documents');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))' }}>
        {(['documents', 'jira'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            padding: '8px 16px', fontSize: 12, fontFamily: 'var(--cp-font-body)', fontWeight: subTab === t ? 600 : 450,
            color: subTab === t ? 'var(--cp-primary-60, #2563EB)' : 'var(--cp-text-tertiary, #64748B)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderBottom: subTab === t ? '2px solid var(--cp-primary-60, #2563EB)' : '2px solid transparent',
            textTransform: 'capitalize', outline: 'none',
          }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-primary-60, #2563EB)'; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          >{t === 'jira' ? 'Jira Tables' : 'Documents'}</button>
        ))}
      </div>
      {subTab === 'documents' ? <DocumentsTable /> : <JiraSourcesTable />}
    </div>
  );
}

function DocumentsTable() {
  const { data: docs, isLoading } = useWikiDocuments();
  const reembed = useReembedDocument();
  const deleteMut = useDeleteDocument();

  const exportCSV = () => {
    if (!docs || docs.length === 0) return;
    const headers = ['Domain', 'Filename', 'Type', 'Chunks', 'Status', 'Uploaded'];
    const rows = docs.map((d: any) => [
      d.domain_code ?? '', d.original_filename ?? d.filename ?? '', d.doc_type ?? d.mime_type ?? '',
      d.chunks_generated ?? '', d.status ?? '', d.created_at ? format(new Date(d.created_at), 'yyyy-MM-dd') : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: string) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `wiki-documents-${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (isLoading) return <div>{Array.from({ length: 5 }).map((_, i) => <SkeletonBlock key={i} height={36} style={{ marginBottom: 4 }} />)}</div>;

  if (!docs || docs.length === 0) {
    return <EmptyState icon={<FileText style={{ width: 28, height: 28, color: 'var(--cp-text-tertiary, #64748B)' }} />} message="No documents uploaded yet" sub="Use the Upload Document button to add documents." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Export button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={exportCSV} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 4,
          border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
          background: 'transparent', cursor: 'pointer',
          fontFamily: 'var(--cp-font-body)', fontSize: 11, fontWeight: 600,
          color: 'var(--cp-text-secondary, #334155)', outline: 'none',
        }}
          onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-primary-60, #2563EB)'; }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Download style={{ width: 12, height: 12 }} /> Export Manifest
        </button>
      </div>

      <div style={{ border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', borderRadius: 4, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--cp-font-body)', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--cp-bg-sunken, #F8FAFC)' }}>
              {['Domain', 'Filename', 'Type', 'Chunks', 'Status', 'Uploaded', 'Actions'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'start', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, #64748B)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.map((d: any) => (
              <tr key={d.id} style={{ borderTop: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.08))', height: 50 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'var(--cp-bg-sunken, #F1F5F9)' }}>{d.domain_code ?? '—'}</span>
                </td>
                <td style={{ padding: '8px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.original_filename || d.filename}>{d.original_filename || d.filename || '—'}</td>
                <td style={{ padding: '8px 12px', fontSize: 11 }}>{d.doc_type || d.mime_type || '—'}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{d.chunks_generated ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}><DocStatusLoz status={d.status} /></td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{d.created_at ? format(new Date(d.created_at), 'MMM d') : '—'}</td>
                <td style={{ padding: '8px 12px', display: 'flex', gap: 4 }}>
                  <SmBtn icon={<RefreshCw />} title="Re-embed" onClick={() => reembed.mutate(d.id)} />
                  <SmBtn icon={<Trash2 />} title="Delete" onClick={() => deleteMut.mutate(d.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JiraSourcesTable() {
  const { data: sources, isLoading } = useQuery({
    queryKey: ['wiki-admin-jira-sources'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kb_sources').select('*').order('source_table', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <div>{Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} height={36} style={{ marginBottom: 4 }} />)}</div>;

  if (!sources || sources.length === 0) {
    return <EmptyState icon={<Database style={{ width: 28, height: 28, color: 'var(--cp-text-tertiary, #64748B)' }} />} message="No Jira sources configured" sub="Configure Jira sync sources in the KB admin settings." />;
  }

  return (
    <div style={{ border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', borderRadius: 4, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--cp-font-body)', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--cp-bg-sunken, #F8FAFC)' }}>
            {['Source Table', 'Display Name', 'Enabled', 'Last Synced'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'start', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, #64748B)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sources.map((s: any) => (
            <tr key={s.id} style={{ borderTop: '0.75px solid var(--cp-border-default, rgba(15,23,42,0.08))', height: 50 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <td style={{ padding: '8px 12px', fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{s.source_table ?? '—'}</td>
              <td style={{ padding: '8px 12px' }}>{s.display_name || s.source_table || '—'}</td>
              <td style={{ padding: '8px 12px' }}>{s.is_enabled ? '✓' : '✕'}</td>
              <td style={{ padding: '8px 12px', fontFamily: 'var(--cp-font-mono)', fontSize: 11 }}>{s.last_synced_at ? format(new Date(s.last_synced_at), 'MMM d HH:mm') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SmBtn({ icon, title, onClick }: { icon: React.ReactElement; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} style={{
      padding: 4, borderRadius: 4, border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
      background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
      color: 'var(--cp-text-tertiary, #64748B)', outline: 'none',
    }}
      onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--cp-primary-60, #2563EB)'; }}
      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {React.cloneElement(icon, { style: { width: 12, height: 12 } })}
    </button>
  );
}

function DocStatusLoz({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    complete: { bg: '#1B7F37', color: '#0D7331' },
    uploaded: { bg: '#0C66E4', color: '#FFFFFF' },
    processing: { bg: '#0C66E4', color: '#FFFFFF' },
    parsing: { bg: '#0C66E4', color: '#FFFFFF' },
    chunking: { bg: '#0C66E4', color: '#FFFFFF' },
    embedding: { bg: '#0C66E4', color: '#FFFFFF' },
    failed: { bg: '#DFE1E6', color: '#44546F' },
    deleted: { bg: '#DFE1E6', color: '#44546F' },
  };
  const s = map[status] ?? map.failed;
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{status ?? '—'}</span>;
}
