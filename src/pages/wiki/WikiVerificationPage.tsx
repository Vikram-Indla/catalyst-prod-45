import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWikiVerificationQueue } from '@/hooks/useWikiHub';
import { ChevronRight, ShieldCheck, RotateCcw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/hooks/useTheme';

export default function WikiVerificationPage() {
  const navigate = useNavigate();
  const { data: queue, isLoading } = useWikiVerificationQueue();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { isDark } = useTheme();

  const border = isDark ? 'var(--ds-border, #2E2E2E)' : 'rgba(0,0,0,0.06)';

  const handleVerify = async (id: string) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    const { error } = await supabase.from('wiki_pages').update({
      verification_status: 'verified',
      verified_by: userId,
      verified_at: new Date().toISOString(),
    } as any).eq('id', id);
    if (error) { toast.error('Failed to verify'); return; }
    toast.success('Article verified');
    qc.invalidateQueries({ queryKey: ['wiki-verification-queue'] });
    qc.invalidateQueries({ queryKey: ['wiki-home-stats'] });
  };

  const handleRequestChanges = async (id: string) => {
    const { error } = await supabase.from('wiki_pages').update({
      verification_status: 'needs_review',
    } as any).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.info('Sent back to author for changes');
    qc.invalidateQueries({ queryKey: ['wiki-verification-queue'] });
  };

  const handleRefreshFreshness = useCallback(async () => {
    setRefreshing(true);
    try {
      await supabase.rpc('compute_freshness_scores');
      toast.success('Freshness scores recalculated');
      qc.invalidateQueries({ queryKey: ['wiki-verification-queue'] });
    } catch { toast.error('Failed to compute freshness'); }
    setRefreshing(false);
  }, [qc]);

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', color: isDark ? 'var(--ds-text, #EDEDED)' : 'var(--ds-text, #0F172A)', background: isDark ? 'var(--cp-bg-page, #1F1F21)' : 'var(--ds-surface-sunken, #F8FAFC)', minHeight: '100%', padding: '24px 40px 48px' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: 'var(--ds-text-brand, #2563EB)', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--ds-text-subtlest, #94A3B8)' }} />
        <span style={{ fontSize: 13, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--ds-text-subtlest, #64748B)', fontWeight: 600 }}>Verification Queue</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 18, fontWeight: 700, margin: 0 }}>Verification Queue</h1>
          <p style={{ fontSize: 12, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--ds-text-subtlest, #64748B)', marginTop: 4 }}>
            Articles requiring review and verification. Articles not updated in &gt;90 days are auto-flagged.
          </p>
        </div>
        <button onClick={handleRefreshFreshness} disabled={refreshing} style={{
          fontSize: 11, fontWeight: 650, padding: '6px 14px', borderRadius: 6,
          border: `0.75px solid ${isDark ? 'var(--ds-border-bold, #454545)' : 'rgba(0,0,0,0.12)'}`, background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #FFFFFF)', color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--ds-text-subtle, #334155)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          opacity: refreshing ? 0.6 : 1,
        }}>
          <RotateCcw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh Freshness
        </button>
      </div>

      <div style={{ borderRadius: 8, border: `0.75px solid ${border}`, background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #FFFFFF)', overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px 100px 180px',
          background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface-sunken, #F1F5F9)', padding: '0 16px', height: 50, alignItems: 'center',
          fontFamily: 'var(--cp-font-heading)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
          color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--ds-text-subtlest, #64748B)', letterSpacing: '0.05em', borderBottom: `0.75px solid ${border}`,
        }}>
          <span>Article</span><span>Domain</span><span>Author</span><span>Fresh.</span><span>Updated</span><span>Actions</span>
        </div>

        {isLoading ? <div style={{ padding: 32, textAlign: 'center', color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--ds-text-subtlest, #64748B)', fontSize: 12 }}>Loading...</div> :
          (queue ?? []).length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <ShieldCheck size={32} style={{ color: 'var(--ds-text-success, #16A34A)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? 'var(--ds-text, #EDEDED)' : 'var(--ds-text, #0F172A)' }}>All clear!</div>
              <div style={{ fontSize: 12, color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--ds-text-subtlest, #64748B)', marginTop: 4 }}>No articles pending review.</div>
            </div>
          ) : (queue ?? []).map((a: any) => {
            const fresh = Math.round(a.freshness_score ?? 100);
            const stale = fresh < 50;
            return (
              <div key={a.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px 100px 180px',
                padding: '0 16px', height: 42, alignItems: 'center',
                borderBottom: `0.75px solid ${border}`, fontSize: 12,
                transition: 'background 80ms',
              }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.04)'}
                 onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                  {stale && <AlertTriangle size={12} style={{ color: 'var(--ds-text-warning, #D97706)', flexShrink: 0 }} />}
                  <span onClick={() => navigate(`/wiki/${a.slug}`)} style={{
                    fontWeight: 500, color: 'var(--ds-text-brand, #2563EB)', cursor: 'pointer',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{a.title}</span>
                </div>
                <span style={{ fontSize: 10, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--ds-text-subtlest, #64748B)' }}>{a.domain_code}</span>
                <span style={{ fontSize: 11, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--ds-text-subtlest, #64748B)' }}>{a.author_name || '—'}</span>
                <span style={{
                  fontFamily: 'var(--cp-font-mono)', fontSize: 11, fontWeight: 500,
                  color: stale ? 'var(--ds-text-warning, #D97706)' : fresh >= 80 ? 'var(--ds-text-success, #16A34A)' : 'var(--ds-text-subtlest, #64748B)',
                }}>{fresh}%</span>
                <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 10, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--ds-text-subtlest, #64748B)' }}>
                  {new Date(a.updated_at).toLocaleDateString()}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleVerify(a.id)} style={{
                    fontSize: 10, fontWeight: 650, padding: '4px 10px', borderRadius: 4, border: 'none',
                    background: 'var(--ds-text-brand, #2563EB)', color: 'var(--ds-surface, #FFFFFF)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}><ShieldCheck size={11} /> Verify</button>
                  <button onClick={() => handleRequestChanges(a.id)} style={{
                    fontSize: 10, fontWeight: 650, padding: '4px 10px', borderRadius: 4,
                    border: `0.75px solid ${isDark ? 'var(--ds-border-bold, #454545)' : 'rgba(0,0,0,0.12)'}`, background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--ds-surface, #FFFFFF)', color: 'var(--ds-text-warning, #D97706)',
                    cursor: 'pointer',
                  }}>Request Changes</button>
                </div>
              </div>
            );
          })}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
