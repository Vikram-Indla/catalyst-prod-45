import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, FileText, Check, X, Trash2, Tag, FolderOpen } from '@/lib/atlaskit-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';

export default function WikiAllArticlesPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkValue, setBulkValue] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: articles, isLoading } = useQuery({
    queryKey: ['wiki-all-articles'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_pages')
        .select('id, slug, title, domain_code, status, verification_status, format, ai_confidence, helpfulness_score, tags, version, updated_at, view_count')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleAll = useCallback(() => {
    if (!articles) return;
    setSelected(prev => prev.size === articles.length ? new Set() : new Set(articles.map(a => a.id)));
  }, [articles]);

  const executeBulk = useCallback(async () => {
    if (!bulkAction || selected.size === 0) return;
    const ids = Array.from(selected);

    try {
      if (bulkAction === 'domain') {
        await supabase.from('wiki_pages').update({ domain_code: bulkValue } as any).in('id', ids);
        toast.success(`Updated domain for ${ids.length} articles`);
      } else if (bulkAction === 'verification') {
        await supabase.from('wiki_pages').update({ verification_status: bulkValue } as any).in('id', ids);
        toast.success(`Updated verification for ${ids.length} articles`);
      } else if (bulkAction === 'archive') {
        await supabase.from('wiki_pages').update({ deleted_at: new Date().toISOString() } as any).in('id', ids);
        toast.success(`Archived ${ids.length} articles`);
      } else if (bulkAction === 'tags') {
        for (const id of ids) {
          const existing = articles?.find(a => a.id === id);
          const currentTags = (existing?.tags ?? []) as string[];
          const newTags = [...new Set([...currentTags, ...bulkValue.split(',').map(t => t.trim()).filter(Boolean)])];
          await supabase.from('wiki_pages').update({ tags: newTags } as any).eq('id', id);
        }
        toast.success(`Added tags to ${ids.length} articles`);
      }
    } catch { toast.error('Bulk operation failed'); }

    setSelected(new Set());
    setBulkAction(null);
    setBulkValue('');
    setShowConfirm(false);
    qc.invalidateQueries({ queryKey: ['wiki-all-articles'] });
  }, [bulkAction, bulkValue, selected, articles, qc]);

  // Font tokens removed — using ADS tokens instead
  // sora → var(--ds-font-family-body)
  // mono → var(--ds-font-family-code)

  const borderColor = isDark ? 'var(--ds-border, var(--cp-ink-1))' : 'var(--ds-shadow-raised, rgba(0,0,0,0.06))';

  return (
    <div style={{ fontFamily: 'var(--cp-font-body)', color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))', background: isDark ? 'var(--cp-bg-page, var(--ds-surface))' : 'var(--ds-surface-sunken)', minHeight: '100%', padding: '24px 40px 48px' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>
        <span onClick={() => navigate('/wiki')} style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', cursor: 'pointer' }}>Wiki</span>
        <ChevronRight size={12} style={{ color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }} />
        <span style={{ fontSize: 'var(--ds-font-size-300)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontWeight: 600 }}>All Articles</span>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 'var(--ds-font-size-600)', fontWeight: 700, margin: 0 }}>All Articles</h1>
        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' }}>{selected.size} selected</span>
            {[
              { key: 'domain', label: 'Change Domain', icon: <FolderOpen size={12} /> },
              { key: 'verification', label: 'Set Verification', icon: <Check size={12} /> },
              { key: 'tags', label: 'Add Tags', icon: <Tag size={12} /> },
              { key: 'archive', label: 'Archive', icon: <Trash2 size={12} /> },
            ].map(a => (
              <button key={a.key} onClick={() => { setBulkAction(a.key); if (a.key === 'archive') setShowConfirm(true); }} style={{
                fontSize: 'var(--ds-font-size-50)', fontWeight: 650, padding: '4px 10px', borderRadius: 4,
                border: isDark ? '0.75px solid var(--ds-background-neutral)' : '0.75px solid var(--ds-shadow-raised, rgba(0,0,0,0.12))', background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
                color: a.key === 'archive' ? 'var(--ds-text-danger, var(--cp-danger))' : (isDark ? 'var(--ds-text-subtlest)' : 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))'), cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>{a.icon} {a.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Action Inline Panel */}
      {bulkAction && bulkAction !== 'archive' && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: isDark ? 'var(--ds-background-information-bold, rgba(59,130,246,0.12))' : 'var(--ds-background-selected)',
          border: '1px solid var(--ds-background-information, rgba(37,99,235,0.2))', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' }}>
            {bulkAction === 'domain' ? 'New Domain Code:' : bulkAction === 'verification' ? 'New Status:' : 'Tags (comma-separated):'}
          </span>
          {bulkAction === 'verification' ? (
            <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} style={{
              fontSize: 'var(--ds-font-size-200)', padding: '4px 8px', borderRadius: 4, border: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--ds-border)',
              background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))',
            }}>
              <option value="">Select...</option>
              <option value="verified">Verified</option>
              <option value="needs_review">Needs Review</option>
              <option value="unverified">Unverified</option>
            </select>
          ) : (
            <input value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder={bulkAction === 'domain' ? 'e.g. D1' : 'tag1, tag2'}
              style={{ fontSize: 'var(--ds-font-size-200)', padding: '4px 8px', borderRadius: 4, border: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--ds-border)', width: 200, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', color: isDark ? 'var(--ds-text, var(--cp-bg-neutral))' : 'var(--ds-text, var(--cp-ink-1, var(--cp-ink-1)))' }} />
          )}
          <button onClick={() => setShowConfirm(true)} disabled={!bulkValue} style={{
            fontSize: 'var(--ds-font-size-100)', fontWeight: 650, padding: '4px 12px', borderRadius: 4, border: 'none',
            background: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', cursor: 'pointer', opacity: bulkValue ? 1 : 0.5,
          }}>Apply to {selected.size}</button>
          <button onClick={() => { setBulkAction(null); setBulkValue(''); }} style={{
            fontSize: 'var(--ds-font-size-100)', padding: '4px 8px', borderRadius: 4, border: 'none',
            background: 'transparent', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', cursor: 'pointer',
          }}><X size={14} /></button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setShowConfirm(false)} style={{ position: 'absolute', inset: 0, background: isDark ? 'var(--ds-shadow-raised, rgba(0,0,0,0.5))' : 'var(--ds-shadow-overlay, rgba(15,23,42,0.3))' }} />
          <div style={{ position: 'relative', background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', borderRadius: 12, padding: 24, width: 400, boxShadow: '0 12px 40px var(--ds-shadow-raised, rgba(0,0,0,0.15))' }}>
            <h3 style={{ fontFamily: 'var(--ds-font-family-body)', fontSize: 'var(--ds-font-size-500)', fontWeight: 700, marginBottom: 8 }}>Confirm Bulk Action</h3>
            <p style={{ fontSize: 'var(--ds-font-size-300)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', marginBottom: 16 }}>
              This will {bulkAction === 'archive' ? 'archive' : `update ${bulkAction} for`} <strong>{selected.size} articles</strong>. This cannot be undone easily.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowConfirm(false)} style={{
                fontSize: 'var(--ds-font-size-200)', fontWeight: 600, padding: '8px 16px', borderRadius: 6,
                border: isDark ? '1px solid var(--ds-background-neutral)' : '1px solid var(--cp-border, var(--cp-bg-sunken, var(--ds-border)))', background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={executeBulk} style={{
                fontSize: 'var(--ds-font-size-200)', fontWeight: 600, padding: '8px 16px', borderRadius: 6, border: 'none',
                background: bulkAction === 'archive' ? 'var(--ds-text-danger, var(--cp-danger))' : 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', cursor: 'pointer',
              }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ borderRadius: 8, border: `0.75px solid ${borderColor}`, background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '32px 3% 1fr 80px 100px 80px 80px 100px 50px',
          background: isDark ? 'var(--cp-bg-surface, var(--cp-ink-1, var(--ds-surface)))' : 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', padding: '8px 12px', height: 50, alignItems: 'center',
          fontFamily: 'var(--ds-font-family-body)', fontSize: 'var(--ds-font-size-50)', fontWeight: 600, textTransform: 'uppercase' as const,
          color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', letterSpacing: '0.05em', borderBottom: `0.75px solid ${borderColor}`,
        }}>
          <span>
            <input type="checkbox" checked={articles?.length ? selected.size === articles.length : false} onChange={toggleAll}
              style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' }} />
          </span>
          <span></span><span>Article</span><span>Domain</span><span>Verification</span><span>Conf.</span><span>Views</span><span>Updated</span><span>Ver.</span>
        </div>
        {isLoading ? <div style={{ padding: 32, textAlign: 'center', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontSize: 'var(--ds-font-size-200)' }}>Loading...</div> :
          (articles ?? []).length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', fontSize: 'var(--ds-font-size-200)' }}>No articles found.</div> :
          (articles ?? []).map((a: any) => {
            const conf = Math.round((a.ai_confidence ?? 0) * 100);
            const confColor = conf >= 90 ? 'var(--ds-text-success, var(--cp-success))' : conf >= 70 ? 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' : 'var(--ds-text-warning, var(--cp-warning))';
            const verStatus = a.verification_status || 'unverified';
            const verBadge = verStatus === 'verified' ? { bg: 'var(--ds-background-success-bold, rgba(22,163,74,0.08))', color: 'var(--ds-text-success, var(--cp-success))', label: 'Verified' }
              : verStatus === 'needs_review' ? { bg: 'var(--ds-background-warning, rgba(217,119,6,0.08))', color: 'var(--ds-text-warning, var(--cp-warning))', label: 'Review' }
              : { bg: 'var(--ds-text-subtlest, rgba(100,116,139,0.08))', color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))', label: 'Unverified' };
            const isSelected = selected.has(a.id);
            return (
              <div key={a.id} style={{
                display: 'grid', gridTemplateColumns: '32px 3% 1fr 80px 100px 80px 80px 100px 50px',
                padding: '8px 12px', height: 42, alignItems: 'center', cursor: 'pointer',
                borderBottom: `0.75px solid ${borderColor}`, fontSize: 'var(--ds-font-size-200)',
                background: isSelected ? 'var(--ds-background-information, rgba(37,99,235,0.06))' : 'transparent',
                transition: 'background 80ms',
              }} onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = isDark ? 'var(--ds-surface-overlay)' : 'var(--ds-shadow-overlay, rgba(15,23,42,0.04))'; }}
                 onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                <span onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(a.id)}
                    style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' }} />
                </span>
                <span onClick={() => navigate(`/wiki/${a.slug}`)}>
                  {a.format === 'pdf' ? <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 700, padding: '0px 4px', borderRadius: 4, background: isDark ? 'var(--ds-background-danger-bold, rgba(220,38,38,0.12))' : 'var(--ds-background-danger, var(--ds-background-danger))', color: 'var(--ds-text-danger, var(--cp-danger))' }}>PDF</span> : <FileText size={14} style={{ color: isDark ? 'var(--ds-text-subtlest, var(--cp-text-secondary))' : 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))' }} />}
                </span>
                <span onClick={() => navigate(`/wiki/${a.slug}`)} style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                <span style={{ fontSize: 'var(--ds-font-size-50)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>{a.domain_code}</span>
                <span style={{ fontSize: 'var(--ds-font-size-50)', fontWeight: 700, padding: '0px 6px', borderRadius: 4, background: verBadge.bg, color: verBadge.color, width: 'fit-content' }}>{verBadge.label}</span>
                <span style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-100)', fontWeight: 500, color: confColor }}>{conf}%</span>
                <span style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-100)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>{a.view_count ?? 0}</span>
                <span style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-50)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>{new Date(a.updated_at).toLocaleDateString()}</span>
                <span style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-50)', color: isDark ? 'var(--ds-text-subtlest)' : 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' }}>v{a.version ?? 1}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
