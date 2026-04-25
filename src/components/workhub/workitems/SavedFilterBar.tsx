/**
 * SavedFilterBar — Horizontal saved filter pills
 * Phase 9
 */
import { useState, useRef, useEffect } from 'react';
import { Bookmark, Users2, X, MoreVertical } from 'lucide-react';
import { useSavedFilters, useCreateSavedFilter, useUpdateSavedFilter, useDeleteSavedFilter } from '@/hooks/workhub/useSavedFilters';
import type { WorkItemFilterConfig } from '@/hooks/workhub/useWorkItems';

interface SavedFilterBarProps {
  currentFilters: Partial<WorkItemFilterConfig>;
  activeFilterId: string | null;
  onApplyFilter: (config: Record<string, any>, filterId: string) => void;
  onDeactivate: () => void;
  onClearAll: () => void;
}

export function SavedFilterBar({ currentFilters, activeFilterId, onApplyFilter, onDeactivate, onClearAll }: SavedFilterBarProps) {
  const { data: savedFilters = [] } = useSavedFilters('workitems');
  const createFilter = useCreateSavedFilter();
  const updateFilter = useUpdateSavedFilter();
  const deleteFilter = useDeleteSavedFilter();

  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveShared, setSaveShared] = useState(false);
  const [dropdownId, setDropdownId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownId(null);
    };
    if (dropdownId) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownId]);

  const handleSave = () => {
    if (!saveName.trim()) return;
    createFilter.mutate({
      name: saveName.trim(),
      filter_config: currentFilters as Record<string, any>,
      page: 'workitems',
      is_shared: saveShared,
    }, {
      onSuccess: () => { setShowSaveForm(false); setSaveName(''); setSaveShared(false); },
    });
  };

  return (
    <div
      className="flex items-center gap-2 py-2 overflow-x-auto"
      style={{
        borderBottom: '1px solid var(--bg-1)',
        fontFamily: 'var(--ds-font-family-body)',
        scrollbarWidth: 'none',
      }}
    >
      <Bookmark className="w-4 h-4 shrink-0" style={{ color: 'var(--fg-4)' }} />
      <span className="text-xs font-medium shrink-0" style={{ color: 'var(--fg-4)' }}>
        Saved:
      </span>

      {/* Filter pills */}
      {savedFilters.map(sf => {
        const isActive = activeFilterId === sf.id;
        return (
          <div key={sf.id} className="relative shrink-0" ref={dropdownId === sf.id ? dropdownRef : undefined}>
            {renamingId === sf.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={() => {
                  if (renameValue.trim()) updateFilter.mutate({ id: sf.id, updates: { name: renameValue.trim() } });
                  setRenamingId(null);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.currentTarget.blur(); }
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                className="px-3 py-1 text-xs rounded-full border outline-none"
                style={{ borderColor: 'var(--cp-blue)', width: 120, height: 28 }}
              />
            ) : (
              <button
                onClick={() => isActive ? onDeactivate() : onApplyFilter(sf.filter_config, sf.id)}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border transition-all whitespace-nowrap"
                style={{
                  backgroundColor: isActive ? 'var(--cp-blue)' : sf.is_shared ? 'var(--cp-primary-5)' : 'var(--bg-1)',
                  color: isActive ? 'var(--bg-app)' : sf.is_shared ? '#1d4ed8' : 'var(--fg-1)',
                  borderColor: isActive ? 'var(--cp-blue)' : 'var(--divider)',
                }}
              >
                {sf.is_shared && !isActive && <Users2 className="w-3 h-3" />}
                {sf.name}
                <span
                  onClick={e => { e.stopPropagation(); setDropdownId(dropdownId === sf.id ? null : sf.id); }}
                  className="ml-0.5 hover:opacity-70"
                >
                  <MoreVertical className="w-3 h-3" />
                </span>
              </button>
            )}

            {/* Pill dropdown */}
            {dropdownId === sf.id && (
              <div
                className="absolute top-full left-0 mt-1 min-w-[160px] bg-white rounded-lg border shadow-xl"
                style={{ zIndex: 9999, borderColor: 'var(--divider)' }}
              >
                {[
                  { label: 'Apply', action: () => { onApplyFilter(sf.filter_config, sf.id); setDropdownId(null); } },
                  { label: 'Rename', action: () => { setRenamingId(sf.id); setRenameValue(sf.name); setDropdownId(null); } },
                  { label: 'Update with current', action: () => { updateFilter.mutate({ id: sf.id, updates: { filter_config: currentFilters as any } }); setDropdownId(null); } },
                  { label: sf.is_shared ? 'Unshare' : 'Share', action: () => { updateFilter.mutate({ id: sf.id, updates: { is_shared: !sf.is_shared } }); setDropdownId(null); } },
                  { label: 'Delete', action: () => { if (confirm('Delete this saved filter?')) { deleteFilter.mutate(sf.id); setDropdownId(null); if (activeFilterId === sf.id) onDeactivate(); } }, danger: true },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
                    style={{ color: (item as any).danger ? 'var(--sem-danger)' : 'var(--fg-1)' }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex-1" />

      {/* Save Current */}
      {showSaveForm ? (
        <div className="flex items-center gap-2 shrink-0">
          <input
            autoFocus
            placeholder="Filter name..."
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="px-2 py-1 text-xs rounded-md border outline-none"
            style={{ borderColor: 'var(--divider)', width: 140, height: 28 }}
          />
          <label className="flex items-center gap-1 text-[11px] shrink-0 cursor-pointer" style={{ color: 'var(--fg-3)' }}>
            <input type="checkbox" checked={saveShared} onChange={e => setSaveShared(e.target.checked)} className="w-3 h-3" />
            Share
          </label>
          <button onClick={() => setShowSaveForm(false)} className="text-xs px-2 py-1 rounded-md hover:bg-slate-50" style={{ color: 'var(--fg-3)' }}>Cancel</button>
          <button onClick={handleSave} disabled={!saveName.trim()} className="text-xs px-2 py-1 rounded-md font-medium disabled:opacity-40" style={{ backgroundColor: 'var(--cp-blue)', color: 'var(--bg-app)' }}>Save</button>
        </div>
      ) : (
        <button
          onClick={() => setShowSaveForm(true)}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border transition-colors shrink-0 hover:bg-slate-50"
          style={{ borderColor: 'var(--divider)', color: 'var(--cp-blue)' }}
        >
          <Bookmark className="w-3 h-3" /> Save Current
        </button>
      )}

      <button
        onClick={onClearAll}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-colors shrink-0 hover:bg-red-50"
        style={{ color: 'var(--sem-danger)' }}
      >
        <X className="w-3 h-3" /> Clear
      </button>
    </div>
  );
}
