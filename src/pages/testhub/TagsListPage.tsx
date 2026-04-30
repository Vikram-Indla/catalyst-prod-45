/**
 * Tags Management Page — TestHub Module
 * Route: /testhub/tags
 */
import { useState, useEffect } from 'react';
import { Tags, Plus, Search, X, Edit2, Trash2, RefreshCw, Hash } from 'lucide-react';
import { supabase, typedQuery, typedRpc } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { useTheme } from '@/hooks/useTheme';
import { TestHubPageHeader } from '@/components/testhub/TestHubPageHeader';
import { CreateTagModal } from '@/components/testhub/tags/CreateTagModal';

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  category: string | null;
  usage_count: number;
  created_at: string;
}

interface TagStats {
  total_tags: number;
  used_tags: number;
  categories: number;
  most_used_tag: string | null;
}

export default function TagsListPage() {
  const { isDark } = useTheme();
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<TagStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      let query = typedQuery('tm_labels')
        .select('*')
        .order('category', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTags(data || []);

      const { data: statsData } = await typedRpc('get_tag_stats');
      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }
    } catch (err) {
      console.error('Fetch tags error:', err);
      catalystToast.error('Failed to load tags');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTags(); }, [categoryFilter]);

  const filteredTags = tags.filter(t => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return t.name.toLowerCase().includes(search) || t.slug.toLowerCase().includes(search) || (t.description && t.description.toLowerCase().includes(search));
  });

  const groupedTags = filteredTags.reduce((acc, tag) => {
    const cat = tag.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  const categories = [...new Set(tags.map(t => t.category).filter(Boolean))];

  const deleteTag = async (id: string, name: string) => {
    if (!confirm(`Delete tag "${name}"? This will remove it from all items.`)) return;
    try {
      const { error } = await typedQuery('tm_labels').delete().eq('id', id);
      if (error) throw error;
      catalystToast.success('Tag deleted');
      fetchTags();
    } catch { catalystToast.error('Failed to delete tag'); }
  };

  const clearFilters = () => { setSearchTerm(''); setCategoryFilter('all'); };
  const hasActiveFilters = categoryFilter !== 'all' || searchTerm;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: isDark ? 'var(--cp-bg-page, #1F1F21)' : '#F8FAFC' }}>
      <TestHubPageHeader title="Tags & Labels" subtitle="Organize test cases, defects, and requirements with tags">
        <button onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 20px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}>
          <Plus size={18} /> Create Tag
        </button>
      </TestHubPageHeader>
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFF', borderRadius: 12, padding: 20, border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0' }}>
            <p style={{ fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)', margin: 0, textTransform: 'uppercase' }}>Total Tags</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', margin: '8px 0 0' }}>{stats.total_tags}</p>
          </div>
          <div style={{ backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FDF4FF', borderRadius: 12, padding: 20, border: isDark ? '1px solid #2E2E2E' : '1px solid #F5D0FE' }}>
            <p style={{ fontSize: 12, color: '#A855F7', margin: 0, textTransform: 'uppercase' }}>In Use</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#A855F7', margin: '8px 0 0' }}>{stats.used_tags}</p>
          </div>
          <div style={{ backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFF', borderRadius: 12, padding: 20, border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0' }}>
            <p style={{ fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)', margin: 0, textTransform: 'uppercase' }}>Categories</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--cp-text-primary, #0F172A)', margin: '8px 0 0' }}>{stats.categories}</p>
          </div>
          <div style={{ backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFF', borderRadius: 12, padding: 20, border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0' }}>
            <p style={{ fontSize: 12, color: 'var(--cp-text-tertiary, #64748B)', margin: 0, textTransform: 'uppercase' }}>Most Used</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--cp-text-primary, #0F172A)', margin: '8px 0 0' }}>{stats.most_used_tag || '—'}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input type="text" placeholder="Search tags..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', height: 44, padding: '0 14px 0 44px', border: isDark ? '1.5px solid #2E2E2E' : '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 14, backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', color: isDark ? '#EDEDED' : undefined }} />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ height: 44, padding: '0 36px 0 14px', border: isDark ? '1.5px solid #2E2E2E' : '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 14, backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFF', color: isDark ? '#EDEDED' : undefined, cursor: 'pointer' }}>
          <option value="all">All Categories</option>
          {categories.map((cat) => <option key={cat} value={cat!}>{cat}</option>)}
        </select>
        {hasActiveFilters && (
          <button onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 16px', border: isDark ? '1.5px solid #2E2E2E' : '1.5px solid #E2E8F0', borderRadius: 12, backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFF', color: 'var(--cp-text-tertiary, #64748B)', fontSize: 14, cursor: 'pointer' }}>
            <X size={16} /> Clear
          </button>
        )}
      </div>

      {/* Tags List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#EC4899' }} />
        </div>
      ) : filteredTags.length === 0 ? (
        <div style={{ backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', borderRadius: 12, padding: 60, textAlign: 'center', border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0' }}>
          <Tags size={48} style={{ color: 'var(--cp-text-muted, #CBD5E1)', marginBottom: 16 }} />
          <p style={{ fontSize: 16, color: 'var(--cp-text-tertiary, #64748B)', margin: 0 }}>No tags found</p>
          <p style={{ fontSize: 14, color: 'var(--cp-text-muted, #94A3B8)', margin: '8px 0 0' }}>Create tags to organize your test assets</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(groupedTags).map(([category, categoryTags]) => (
            <div key={category}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--cp-text-tertiary, #64748B)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {category} ({categoryTags.length})
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {categoryTags.map((tag) => (
                  <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#FFFFFF', borderRadius: 12, border: isDark ? '1px solid #2E2E2E' : '1px solid #E2E8F0', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = tag.color; e.currentTarget.style.boxShadow = `0 2px 8px ${tag.color}20`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--cp-border, #E2E8F0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: tag.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--cp-text-primary, #0F172A)' }}>{tag.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--cp-text-muted, #94A3B8)', backgroundColor: isDark ? 'var(--cp-bg-surface, #242528)' : '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{tag.usage_count}</span>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                      <button onClick={(e) => { e.stopPropagation(); setEditingTag(tag); setShowCreateModal(true); }}
                        style={{ width: 24, height: 24, border: 'none', borderRadius: 4, backgroundColor: 'transparent', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Edit2 size={12} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteTag(tag.id, tag.name); }}
                        style={{ width: 24, height: 24, border: 'none', borderRadius: 4, backgroundColor: 'transparent', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateTagModal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setEditingTag(null); }} onSaved={fetchTags} editingTag={editingTag} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
