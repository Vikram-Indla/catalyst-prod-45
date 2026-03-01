/**
 * WikiAdminSourcesTab — Sources & Documents with sub-tabs
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWikiDocuments, useReembedDocument, useDeleteDocument } from '@/hooks/useWikiAdminData';
import { SkeletonBlock } from '@/components/wiki/WikiTokens';
import { Upload, Download, Trash2, RefreshCw, Eye } from 'lucide-react';
import { format } from 'date-fns';

export function WikiAdminSourcesTab() {
  const [subTab, setSubTab] = useState<'jira' | 'documents'>('documents');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))' }}>
        {(['documents', 'jira'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            padding: '8px 16px', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: subTab === t ? 600 : 450,
            color: subTab === t ? 'var(--cp-primary-60, #2563EB)' : 'var(--cp-text-tertiary, #64748B)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderBottom: subTab === t ? '2px solid var(--cp-primary-60, #2563EB)' : '2px solid transparent',
            textTransform: 'capitalize',
          }}>{t === 'jira' ? 'Jira Tables' : 'Documents'}</button>
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

  if (isLoading) return <div>{Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} height={36} style={{ marginBottom: 4 }} />)}</div>;

  return (
    <div style={{ border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', borderRadius: 4, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--cp-bg-sunken, #F8FAFC)' }}>
            {['Domain', 'Filename', 'Type', 'Chunks', 'Status', 'Uploaded', 'Actions'].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: 'start', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, #64748B)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(!docs || docs.length === 0) ? (
            <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--cp-text-tertiary, #64748B)' }}>No documents uploaded yet</td></tr>
          ) : docs.map((d: any) => (
            <tr key={d.id} style={{ borderTop: '1px solid var(--cp-border-default, rgba(15,23,42,0.08))', height: 36 }}>
              <td style={{ padding: '8px 12px' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '2px 6px', borderRadius: 3, background: 'var(--cp-bg-sunken, #F1F5F9)' }}>{d.domain_code || '—'}</span>
              </td>
              <td style={{ padding: '8px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.original_filename || d.filename}</td>
              <td style={{ padding: '8px 12px', fontSize: 11 }}>{d.doc_type || d.mime_type || '—'}</td>
              <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{d.chunks_generated ?? '—'}</td>
              <td style={{ padding: '8px 12px' }}><DocStatusLoz status={d.status} /></td>
              <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{d.created_at ? format(new Date(d.created_at), 'MMM d') : '—'}</td>
              <td style={{ padding: '8px 12px', display: 'flex', gap: 4 }}>
                <SmBtn icon={<RefreshCw />} title="Re-embed" onClick={() => reembed.mutate(d.id)} />
                <SmBtn icon={<Trash2 />} title="Delete" onClick={() => deleteMut.mutate(d.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

  return (
    <div style={{ border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))', borderRadius: 4, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--cp-bg-sunken, #F8FAFC)' }}>
            {['Source Table', 'Display Name', 'Enabled', 'Last Synced'].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: 'start', fontWeight: 650, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--cp-text-tertiary, #64748B)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(!sources || sources.length === 0) ? (
            <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--cp-text-tertiary, #64748B)' }}>No Jira sources configured</td></tr>
          ) : sources.map((s: any) => (
            <tr key={s.id} style={{ borderTop: '1px solid var(--cp-border-default, rgba(15,23,42,0.08))', height: 36 }}>
              <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{s.source_table}</td>
              <td style={{ padding: '8px 12px' }}>{s.display_name || s.source_table}</td>
              <td style={{ padding: '8px 12px' }}>{s.is_enabled ? '✓' : '✕'}</td>
              <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{s.last_synced_at ? format(new Date(s.last_synced_at), 'MMM d HH:mm') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SmBtn({ icon, title, onClick }: { icon: React.ReactElement; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} style={{
      padding: 4, borderRadius: 3, border: '1px solid var(--cp-border-default, rgba(15,23,42,0.12))',
      background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
      color: 'var(--cp-text-tertiary, #64748B)',
    }}>
      {React.cloneElement(icon, { style: { width: 12, height: 12 } })}
    </button>
  );
}

function DocStatusLoz({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    complete: { bg: '#E3FCEF', color: '#006644' },
    uploaded: { bg: '#DEEBFF', color: '#0747A6' },
    processing: { bg: '#DEEBFF', color: '#0747A6' },
    parsing: { bg: '#DEEBFF', color: '#0747A6' },
    chunking: { bg: '#DEEBFF', color: '#0747A6' },
    embedding: { bg: '#DEEBFF', color: '#0747A6' },
    failed: { bg: '#DFE1E6', color: '#44546F' },
    deleted: { bg: '#DFE1E6', color: '#44546F' },
  };
  const s = map[status] ?? map.failed;
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 3, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{status}</span>;
}
