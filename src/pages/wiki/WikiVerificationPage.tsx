import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWikiVerificationQueue } from '@/hooks/useWikiHub';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function WikiVerificationPage() {
  const navigate = useNavigate();
  const { data: queue, isLoading } = useWikiVerificationQueue();
  const qc = useQueryClient();

  const handleVerify = async (id: string) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    const { error } = await supabase.from('wiki_pages').update({
      verification_status: 'verified',
      verified_by: userId,
      verified_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { toast.error('Failed to verify'); return; }
    toast.success('Article verified');
    qc.invalidateQueries({ queryKey: ['wiki-verification-queue'] });
    qc.invalidateQueries({ queryKey: ['wiki-home-stats'] });
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#0F172A', background: '#F8FAFC', minHeight: '100%', padding: '24px 40px 48px' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: '#94A3B8' }} />
        <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Verification Queue</span>
      </nav>

      <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Verification Queue</h1>
      <p style={{ fontSize: 12, color: '#64748B', marginBottom: 24 }}>Articles requiring review and verification by domain experts.</p>

      <div style={{ borderRadius: 8, border: '0.75px solid rgba(0,0,0,0.06)', background: '#FFFFFF', overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 100px 120px 100px 100px 100px',
          background: '#F1F5F9', padding: '0 16px', height: 36, alignItems: 'center',
          fontFamily: 'Sora, sans-serif', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, color: '#64748B', letterSpacing: '0.05em',
          borderBottom: '0.75px solid rgba(0,0,0,0.06)',
        }}>
          <span>Article</span><span>Domain</span><span>Author</span><span>Freshness</span><span>Last Updated</span><span>Action</span>
        </div>
        {isLoading ? <div style={{ padding: 32, textAlign: 'center', color: '#64748B', fontSize: 12 }}>Loading...</div> :
          (queue ?? []).length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#64748B', fontSize: 12 }}>No articles pending review. 🎉</div> :
          (queue ?? []).map((a: any) => (
            <div key={a.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 120px 100px 100px 100px',
              padding: '0 16px', height: 42, alignItems: 'center', borderBottom: '0.75px solid rgba(0,0,0,0.06)', fontSize: 12,
            }}>
              <span onClick={() => navigate(`/wiki/${a.slug}`)} style={{ fontWeight: 500, color: '#2563EB', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
              <span style={{ fontSize: 10, color: '#64748B' }}>{a.domain_code}</span>
              <span style={{ fontSize: 11, color: '#64748B' }}>{a.author_name || '—'}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: (a.freshness_score ?? 100) < 50 ? '#D97706' : '#64748B' }}>{Math.round(a.freshness_score ?? 100)}%</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#64748B' }}>{new Date(a.updated_at).toLocaleDateString()}</span>
              <button onClick={() => handleVerify(a.id)} style={{
                fontSize: 11, fontWeight: 650, padding: '4px 12px', borderRadius: 4, border: 'none',
                background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}><ShieldCheck size={12} /> Verify</button>
            </div>
          ))}
      </div>
    </div>
  );
}
