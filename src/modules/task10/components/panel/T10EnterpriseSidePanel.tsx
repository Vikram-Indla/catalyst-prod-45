import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, User, Calendar, Tag, FileText, Plus, Clock, 
  Trash2, ChevronDown, Search, Loader2, ExternalLink,
  Copy, MoreHorizontal, ArrowRight, UserPlus, Edit3,
  CheckCircle2
} from 'lucide-react';
import { useT10Users } from '../../hooks/useT10Users';
import { useT10Labels, useCreateT10Label } from '../../hooks/useT10Labels';
import { T10ActivityTimeline } from './T10ActivityTimeline';
import type { T10Item, T10User, T10Label } from '../../types';
import { getRelativeTime, getRankTier } from '../../utils';

interface T10EnterpriseSidePanelProps {
  item: T10Item | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<T10Item>) => void;
  onDelete: () => void;
  isReadOnly?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// LABEL COLOR PRESETS
// ═══════════════════════════════════════════════════════════════════════════
const LABEL_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#6b7280' },
];

export function T10EnterpriseSidePanel({
  item,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  isReadOnly = false
}: T10EnterpriseSidePanelProps) {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const [description, setDescription] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  
  // Dropdown states
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
  const [labelSearch, setLabelSearch] = useState('');
  const [showCreateLabel, setShowCreateLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6b7280');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [editDate, setEditDate] = useState('');
  
  // Refs
  const panelRef = useRef<HTMLDivElement>(null);
  const assigneeInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const descriptionTimeoutRef = useRef<NodeJS.Timeout>();

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════
  const { data: users = [], isLoading: usersLoading } = useT10Users(assigneeSearch);
  const { data: labels = [], isLoading: labelsLoading } = useT10Labels();
  const createLabelMutation = useCreateT10Label();

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (item) {
      setDescription(item.description || '');
      setEditedTitle(item.title);
      setEditDate(item.due_date || '');
    }
  }, [item?.id]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (assigneeDropdownOpen) setAssigneeDropdownOpen(false);
        else if (labelDropdownOpen) setLabelDropdownOpen(false);
        else if (isEditingTitle) setIsEditingTitle(false);
        else if (datePickerOpen) setDatePickerOpen(false);
        else onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, assigneeDropdownOpen, labelDropdownOpen, isEditingTitle, datePickerOpen, onClose]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (assigneeDropdownOpen && assigneeInputRef.current) {
      assigneeInputRef.current.focus();
    }
  }, [assigneeDropdownOpen]);

  useEffect(() => {
    if (labelDropdownOpen && labelInputRef.current) {
      labelInputRef.current.focus();
    }
  }, [labelDropdownOpen]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleAssigneeSelect = (user: T10User) => {
    onUpdate({ 
      assignee_id: user.id,
      assignee_name: user.full_name,
      assignee_initials: user.initials
    });
    setAssigneeDropdownOpen(false);
    setAssigneeSearch('');
  };

  const handleRemoveAssignee = () => {
    onUpdate({ assignee_id: undefined, assignee_name: undefined, assignee_initials: undefined });
  };

  // Get current label object from labels array
  const getCurrentLabel = (): T10Label | undefined => {
    if (!item?.label) return undefined;
    return labels.find(l => l.name === item.label);
  };

  const handleLabelSelect = (label: T10Label) => {
    const currentLabel = getCurrentLabel();
    if (currentLabel?.id === label.id) {
      // Toggle off
      onUpdate({ label: undefined });
    } else {
      onUpdate({ label: label.name });
    }
    setLabelDropdownOpen(false);
    setLabelSearch('');
  };

  const handleRemoveLabel = () => {
    onUpdate({ label: undefined });
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    
    try {
      const newLabel = await createLabelMutation.mutateAsync({
        name: newLabelName.trim(),
        color: newLabelColor
      });
      
      // Auto-add to item
      onUpdate({ label: newLabel.name });
      
      setNewLabelName('');
      setShowCreateLabel(false);
      setLabelDropdownOpen(false);
    } catch (error) {
      console.error('Failed to create label:', error);
    }
  };

  const handleTitleSave = () => {
    if (editedTitle.trim() && editedTitle !== item?.title) {
      onUpdate({ title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
    
    if (descriptionTimeoutRef.current) {
      clearTimeout(descriptionTimeoutRef.current);
    }
    
    descriptionTimeoutRef.current = setTimeout(() => {
      onUpdate({ description: value });
    }, 800);
  }, [onUpdate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setEditDate(newDate);
    onUpdate({ due_date: newDate || undefined });
    setDatePickerOpen(false);
  };

  const handleClearDate = () => {
    setEditDate('');
    onUpdate({ due_date: undefined });
    setDatePickerOpen(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isOpen || !item) return null;

  const isCompleted = item.status === 'done';
  const rankTier = getRankTier(item.rank);
  const currentLabel = getCurrentLabel();

  // Filter labels based on search
  const filteredLabels = labels.filter(label =>
    label.name.toLowerCase().includes(labelSearch.toLowerCase())
  );

  const panelContent = (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          BACKDROP
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 9998,
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          PANEL
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100vh',
          width: '480px',
          maxWidth: '100vw',
          background: '#ffffff',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.12), -2px 0 8px rgba(0, 0, 0, 0.08)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Rank Badge */}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 800,
                background: rankTier === 'top' 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                  : rankTier === 'mid'
                    ? 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
                    : 'transparent',
                border: rankTier === 'buffer' ? '2px dashed #cbd5e1' : 'none',
                color: rankTier === 'buffer' ? '#94a3b8' : 'white',
                boxShadow: rankTier !== 'buffer' ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
              }}
            >
              {item.rank}
            </div>
            
            <div>
              <div style={{ 
                fontSize: '11px', 
                fontWeight: 600, 
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '2px'
              }}>
                Task<sup style={{ fontSize: '8px' }}>10</sup> Priority
              </div>
              {item.taskhub_key && (
                <button
                  onClick={() => copyToClipboard(item.taskhub_key!)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontFamily: "'SF Mono', Monaco, monospace",
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0d9488',
                  }}
                  title="Click to copy"
                >
                  {item.taskhub_key}
                  <Copy size={12} style={{ opacity: 0.5 }} />
                </button>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="Open in TaskHub"
            >
              <ExternalLink size={18} />
            </button>
            <button
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="More actions"
            >
              <MoreHorizontal size={18} />
            </button>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.color = '#dc2626';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TITLE (Inline Editable)
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
          {isEditingTitle && !isReadOnly ? (
            <input
              type="text"
              value={editedTitle}
              onChange={e => setEditedTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setEditedTitle(item.title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              style={{
                width: '100%',
                fontSize: '18px',
                fontWeight: 600,
                color: '#0f172a',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                padding: '8px 12px',
                outline: 'none',
                background: '#eff6ff',
              }}
            />
          ) : (
            <h2
              onClick={() => !isReadOnly && setIsEditingTitle(true)}
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: '#0f172a',
                lineHeight: 1.4,
                cursor: isReadOnly ? 'default' : 'pointer',
                padding: '8px 12px',
                marginLeft: '-12px',
                borderRadius: '8px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => !isReadOnly && (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title={isReadOnly ? undefined : "Click to edit"}
            >
              {item.title}
              {!isReadOnly && <Edit3 size={14} style={{ marginLeft: '8px', opacity: 0.3, verticalAlign: 'middle' }} />}
            </h2>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TABS
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #e2e8f0',
          padding: '0 24px',
        }}>
          {['details', 'activity'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'details' | 'activity')}
              style={{
                padding: '12px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: activeTab === tab ? '#3b82f6' : '#64748b',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            CONTENT
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {activeTab === 'details' ? (
            <>
              {/* ═══════════════════════════════════════════════════════════
                  STATUS
              ═══════════════════════════════════════════════════════════ */}
              <div style={{ marginBottom: '24px' }}>
                <FieldLabel icon={<Clock size={14} />} label="Status" />
                <button
                  onClick={() => !isReadOnly && onUpdate({ status: isCompleted ? 'todo' : 'done' })}
                  disabled={isReadOnly}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    background: isCompleted ? '#f0fdf4' : '#f8fafc',
                    border: isCompleted ? '1px solid #86efac' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    cursor: isReadOnly ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    opacity: isReadOnly ? 0.7 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!isCompleted && !isReadOnly) e.currentTarget.style.borderColor = '#22c55e';
                  }}
                  onMouseLeave={e => {
                    if (!isCompleted && !isReadOnly) e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  {/* Checkbox Circle - CRITICAL FIX */}
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      border: isCompleted ? 'none' : '2px solid #cbd5e1',
                      background: isCompleted ? '#22c55e' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    {isCompleted && <Check size={14} color="white" strokeWidth={3} />}
                  </div>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: isCompleted ? 600 : 400,
                    color: isCompleted ? '#16a34a' : '#475569',
                  }}>
                    {isCompleted ? 'Completed' : 'Mark as completed'}
                  </span>
                  {isCompleted && (
                    <CheckCircle2 size={16} color="#22c55e" style={{ marginLeft: 'auto' }} />
                  )}
                </button>
              </div>

              {/* ═══════════════════════════════════════════════════════════
                  ASSIGNEE (With User Search from Database)
              ═══════════════════════════════════════════════════════════ */}
              <div style={{ marginBottom: '24px', position: 'relative' }}>
                <FieldLabel icon={<User size={14} />} label="Assigned To" />
                <button
                  onClick={() => !isReadOnly && setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                  disabled={isReadOnly}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    background: '#f8fafc',
                    border: assigneeDropdownOpen ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    cursor: isReadOnly ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    opacity: isReadOnly ? 0.7 : 1,
                  }}
                  onMouseEnter={e => !assigneeDropdownOpen && !isReadOnly && (e.currentTarget.style.borderColor = '#94a3b8')}
                  onMouseLeave={e => !assigneeDropdownOpen && !isReadOnly && (e.currentTarget.style.borderColor = '#e2e8f0')}
                >
                  {item.assignee_name ? (
                    <>
                      <Avatar initials={item.assignee_initials || 'U'} size={28} />
                      <span style={{ flex: 1, fontSize: '14px', color: '#1e293b' }}>
                        {item.assignee_name}
                      </span>
                      {!isReadOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAssignee();
                          }}
                          style={{
                            width: '20px',
                            height: '20px',
                            border: 'none',
                            background: 'transparent',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: '2px dashed #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                      }}>
                        <Plus size={14} />
                      </div>
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                        Add assignee
                      </span>
                    </>
                  )}
                  <ChevronDown 
                    size={16} 
                    color="#94a3b8"
                    style={{ 
                      marginLeft: 'auto',
                      transform: assigneeDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s'
                    }} 
                  />
                </button>

                {/* Assignee Dropdown */}
                {assigneeDropdownOpen && !isReadOnly && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                      zIndex: 100,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Search Input */}
                    <div style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}>
                        <Search size={16} color="#94a3b8" />
                        <input
                          ref={assigneeInputRef}
                          type="text"
                          value={assigneeSearch}
                          onChange={e => setAssigneeSearch(e.target.value)}
                          placeholder="Search by name or email..."
                          style={{
                            flex: 1,
                            border: 'none',
                            background: 'transparent',
                            fontSize: '14px',
                            color: '#1e293b',
                            outline: 'none',
                          }}
                        />
                        {assigneeSearch && (
                          <button
                            onClick={() => setAssigneeSearch('')}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: '#94a3b8',
                              display: 'flex',
                            }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* User List */}
                    <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                      {usersLoading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                          <Loader2 size={20} className="animate-spin" />
                        </div>
                      ) : users.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                          No users found
                        </div>
                      ) : (
                        users.map(user => (
                          <button
                            key={user.id}
                            onClick={() => handleAssigneeSelect(user)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 16px',
                              border: 'none',
                              background: item.assignee_id === user.id ? '#eff6ff' : 'transparent',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = item.assignee_id === user.id ? '#eff6ff' : 'transparent'}
                          >
                            <Avatar initials={user.initials} avatarUrl={user.avatar_url} size={32} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                                {user.full_name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>
                                {user.email}
                              </div>
                            </div>
                            {item.assignee_id === user.id && (
                              <Check size={16} color="#3b82f6" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ═══════════════════════════════════════════════════════════
                  DUE DATE
              ═══════════════════════════════════════════════════════════ */}
              <div style={{ marginBottom: '24px', position: 'relative' }}>
                <FieldLabel icon={<Calendar size={14} />} label="Due Date" />
                <button
                  onClick={() => !isReadOnly && setDatePickerOpen(!datePickerOpen)}
                  disabled={isReadOnly}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    cursor: isReadOnly ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    opacity: isReadOnly ? 0.7 : 1,
                  }}
                  onMouseEnter={e => !isReadOnly && (e.currentTarget.style.borderColor = '#94a3b8')}
                  onMouseLeave={e => !isReadOnly && (e.currentTarget.style.borderColor = '#e2e8f0')}
                >
                  <Calendar size={18} color={item.due_date ? '#3b82f6' : '#94a3b8'} />
                  <span style={{ 
                    flex: 1, 
                    fontSize: '14px', 
                    color: item.due_date ? '#1e293b' : '#94a3b8' 
                  }}>
                    {item.due_date 
                      ? new Date(item.due_date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })
                      : 'Add due date'
                    }
                  </span>
                  {item.due_date && !isReadOnly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearDate();
                      }}
                      style={{
                        width: '20px',
                        height: '20px',
                        border: 'none',
                        background: 'transparent',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                      <X size={14} />
                    </button>
                  )}
                  <ChevronDown size={16} color="#94a3b8" />
                </button>

                {/* Date Picker Dropdown */}
                {datePickerOpen && !isReadOnly && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '4px',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                      zIndex: 100,
                      padding: '12px',
                    }}
                  >
                    <input
                      type="date"
                      value={editDate}
                      onChange={handleDateChange}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* ═══════════════════════════════════════════════════════════
                  LABELS (With Create New)
              ═══════════════════════════════════════════════════════════ */}
              <div style={{ marginBottom: '24px', position: 'relative' }}>
                <FieldLabel icon={<Tag size={14} />} label="Labels" />
                
                {/* Current Labels */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  {currentLabel && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        background: `${currentLabel.color}15`,
                        border: `1px solid ${currentLabel.color}40`,
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: currentLabel.color,
                      }}
                    >
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: currentLabel.color,
                      }} />
                      {currentLabel.name}
                      {!isReadOnly && (
                        <button
                          onClick={handleRemoveLabel}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '14px',
                            height: '14px',
                            border: 'none',
                            background: 'transparent',
                            color: currentLabel.color,
                            cursor: 'pointer',
                            opacity: 0.6,
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  )}
                  
                  {/* Add Label Button */}
                  {!isReadOnly && (
                    <button
                      onClick={() => setLabelDropdownOpen(!labelDropdownOpen)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        background: 'transparent',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#94a3b8';
                        e.currentTarget.style.background = '#f8fafc';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  )}
                </div>

                {/* Labels Dropdown */}
                {labelDropdownOpen && !isReadOnly && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                      zIndex: 100,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Search Input */}
                    <div style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}>
                        <Search size={16} color="#94a3b8" />
                        <input
                          ref={labelInputRef}
                          type="text"
                          value={labelSearch}
                          onChange={e => setLabelSearch(e.target.value)}
                          placeholder="Search or create label..."
                          style={{
                            flex: 1,
                            border: 'none',
                            background: 'transparent',
                            fontSize: '14px',
                            color: '#1e293b',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Label List */}
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {labelsLoading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                          <Loader2 size={20} className="animate-spin" />
                        </div>
                      ) : (
                        <>
                          {filteredLabels.map(label => {
                            const isSelected = currentLabel?.id === label.id;
                            return (
                              <button
                                key={label.id}
                                onClick={() => handleLabelSelect(label)}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '10px 16px',
                                  border: 'none',
                                  background: isSelected ? '#f8fafc' : 'transparent',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  transition: 'background 0.1s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={e => e.currentTarget.style.background = isSelected ? '#f8fafc' : 'transparent'}
                              >
                                <span style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '3px',
                                  background: label.color,
                                }} />
                                <span style={{ 
                                  flex: 1, 
                                  fontSize: '14px', 
                                  fontWeight: 500, 
                                  color: '#1e293b' 
                                }}>
                                  {label.name}
                                </span>
                                {isSelected && <Check size={16} color="#3b82f6" />}
                              </button>
                            );
                          })}

                          {/* Create New Label Option */}
                          {labelSearch && !filteredLabels.some(l => 
                            l.name.toLowerCase() === labelSearch.toLowerCase()
                          ) && (
                            <button
                              onClick={() => {
                                setNewLabelName(labelSearch);
                                setShowCreateLabel(true);
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 16px',
                                border: 'none',
                                borderTop: '1px solid #f1f5f9',
                                background: 'transparent',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <Plus size={16} color="#3b82f6" />
                              <span style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 500 }}>
                                Create "{labelSearch}"
                              </span>
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Create Label Form */}
                    {showCreateLabel && (
                      <div style={{ 
                        padding: '16px', 
                        borderTop: '1px solid #e2e8f0',
                        background: '#f8fafc',
                      }}>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ 
                            fontSize: '12px', 
                            fontWeight: 600, 
                            color: '#64748b',
                            display: 'block',
                            marginBottom: '6px',
                          }}>
                            Label Name
                          </label>
                          <input
                            type="text"
                            value={newLabelName}
                            onChange={e => setNewLabelName(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontSize: '14px',
                              outline: 'none',
                            }}
                          />
                        </div>
                        
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ 
                            fontSize: '12px', 
                            fontWeight: 600, 
                            color: '#64748b',
                            display: 'block',
                            marginBottom: '6px',
                          }}>
                            Color
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {LABEL_COLORS.map(color => (
                              <button
                                key={color.value}
                                onClick={() => setNewLabelColor(color.value)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  background: color.value,
                                  border: newLabelColor === color.value 
                                    ? '2px solid #1e293b' 
                                    : '2px solid transparent',
                                  cursor: 'pointer',
                                  transition: 'transform 0.1s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setShowCreateLabel(false);
                              setNewLabelName('');
                            }}
                            style={{
                              flex: 1,
                              padding: '8px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              background: 'white',
                              fontSize: '13px',
                              fontWeight: 500,
                              color: '#64748b',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCreateLabel}
                            disabled={!newLabelName.trim() || createLabelMutation.isPending}
                            style={{
                              flex: 1,
                              padding: '8px',
                              border: 'none',
                              borderRadius: '6px',
                              background: '#3b82f6',
                              fontSize: '13px',
                              fontWeight: 500,
                              color: 'white',
                              cursor: newLabelName.trim() ? 'pointer' : 'not-allowed',
                              opacity: newLabelName.trim() ? 1 : 0.5,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            {createLabelMutation.isPending && (
                              <Loader2 size={14} className="animate-spin" />
                            )}
                            Create
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ═══════════════════════════════════════════════════════════
                  DESCRIPTION
              ═══════════════════════════════════════════════════════════ */}
              <div style={{ marginBottom: '24px' }}>
                <FieldLabel icon={<FileText size={14} />} label="Description" />
                <textarea
                  value={description}
                  onChange={e => handleDescriptionChange(e.target.value)}
                  placeholder={isReadOnly ? 'No description' : "Add a description..."}
                  disabled={isReadOnly}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: '#1e293b',
                    background: '#ffffff',
                    resize: 'none',
                    outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    fontFamily: 'inherit',
                    opacity: isReadOnly ? 0.7 : 1,
                  }}
                  onFocus={e => {
                    if (!isReadOnly) {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </>
          ) : (
            /* ═══════════════════════════════════════════════════════════
                ACTIVITY TAB
            ═══════════════════════════════════════════════════════════ */
            <T10ActivityTimeline itemId={item.id} />
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Created {getRelativeTime(item.created_at)}
          </div>
          {!isReadOnly && (
            <button
              onClick={onDelete}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                border: 'none',
                background: 'transparent',
                color: '#ef4444',
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: '8px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(panelContent, document.body);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function FieldLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: '#64748b',
        marginBottom: '10px',
      }}
    >
      {icon}
      {label}
    </div>
  );
}

function Avatar({ initials, avatarUrl, size = 32 }: { initials: string; avatarUrl?: string; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={initials}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        color: 'white',
        fontSize: size * 0.4,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {initials}
    </div>
  );
}
