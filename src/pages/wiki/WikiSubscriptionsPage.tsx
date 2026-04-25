import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Bell, Layers, Tag, FileText, X, Plus } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const F = {
  sora: "'Sora', sans-serif",
  inter: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const DOMAINS = [
  { code: 'D1', name: 'Industrial Licensing' },
  { code: 'D2', name: 'Supply Chain & Logistics' },
  { code: 'D3', name: 'Quality & Standards' },
  { code: 'D4', name: 'Environmental Compliance' },
  { code: 'D5', name: 'Investment & Incentives' },
  { code: 'D6', name: 'Digital & 4IR' },
  { code: 'D7', name: 'Workforce & Safety' },
  { code: 'D8', name: 'Trade & Export' },
  { code: 'D9', name: 'Mining & Resources' },
];

function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data?.session?.user?.id ?? null));
  }, []);
  return userId;
}

export default function WikiSubscriptionsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const userId = useUserId();
  const [newTag, setNewTag] = useState('');
  const { isDark } = useTheme();

  const border = isDark ? '#2E2E2E' : 'rgba(0,0,0,0.06)';

  // Fetch subscriptions
  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['wiki-subscriptions', userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_subscriptions')
        .select('*')
        .eq('user_id', userId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch subscribed articles
  const articleSubs = subs.filter((s: any) => s.entity_type === 'article');
  const articleIds = articleSubs.map((s: any) => s.entity_id);
  const { data: subArticles = [] } = useQuery({
    queryKey: ['wiki-sub-articles', articleIds],
    enabled: articleIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('id, slug, title, domain_code')
        .in('id', articleIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const domainSubs = new Set(subs.filter((s: any) => s.entity_type === 'domain').map((s: any) => s.entity_id));
  const tagSubs = subs.filter((s: any) => s.entity_type === 'tag').map((s: any) => s.entity_id);

  // Toggle subscription
  const toggleSub = useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType: string; entityId: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const existing = subs.find((s: any) => s.entity_type === entityType && s.entity_id === entityId);
      if (existing) {
        await supabase.from('wiki_subscriptions').delete().eq('id', existing.id);
      } else {
        await (supabase.from('wiki_subscriptions') as any).insert({ user_id: userId, entity_type: entityType, entity_id: entityId });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wiki-subscriptions'] });
    },
  });

  const addTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    toggleSub.mutate({ entityType: 'tag', entityId: tag });
    setNewTag('');
  };

  return (
    <div style={{ fontFamily: F.inter, color: isDark ? '#EDEDED' : '#0F172A', background: isDark ? '#0A0A0A' : '#F8FAFC', minHeight: '100%', padding: '24px 40px 60px' }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 13, color: '#2563EB', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: isDark ? '#878787' : '#94A3B8' }} />
        <span style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#64748B', fontWeight: 600 }}>Subscriptions</span>
      </nav>

      <h1 style={{ fontFamily: F.sora, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Subscriptions</h1>
      <p style={{ fontSize: 12, color: isDark ? '#A1A1A1' : '#64748B', marginBottom: 32 }}>Get notified when content you follow is updated.</p>

      {/* ═══ DOMAIN SUBSCRIPTIONS ═══ */}
      <SectionLabel icon={<Layers size={14} style={{ color: '#2563EB' }} />} label="Domain Subscriptions" isDark={isDark} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, marginBottom: 32 }}>
        {DOMAINS.map(d => {
          const active = domainSubs.has(d.code);
          return (
            <button
              key={d.code}
              onClick={() => toggleSub.mutate({ entityType: 'domain', entityId: d.code })}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                borderRadius: 8, background: isDark ? '#1A1A1A' : '#FFFFFF', border: `0.75px solid ${active ? '#2563EB' : border}`,
                cursor: 'pointer', transition: 'all 120ms', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: active ? (isDark ? 'rgba(37,99,235,0.15)' : '#DBEAFE') : (isDark ? '#1A1A1A' : '#F1F5F9'), color: active ? (isDark ? '#93C5FD' : '#1E40AF') : (isDark ? '#878787' : '#64748B') }}>{d.code}</span>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: isDark ? '#EDEDED' : '#0F172A', flex: 1 }}>{d.name}</span>
              <div style={{
                width: 36, height: 20, borderRadius: 12,
                background: active ? '#2563EB' : (isDark ? '#292929' : '#E2E8F0'),
                position: 'relative', transition: 'background 150ms',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: isDark ? '#EDEDED' : '#FFFFFF',
                  position: 'absolute', top: 2,
                  left: active ? 18 : 2, transition: 'left 150ms',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══ TAG SUBSCRIPTIONS ═══ */}
      <SectionLabel icon={<Tag size={14} style={{ color: '#2563EB' }} />} label="Tag Subscriptions" isDark={isDark} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {tagSubs.map((tag: string) => (
          <span key={tag} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
            borderRadius: 4, background: isDark ? '#1A1A1A' : '#F1F5F9', border: `0.75px solid ${border}`,
            fontSize: 11, fontWeight: 500, color: isDark ? '#A1A1A1' : '#334155',
          }}>
            {tag}
            <X size={11} style={{ color: isDark ? '#878787' : '#94A3B8', cursor: 'pointer' }} onClick={() => toggleSub.mutate({ entityType: 'tag', entityId: tag })} />
          </span>
        ))}
        {tagSubs.length === 0 && <span style={{ fontSize: 11, color: isDark ? '#878787' : '#94A3B8' }}>No tag subscriptions yet.</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        <input
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTag()}
          placeholder="Add a tag..."
          style={{
            height: 32, padding: '8px 12px', fontSize: 12, borderRadius: 6,
            border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(0,0,0,0.1)'}`, background: isDark ? '#1A1A1A' : '#FFFFFF',
            outline: 'none', width: 180, color: isDark ? '#EDEDED' : undefined,
          }}
        />
        <button onClick={addTag} style={{
          height: 32, padding: '0 14px', borderRadius: 6, background: '#2563EB',
          color: '#FFFFFF', border: 'none', fontSize: 11, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Plus size={12} /> Add
        </button>
      </div>

      {/* ═══ ARTICLE SUBSCRIPTIONS ═══ */}
      <SectionLabel icon={<FileText size={14} style={{ color: '#2563EB' }} />} label="Article Subscriptions" isDark={isDark} />
      <div style={{ borderRadius: 8, border: `0.75px solid ${border}`, background: isDark ? '#1A1A1A' : '#FFFFFF', overflow: 'hidden' }}>
        {subArticles.length > 0 ? subArticles.map((a: any) => (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
            borderBottom: `0.75px solid ${border}`, transition: 'background 80ms',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <FileText size={14} style={{ color: isDark ? '#878787' : '#94A3B8', flexShrink: 0 }} />
            <span onClick={() => navigate(`/wiki/${a.slug}`)} style={{ fontSize: 12.5, fontWeight: 500, color: isDark ? '#EDEDED' : '#0F172A', cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
            <span style={{ fontSize: 9, fontWeight: 650, padding: '1px 5px', borderRadius: 4, background: isDark ? '#1A1A1A' : '#F1F5F9', color: isDark ? '#878787' : '#64748B' }}>{a.domain_code}</span>
            <button
              onClick={() => toggleSub.mutate({ entityType: 'article', entityId: a.id })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#DC2626', fontWeight: 500 }}
            >
              Unsubscribe
            </button>
          </div>
        )) : (
          <div style={{ padding: 32, textAlign: 'center', color: isDark ? '#878787' : '#64748B', fontSize: 12 }}>
            No article subscriptions. Subscribe to articles from their detail pages.
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ icon, label, isDark }: { icon: React.ReactNode; label: string; isDark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
      {icon}
      <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 14, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A' }}>{label}</span>
    </div>
  );
}
