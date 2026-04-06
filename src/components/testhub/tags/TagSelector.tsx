/**
 * TagSelector — Reusable tag picker for test cases, defects, requirements
 */
import { useState, useEffect, useRef } from 'react';
import { Tags, X, Plus, Search, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  category: string | null;
}

interface TagSelectorProps {
  entityType: 'test_case' | 'defect' | 'requirement';
  entityId: string;
  onTagsChanged?: () => void;
}

export function TagSelector({ entityType, entityId, onTagsChanged }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getJunctionTable = () => {
    switch (entityType) {
      case 'test_case': return 'th_test_case_tags';
      case 'defect': return 'th_defect_tags';
      case 'requirement': return 'th_requirement_tags';
    }
  };

  const getEntityColumn = () => {
    switch (entityType) {
      case 'test_case': return 'test_case_id';
      case 'defect': return 'defect_id';
      case 'requirement': return 'requirement_id';
    }
  };

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const { data: allTagsData } = await (supabase as any).from('tm_labels').select('id, name, slug, color, category').order('name');
      if (allTagsData) setAllTags(allTagsData);

      const junctionTable = getJunctionTable();
      const entityColumn = getEntityColumn();
      const { data: linkedData } = await (supabase as any).from(junctionTable).select(`tag_id, tag:tm_labels(id, name, slug, color, category)`).eq(entityColumn, entityId);

      if (linkedData) {
        const tags = linkedData.map((l: any) => l.tag).filter(Boolean);
        setSelectedTags(tags);
      }
    } catch (err) {
      console.error('Fetch tags error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (entityId) fetchTags(); }, [entityId, entityType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = async (tag: Tag) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from(getJunctionTable()).insert({ [getEntityColumn()]: entityId, tag_id: tag.id, created_by: user?.id });
      if (error) { if (error.code === '23505') return; throw error; }
      setSelectedTags([...selectedTags, tag]);
      onTagsChanged?.();
    } catch (err) {
      console.error('Add tag error:', err);
      catalystToast.error('Failed to add tag');
    }
  };

  const removeTag = async (tagId: string) => {
    try {
      const { error } = await (supabase as any).from(getJunctionTable()).delete().eq(getEntityColumn(), entityId).eq('tag_id', tagId);
      if (error) throw error;
      setSelectedTags(selectedTags.filter(t => t.id !== tagId));
      onTagsChanged?.();
    } catch (err) {
      console.error('Remove tag error:', err);
      catalystToast.error('Failed to remove tag');
    }
  };

  const filteredTags = allTags.filter(tag => {
    if (searchTerm && !tag.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return !selectedTags.some(t => t.id === tag.id);
  });

  const groupedTags = filteredTags.reduce((acc, tag) => {
    const cat = tag.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Selected Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8, minHeight: 44, backgroundColor: 'var(--bg-1)', borderRadius: 8, border: '1px solid var(--divider)' }}>
        {selectedTags.map((tag) => (
          <span key={tag.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', backgroundColor: 'var(--cp-float)', borderRadius: 6, border: `1px solid ${tag.color}40`, fontSize: 12, fontWeight: 500 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: tag.color }} />
            {tag.name}
            <button onClick={() => removeTag(tag.id)} style={{ width: 16, height: 16, padding: 0, border: 'none', borderRadius: 4, backgroundColor: 'transparent', color: 'var(--fg-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={12} />
            </button>
          </span>
        ))}
        <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', backgroundColor: 'var(--cp-float)', border: '1px dashed var(--divider)', borderRadius: 6, fontSize: 12, color: 'var(--fg-3)', cursor: 'pointer' }}>
          <Plus size={12} /> Add Tag
        </button>
      </div>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, backgroundColor: 'var(--cp-float)', borderRadius: 12, border: '1px solid var(--divider)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 320, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--divider)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-4)' }} />
              <input type="text" placeholder="Search tags..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus
                style={{ width: '100%', height: 50, padding: '0 10px 0 32px', border: '1px solid var(--divider)', borderRadius: 6, fontSize: 13 }} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {Object.entries(groupedTags).length === 0 ? (
              <p style={{ padding: 16, textAlign: 'center', color: 'var(--fg-4)', fontSize: 13 }}>{searchTerm ? 'No matching tags' : 'No more tags available'}</p>
            ) : (
              Object.entries(groupedTags).map(([category, tags]) => (
                <div key={category} style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-4)', textTransform: 'uppercase', padding: '4px 8px', margin: 0 }}>{category}</p>
                  {tags.map((tag) => (
                    <button key={tag.id} onClick={() => addTag(tag)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', backgroundColor: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: tag.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--fg-1)' }}>{tag.name}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
