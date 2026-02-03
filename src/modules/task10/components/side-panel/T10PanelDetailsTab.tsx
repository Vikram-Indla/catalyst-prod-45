// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ PANEL DETAILS TAB COMPONENT
// Rebuilt with proper Tailwind styling
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { Clock, User, Calendar, Tag, FileText, Check, X, Plus, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { T10ItemWithAssignee } from '../../types';
import { useProfiles, type ProfileOption } from '../../hooks';

// Predefined labels
const AVAILABLE_LABELS = [
  'HR', 'Documentation', 'Security', 'Code Review', 'Testing',
  'Bug Fix', 'DevOps', 'Presentation', 'Performance',
  'UI/UX', 'Backend', 'Frontend', 'Infrastructure',
];

interface T10PanelDetailsTabProps {
  item: T10ItemWithAssignee;
  onUpdate?: (itemId: string, updates: Partial<T10ItemWithAssignee>) => void;
  isSaving?: boolean;
}

export function T10PanelDetailsTab({ item, onUpdate, isSaving = false }: T10PanelDetailsTabProps) {
  const [description, setDescription] = useState(item.description || '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  
  const assigneeRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  
  // Fetch profiles for assignee dropdown
  const { data: profiles = [], isLoading: profilesLoading } = useProfiles();

  // Filter profiles by search
  const filteredProfiles = profiles.filter((p: ProfileOption) => 
    (p.full_name?.toLowerCase() || '').includes(assigneeSearch.toLowerCase()) ||
    (p.email?.toLowerCase() || '').includes(assigneeSearch.toLowerCase())
  );

  // Sync description when item changes
  useEffect(() => {
    setDescription(item.description || '');
    setIsEditingDescription(false);
  }, [item.id, item.description]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) {
        setShowAssigneeDropdown(false);
        setAssigneeSearch('');
      }
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) {
        setShowLabelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDescriptionSave = () => {
    if (description !== item.description) {
      onUpdate?.(item.id, { description });
    }
    setIsEditingDescription(false);
  };

  const handleStatusToggle = () => {
    const newStatus = item.status === 'done' ? 'todo' : 'done';
    onUpdate?.(item.id, { status: newStatus as 'todo' | 'done' });
  };

  const handleAssigneeChange = (profileId: string | null) => {
    onUpdate?.(item.id, { assignee_id: profileId || undefined });
    setShowAssigneeDropdown(false);
    setAssigneeSearch('');
  };

  const handleDueDateChange = (date: string | null) => {
    onUpdate?.(item.id, { due_date: date || undefined });
  };

  const handleLabelChange = (label: string | null) => {
    onUpdate?.(item.id, { label: label || undefined });
    setShowLabelDropdown(false);
  };

  // Get initials from name
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get avatar background color based on name
  const getAvatarColor = (name: string | null) => {
    if (!name) return 'bg-gray-400';
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-red-500', 'bg-cyan-500'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getRankLabel = (rank: number) => {
    if (rank <= 5) return 'Top 5';
    if (rank <= 10) return 'Top 10';
    return 'Buffer';
  };

  const getRankColor = (rank: number) => {
    if (rank <= 5) return 'bg-blue-600 text-white';
    if (rank <= 10) return 'bg-gray-500 text-white';
    return 'bg-gray-300 text-gray-700';
  };

  return (
    <div className="p-6 space-y-6 relative">
      {/* SAVING INDICATOR */}
      {isSaving && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-md text-xs text-blue-600 font-medium z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          Saving...
        </div>
      )}

      {/* PRIORITY RANK & STATUS ROW */}
      <div className="flex items-start gap-6">
        {/* Priority Rank */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Priority Rank
          </label>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${getRankColor(item.rank)}`}>
              {item.rank}
            </span>
            <span className="text-sm text-gray-600">
              {getRankLabel(item.rank)}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Status
          </label>
          <button
            onClick={handleStatusToggle}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              item.status === 'done'
                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {item.status === 'done' ? '✓ Completed' : 'Mark as completed'}
          </button>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-gray-200" />

      {/* ASSIGNED TO */}
      <div>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          <User size={14} />
          Assigned To
        </label>
        <div className="relative" ref={assigneeRef}>
          <button
            onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
            disabled={profilesLoading}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              {item.assignee ? (
                <>
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium text-white ${getAvatarColor(item.assignee.full_name)}`}>
                    {getInitials(item.assignee.full_name)}
                  </span>
                  <span className="text-sm text-gray-900">{item.assignee.full_name}</span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-500">
                    <User size={14} />
                  </span>
                  <span className="text-sm text-gray-500">Unassigned</span>
                </>
              )}
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>
          
          {showAssigneeDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[280px] overflow-hidden">
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="max-h-[220px] overflow-y-auto">
                <button
                  onClick={() => handleAssigneeChange(null)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 ${!item.assignee_id ? 'bg-blue-50' : ''}`}
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-500">
                    <X size={12} />
                  </span>
                  <span className="text-sm text-gray-600">Unassign</span>
                </button>
                
                {filteredProfiles.map((profile: ProfileOption) => (
                  <button
                    key={profile.id}
                    onClick={() => handleAssigneeChange(profile.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 ${item.assignee_id === profile.id ? 'bg-blue-50' : ''}`}
                  >
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium text-white ${getAvatarColor(profile.full_name)}`}>
                      {getInitials(profile.full_name)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {profile.full_name || 'Unknown'}
                      </div>
                      {profile.email && (
                        <div className="text-xs text-gray-400 truncate">
                          {profile.email}
                        </div>
                      )}
                    </div>
                    {item.assignee_id === profile.id && (
                      <Check size={14} className="text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DUE DATE */}
      <div>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          <Calendar size={14} />
          Due Date
        </label>
        <input
          type="date"
          value={item.due_date || ''}
          onChange={(e) => handleDueDateChange(e.target.value || null)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {item.due_date && (
          <div className="mt-1.5 text-sm text-gray-600">
            📅 {format(parseISO(item.due_date), 'MMM d, yyyy')}
          </div>
        )}
      </div>

      {/* LABELS */}
      <div>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          <Tag size={14} />
          Labels
        </label>
        <div className="relative flex flex-wrap items-center gap-2" ref={labelRef}>
          {item.label && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
              {item.label}
              <button 
                onClick={() => handleLabelChange(null)}
                className="hover:text-blue-900"
              >
                <X size={12} />
              </button>
            </span>
          )}
          <button
            onClick={() => setShowLabelDropdown(!showLabelDropdown)}
            className="inline-flex items-center gap-1 px-2.5 py-1 border border-dashed border-gray-300 text-gray-500 text-xs font-medium rounded hover:border-gray-400 hover:text-gray-600 transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
          
          {showLabelDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[240px] overflow-y-auto">
              {AVAILABLE_LABELS.map((label) => (
                <button
                  key={label}
                  onClick={() => handleLabelChange(label)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${item.label === label ? 'bg-blue-50' : ''}`}
                >
                  <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                    {label}
                  </span>
                  {item.label === label && <Check size={14} className="text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DESCRIPTION */}
      <div>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          <FileText size={14} />
          Description
        </label>
        {isEditingDescription ? (
          <div className="space-y-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  setDescription(item.description || '');
                  setIsEditingDescription(false);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDescriptionSave}
                className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => setIsEditingDescription(true)}
            className={`px-3 py-2.5 border border-gray-200 rounded-lg text-sm min-h-[80px] cursor-pointer hover:border-gray-300 transition-colors ${
              item.description ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            {item.description || 'Click to add a description...'}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          Created {item.created_at ? format(parseISO(item.created_at), 'MMM d, yyyy') : 'Unknown'}
        </p>
        <p className="text-xs text-gray-400">
          Updated {item.updated_at ? format(parseISO(item.updated_at), 'MMM d, yyyy') : 'Unknown'}
        </p>
      </div>
    </div>
  );
}

export default T10PanelDetailsTab;
