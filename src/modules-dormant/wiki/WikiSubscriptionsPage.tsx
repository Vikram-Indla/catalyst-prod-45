import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Bell, Layers, Tag, FileText, X, Plus } from '@/lib/atlaskit-icons';
import { useTheme } from '@/hooks/useTheme';

const F = {
  sora: "var(--ds-font-family-heading)",
  inter: "var(--ds-font-family-body)",
  mono: "var(--ds-font-family-code)",
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

  const border = isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-shadow-raised, rgba(0,0,0,0.06))';

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
    <div style={{ fontFamily: F.inter, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', background: isDark ? 'var(--cp-bg-page)' : 'var(--ds-surface-sunken)', minHeight: '100%', padding: '24px 40px 60px' }}>
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }} />
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontWeight: 600 }}>Subscriptions</span>
      </nav>

      <h1 style={{ fontFamily: F.sora, fontSize: 'var(--ds-font-size-600)', fontWeight: 700, marginBottom: 4 }}>Subscriptions</h1>
      <p style={{ fontSize: 'var(--ds-font-size-200)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginBottom: 32 }}>Get notified when content you follow is updated.</p>

      {/* ═══ DOMAIN SUBSCRIPTIONS ═══ */}
      <SectionLabel icon={<Layers size={14} style={{ color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' }} />} label="Domain Subscriptions" isDark={isDark} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, marginBottom: 32 }}>
        {DOMAINS.map(d => {
          const active = domainSubs.has(d.code);
          return (
            <button
              key={d.code}
              onClick={() => toggleSub.mutate({ entityType: 'domain', entityId: d.code })}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
                borderRadius: 8, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: `0.75px solid ${active ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : border}`,
                cursor: 'pointer', transition: 'all 120ms', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, padding: '0px 6px', borderRadius: 4, background: active ? (isDark ? 'var(--ds-background-information, rgba(37,99,235,0.15))' : 'var(--ds-background-information, var(--ds-background-information))') : (isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))'), color: active ? (isDark ? 'var(--ds-background-information, var(--ds-background-information))' : 'var(--ds-link-pressed, var(--ds-link-pressed))') : (isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary, var(--ds-text-subtlest)))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))') }}>{d.code}</span>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', flex: 1 }}>{d.name}</span>
              <div style={{
                width: 36, height: 20, borderRadius: 12,
                background: active ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : (isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))'),
                position: 'relative', transition: 'background 150ms',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
                  position: 'absolute', top: 0,
                  left: active ? 18 : 2, transition: 'left 150ms',
                  boxShadow: '0 1px 3px var(--ds-shadow-raised, rgba(0,0,0,0.15))',
                }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══ TAG SUBSCRIPTIONS ═══ */}
      <SectionLabel icon={<Tag size={14} style={{ color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' }} />} label="Tag Subscriptions" isDark={isDark} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        {tagSubs.map((tag: string) => (
          <span key={tag} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
            borderRadius: 4, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', border: `0.75px solid ${border}`,
            fontSize: 'var(--ds-font-size-100)', fontWeight: 500, color: isDark ? 'var(--ds-text-subtlest)' : 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))',
          }}>
            {tag}
            <X size={11} style={{ color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', cursor: 'pointer' }} onClick={() => toggleSub.mutate({ entityType: 'tag', entityId: tag })} />
          </span>
        ))}
        {tagSubs.length === 0 && <span style={{ fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }}>No tag subscriptions yet.</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        <input
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTag()}
          placeholder="Add a tag..."
          style={{
            height: 32, padding: '8px 12px', fontSize: 'var(--ds-font-size-200)', borderRadius: 6,
            border: `0.75px solid ${isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-shadow-raised, rgba(0,0,0,0.1))'}`, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
            outline: 'none', width: 180, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : undefined,
          }}
        />
        <button onClick={addTag} style={{
          height: 32, padding: '0 14px', borderRadius: 6, background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
          color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', border: 'none', fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Plus size={12} /> Add
        </button>
      </div>

      {/* ═══ ARTICLE SUBSCRIPTIONS ═══ */}
      <SectionLabel icon={<FileText size={14} style={{ color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' }} />} label="Article Subscriptions" isDark={isDark} />
      <div style={{ borderRadius: 8, border: `0.75px solid ${border}`, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', overflow: 'hidden' }}>
        {subArticles.length > 0 ? subArticles.map((a: any) => (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
            borderBottom: `0.75px solid ${border}`, transition: 'background 80ms',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--ds-background-information, rgba(37,99,235,0.04))'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <FileText size={14} style={{ color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))', flexShrink: 0 }} />
            <span onClick={() => navigate(`/wiki/${a.slug}`)} style={{ fontSize: 12.5, fontWeight: 500, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral, var(--ds-background-neutral)))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
            <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 650, padding: '0px 5px', borderRadius: 4, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>{a.domain_code}</span>
            <button
              onClick={() => toggleSub.mutate({ entityType: 'article', entityId: a.id })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-danger, var(--cp-danger))', fontWeight: 500 }}
            >
              Unsubscribe
            </button>
          </div>
        )) : (
          <div style={{ padding: 32, textAlign: 'center', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontSize: 'var(--ds-font-size-200)' }}>
            No article subscriptions. Subscribe to articles from their detail pages.
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ icon, label, isDark }: { icon: React.ReactNode; label: string; isDark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
      {icon}
      <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))' }}>{label}</span>
    </div>
  );
}
