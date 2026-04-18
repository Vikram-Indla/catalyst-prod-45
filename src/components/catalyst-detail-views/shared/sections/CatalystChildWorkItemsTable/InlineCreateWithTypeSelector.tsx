/**
 * InlineCreateWithTypeSelector — Jira-parity inline create row.
 *
 * Two modes:
 * 1. CREATE: "What needs to be done?" text input + type selector dropdown + blue Enter button + Cancel
 * 2. CHOOSE EXISTING: Search input + recent items list → links existing issue to parent
 */
import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Check, X, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  IssueIcon,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';
import {
  WORK_ITEM_ICONS,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import {
  getStatusCategory,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

/** Child types allowed for inline create */
const CREATE_TYPES = [
  { value: 'Story', label: 'Story' },
  { value: 'Business Request', label: 'Business Gap' },
  { value: 'Bug', label: 'QA Bug' },
  { value: 'Production Incident', label: 'Production Incident' },
  { value: 'Changes', label: 'Change Request' },
  { value: 'Task', label: 'Task' },
  { value: 'Task', label: 'API Requirement' },
];

interface InlineCreateWithTypeSelectorProps {
  parentIssueKey: string;
  projectKey: string;
  onCreated: () => void;
}

export function InlineCreateWithTypeSelector({
  parentIssueKey, projectKey, onCreated,
}: InlineCreateWithTypeSelectorProps) {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'create' | 'search'>('create');
  const [value, setValue] = useState('');
  const [selectedType, setSelectedType] = useState('Story');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Focus input when activated
  useEffect(() => {
    if (isActive && mode === 'create') inputRef.current?.focus();
    if (isActive && mode === 'search') searchInputRef.current?.focus();
  }, [isActive, mode]);

  // Close type dropdown on outside click
  useEffect(() => {
    if (!showTypeDropdown) return;
    const h = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node))
        setShowTypeDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showTypeDropdown]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const maxSeq = await supabase.from('ph_issues')
        .select('position')
        .eq('parent_key', parentIssueKey)
        .order('position', { ascending: false })
        .limit(1);
      const nextPos = ((maxSeq.data?.[0]?.position ?? 0) as number) + 1024;

      const newKey = `${projectKey}-NEW-${Date.now()}`;
      await supabase.from('ph_issues').insert({
        issue_key: newKey,
        summary: value.trim(),
        issue_type: selectedType,
        parent_key: parentIssueKey,
        project_key: projectKey,
        status: 'Backlog',
        status_category: 'todo',
        priority: 'Medium',
        position: nextPos,
      });
    },
    onSuccess: () => {
      toast.success('Child issue created');
      setValue('');
      onCreated();
    },
    onError: () => toast.error('Failed to create issue'),
  });

  // Link existing mutation
  const linkMutation = useMutation({
    mutationFn: async (targetId: string) => {
      await supabase.from('ph_issues')
        .update({ parent_key: parentIssueKey })
        .eq('id', targetId);
    },
    onSuccess: () => {
      toast.success('Issue linked');
      setMode('create');
      setSearchQuery('');
      setIsActive(false);
      onCreated();
    },
  });

  // Search for existing issues
  const { data: searchResults = [] } = useQuery({
    queryKey: ['cv-search-existing', projectKey, searchQuery],
    enabled: mode === 'search' && isActive,
    queryFn: async () => {
      const query = supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('project_key', projectKey)
        .is('deleted_at', null)
        .is('parent_key', null) // Only unparented issues
        .order('jira_updated_at', { ascending: false })
        .limit(15);

      if (searchQuery.trim()) {
        query.or(`issue_key.ilike.%${searchQuery}%,summary.ilike.%${searchQuery}%`);
      }

      const { data } = await query;
      return data || [];
    },
    staleTime: 10000,
  });

  const handleCancel = () => {
    setIsActive(false);
    setValue('');
    setSearchQuery('');
    setMode('create');
    setShowTypeDropdown(false);
  };

  const handleSubmit = () => {
    if (!value.trim() || createMutation.isPending) return;
    createMutation.mutate();
  };

  // Not active — show the "+" trigger
  if (!isActive) {
    return (
      <button
        onClick={() => setIsActive(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: '#5E6C84', transition: 'background 80ms', textAlign: 'left',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
      >
        <span style={{ color: '#0052CC', fontWeight: 500 }}>+ Create child issue</span>
      </button>
    );
  }

  // SEARCH MODE — "Choose existing"
  if (mode === 'search') {
    return (
      <div style={{ borderTop: '1px solid #DFE1E6' }}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #F4F5F7' }}>
          <button onClick={() => setMode('create')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#5E6C84', display: 'flex' }}>
            ←
          </button>
          <Search size={14} color="#5E6C84" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for a work item"
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 13,
              color: '#292A2E', fontFamily: 'inherit', background: 'transparent',
            }}
          />
        </div>

        {/* Results */}
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {!searchQuery && (
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px 4px' }}>
              Recent work items
            </div>
          )}
          {searchResults.map((item: any) => (
            <div
              key={item.id}
              onClick={() => linkMutation.mutate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                cursor: 'pointer', transition: 'background 80ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <IssueIcon type={item.issue_type} size={14} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#0052CC', flexShrink: 0 }}>
                {item.issue_key}
              </span>
              <span style={{ fontSize: 13, color: '#292A2E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.summary}
              </span>
            </div>
          ))}
          {searchResults.length === 0 && (
            <div style={{ padding: '16px 12px', fontSize: 13, color: '#6B778C', textAlign: 'center' }}>
              No items found
            </div>
          )}
        </div>
      </div>
    );
  }

  // CREATE MODE — text input + type selector + enter + cancel
  return (
    <div style={{ borderTop: '1px solid #DFE1E6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '4px 8px' }}>
        {/* Text input */}
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
            if (e.key === 'Escape') handleCancel();
          }}
          placeholder="What needs to be done?"
          style={{
            flex: 1, border: 'none', outline: 'none', fontSize: 13,
            color: '#292A2E', fontFamily: 'inherit', padding: '8px 4px',
            background: 'transparent',
          }}
          maxLength={255}
        />

        {/* Type selector */}
        <div ref={typeDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', background: '#FAFBFC', border: '1px solid #DFE1E6',
              borderRadius: 4, cursor: 'pointer', fontSize: 12, color: '#292A2E',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            <IssueIcon type={selectedType} size={14} />
            {CREATE_TYPES.find(t => t.value === selectedType)?.label ?? selectedType}
            <ChevronDown size={12} color="#5E6C84" />
          </button>

          {showTypeDropdown && (
            <div style={{
              position: 'absolute', right: 0, bottom: '100%', marginBottom: 4,
              background: '#FFFFFF', borderRadius: 4,
              boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
              padding: '4px 0', zIndex: 100, minWidth: 180,
            }}>
              {CREATE_TYPES.map(type => (
                <div
                  key={type.label}
                  onClick={() => { setSelectedType(type.value); setShowTypeDropdown(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                    cursor: 'pointer', fontSize: 13, color: '#292A2E',
                    background: selectedType === type.value ? '#DEEBFF' : 'transparent',
                    transition: 'background 80ms',
                  }}
                  onMouseEnter={e => { if (selectedType !== type.value) e.currentTarget.style.background = '#F4F5F7'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = selectedType === type.value ? '#DEEBFF' : ''; }}
                >
                  <IssueIcon type={type.value} size={14} />
                  {type.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm button (blue) */}
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || createMutation.isPending}
          style={{
            width: 28, height: 28, borderRadius: 4, border: 'none',
            background: value.trim() ? '#0052CC' : '#DFE1E6',
            color: '#FFFFFF', cursor: value.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginLeft: 6, flexShrink: 0, transition: 'background 120ms',
          }}
        >
          {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
      </div>

      {/* "Choose existing" link + Cancel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px 8px' }}>
        <button
          onClick={() => setMode('search')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 13, color: '#0052CC', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Search size={12} /> Choose existing
        </button>
        <button
          onClick={handleCancel}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 13, color: '#5E6C84',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
