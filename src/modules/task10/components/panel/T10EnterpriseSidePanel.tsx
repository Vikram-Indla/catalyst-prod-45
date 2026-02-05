import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, User, Calendar, Tag, FileText, Plus, Clock, 
  Trash2, ChevronDown, Search, Loader2, Copy
} from 'lucide-react';
import { toast } from 'sonner';
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
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const COLORS = {
  white: '#ffffff',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',
  blue: '#3b82f6',
  blue50: '#eff6ff',
  blueDark: '#1d4ed8',
  teal: '#0d9488',
  teal50: '#f0fdfa',
  green: '#22c55e',
  green50: '#f0fdf4',
  red: '#ef4444',
  red50: '#fef2f2',
};

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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
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
      setEditDate(item.due_date || '');
      setSaveStatus('idle');
    }
  }, [item?.id]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (assigneeDropdownOpen) setAssigneeDropdownOpen(false);
        else if (labelDropdownOpen) setLabelDropdownOpen(false);
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
  }, [isOpen, assigneeDropdownOpen, labelDropdownOpen, datePickerOpen, onClose]);


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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (descriptionTimeoutRef.current) {
        clearTimeout(descriptionTimeoutRef.current);
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CTA HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleCopyTaskKey = () => {
    if (item?.taskhub_key) {
      navigator.clipboard.writeText(item.taskhub_key);
      toast.success(`Copied ${item.taskhub_key}`);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FIELD HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleAssigneeSelect = (user: T10User) => {
    onUpdate({ 
      assignee_id: user.id,
      assignee_name: user.full_name,
      assignee_initials: user.initials
    });
    setAssigneeDropdownOpen(false);
    setAssigneeSearch('');
    toast.success(`Assigned to ${user.full_name}`);
  };

  const handleRemoveAssignee = () => {
    onUpdate({ assignee_id: undefined, assignee_name: undefined, assignee_initials: undefined });
    toast.success('Assignee removed');
  };

  // Get current label object from labels array
  const getCurrentLabel = (): T10Label | undefined => {
    if (!item?.label) return undefined;
    return labels.find(l => l.name === item.label);
  };

  const handleLabelSelect = (label: T10Label) => {
    const currentLabel = getCurrentLabel();
    if (currentLabel?.id === label.id) {
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
      
      onUpdate({ label: newLabel.name });
      setNewLabelName('');
      setShowCreateLabel(false);
      setLabelDropdownOpen(false);
      toast.success(`Label "${newLabel.name}" created`);
    } catch (error) {
      toast.error('Failed to create label');
      console.error('Failed to create label:', error);
    }
  };

  // AUTO-SAVE for description with visual feedback
  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
    setSaveStatus('saving');
    
    if (descriptionTimeoutRef.current) {
      clearTimeout(descriptionTimeoutRef.current);
    }
    
    descriptionTimeoutRef.current = setTimeout(async () => {
      try {
        await onUpdate({ description: value });
        setSaveStatus('saved');
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        setSaveStatus('idle');
        toast.error('Failed to save description');
      }
    }, 800);
  }, [onUpdate]);

  const handleStatusToggle = () => {
    const newStatus = item?.status === 'done' ? 'todo' : 'done';
    onUpdate({ status: newStatus });
    toast.success(newStatus === 'done' ? 'Marked as completed' : 'Marked as incomplete');
  };

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

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isOpen || !item) return null;

  const isCompleted = item.status === 'done';
  const rankTier = getRankTier(item.rank);
  const currentLabel = getCurrentLabel();
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
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 9998,
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          PANEL
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100vh',
          width: '480px',
          maxWidth: '100vw',
          background: COLORS.white,
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.12)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            HEADER (with gradient)
        ═══════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: `linear-gradient(to bottom, ${COLORS.gray50}, ${COLORS.white})`,
            borderBottom: `1px solid ${COLORS.gray200}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  ? `linear-gradient(135deg, ${COLORS.blue} 0%, ${COLORS.blueDark} 100%)`
                  : rankTier === 'mid'
                    ? COLORS.gray500
                    : 'transparent',
                border: rankTier === 'buffer' ? `2px dashed ${COLORS.gray300}` : 'none',
                color: rankTier === 'buffer' ? COLORS.gray400 : 'white',
                boxShadow: rankTier === 'top' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
              }}
            >
              {item.rank}
            </div>
            
            <div>
              <div style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                color: COLORS.gray500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                PRIORITY
              </div>
              {item.taskhub_key && (
                <button
                  onClick={handleCopyTaskKey}
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
                    color: COLORS.teal,
                  }}
                  title="Click to copy"
                >
                  {item.taskhub_key}
                  <Copy size={12} style={{ opacity: 0.5 }} />
                </button>
              )}
            </div>
          </div>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              border: 'none',
              background: 'transparent',
              color: COLORS.gray500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = COLORS.gray100;
              e.currentTarget.style.color = COLORS.gray700;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = COLORS.gray500;
            }}
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TITLE (NO edit icon - removed per spec)
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ 
          padding: '20px 20px 16px', 
          borderBottom: `1px solid ${COLORS.gray100}` 
        }}>
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: COLORS.gray900,
              lineHeight: 1.4,
            }}
          >
            {item.title}
          </h2>
          {/* NO EDIT ICON - Removed per critique */}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TABS
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${COLORS.gray200}`,
          padding: '0 20px',
          flexShrink: 0,
        }}>
          {(['details', 'activity'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 600,
                color: activeTab === tab ? COLORS.blue : COLORS.gray500,
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab ? COLORS.blue : 'transparent'}`,
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {activeTab === 'details' ? (
            <>
              {/* STATUS */}
              <FieldSection>
                <FieldLabel icon={<Clock size={14} />} label="Status" />
                <button
                  onClick={() => !isReadOnly && handleStatusToggle()}
                  disabled={isReadOnly}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    background: isCompleted ? COLORS.green50 : COLORS.gray50,
                    border: `1px solid ${isCompleted ? '#86efac' : COLORS.gray200}`,
                    borderRadius: '10px',
                    cursor: isReadOnly ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    opacity: isReadOnly ? 0.7 : 1,
                  }}
                >
                  {/* Circle Checkbox - 26x26px */}
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      border: isCompleted ? 'none' : `2px solid ${COLORS.gray300}`,
                      background: isCompleted ? COLORS.green : COLORS.white,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s',
                      flexShrink: 0,
                    }}
                  >
                    {isCompleted && <Check size={14} color="white" strokeWidth={3} />}
                  </div>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: isCompleted ? 600 : 400,
                    color: isCompleted ? COLORS.green : COLORS.gray600,
                  }}>
                    {isCompleted ? 'Completed' : 'Mark as completed'}
                  </span>
                </button>
              </FieldSection>

              {/* ASSIGNEE */}
              <FieldSection>
                <FieldLabel icon={<User size={14} />} label="Assigned To" />
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => !isReadOnly && setAssigneeDropdownOpen(!assigneeDropdownOpen)}
                    disabled={isReadOnly}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      background: COLORS.gray50,
                      border: `1px solid ${assigneeDropdownOpen ? COLORS.blue : COLORS.gray200}`,
                      borderRadius: '10px',
                      cursor: isReadOnly ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'left',
                      opacity: isReadOnly ? 0.7 : 1,
                    }}
                  >
                    {item.assignee_name ? (
                      <>
                        <Avatar initials={item.assignee_initials || 'U'} size={28} />
                        <span style={{ flex: 1, fontSize: '14px', color: COLORS.gray800 }}>
                          {item.assignee_name}
                        </span>
                        {!isReadOnly && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveAssignee(); }}
                            style={{
                              width: '20px',
                              height: '20px',
                              border: 'none',
                              background: 'transparent',
                              color: COLORS.gray400,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                            }}
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
                          border: `2px dashed ${COLORS.gray300}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Plus size={14} color={COLORS.gray400} />
                        </div>
                        <span style={{ fontSize: '14px', color: COLORS.gray400 }}>
                          Add assignee
                        </span>
                      </>
                    )}
                    <ChevronDown size={16} color={COLORS.gray400} style={{ marginLeft: 'auto' }} />
                  </button>

                  {/* Assignee Dropdown */}
                  {assigneeDropdownOpen && !isReadOnly && (
                    <Dropdown>
                      <DropdownSearch
                        ref={assigneeInputRef}
                        value={assigneeSearch}
                        onChange={setAssigneeSearch}
                        placeholder="Search by name or email..."
                      />
                      <DropdownList>
                        {usersLoading ? (
                          <DropdownLoading />
                        ) : users.length === 0 ? (
                          <DropdownEmpty>No users found</DropdownEmpty>
                        ) : (
                          users.map(user => (
                            <DropdownItem
                              key={user.id}
                              onClick={() => handleAssigneeSelect(user)}
                              selected={item.assignee_id === user.id}
                            >
                              <Avatar initials={user.initials} avatarUrl={user.avatar_url} size={32} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 500, color: COLORS.gray800 }}>
                                  {user.full_name || 'Unnamed User'}
                                </div>
                                <div style={{ fontSize: '12px', color: COLORS.gray500 }}>
                                  {user.email}
                                </div>
                              </div>
                              {item.assignee_id === user.id && (
                                <Check size={16} color={COLORS.blue} />
                              )}
                            </DropdownItem>
                          ))
                        )}
                      </DropdownList>
                    </Dropdown>
                  )}
                </div>
              </FieldSection>

              {/* DUE DATE */}
              <FieldSection>
                <FieldLabel icon={<Calendar size={14} />} label="Due Date" />
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => !isReadOnly && setDatePickerOpen(!datePickerOpen)}
                    disabled={isReadOnly}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      background: COLORS.gray50,
                      border: `1px solid ${COLORS.gray200}`,
                      borderRadius: '10px',
                      cursor: isReadOnly ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'left',
                      opacity: isReadOnly ? 0.7 : 1,
                    }}
                  >
                    <Calendar size={18} color={item.due_date ? COLORS.blue : COLORS.gray400} />
                    <span style={{ 
                      flex: 1, 
                      fontSize: '14px', 
                      color: item.due_date ? COLORS.gray800 : COLORS.gray400 
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
                        onClick={(e) => { e.stopPropagation(); handleClearDate(); }}
                        style={{
                          width: '20px',
                          height: '20px',
                          border: 'none',
                          background: 'transparent',
                          color: COLORS.gray400,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                    <ChevronDown size={16} color={COLORS.gray400} />
                  </button>

                  {/* Date Picker */}
                  {datePickerOpen && !isReadOnly && (
                    <Dropdown>
                      <div style={{ padding: '12px' }}>
                        <input
                          type="date"
                          value={editDate}
                          onChange={handleDateChange}
                          autoFocus
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: `1px solid ${COLORS.gray200}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </Dropdown>
                  )}
                </div>
              </FieldSection>

              {/* LABELS */}
              <FieldSection>
                <FieldLabel icon={<Tag size={14} />} label="Labels" />
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {currentLabel && (
                      <LabelChip 
                        label={currentLabel} 
                        onRemove={isReadOnly ? undefined : handleRemoveLabel} 
                      />
                    )}
                    
                    {!isReadOnly && (
                      <button
                        onClick={() => setLabelDropdownOpen(!labelDropdownOpen)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 10px',
                          background: 'transparent',
                          border: `1px dashed ${COLORS.gray300}`,
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: COLORS.gray500,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <Plus size={14} />
                        Add
                      </button>
                    )}
                  </div>

                  {/* Labels Dropdown */}
                  {labelDropdownOpen && !isReadOnly && (
                    <Dropdown style={{ marginTop: '8px' }}>
                      <DropdownSearch
                        ref={labelInputRef}
                        value={labelSearch}
                        onChange={setLabelSearch}
                        placeholder="Search or create label..."
                      />
                      <DropdownList>
                        {labelsLoading ? (
                          <DropdownLoading />
                        ) : (
                          <>
                            {filteredLabels.map(label => {
                              const isSelected = currentLabel?.id === label.id;
                              return (
                                <DropdownItem
                                  key={label.id}
                                  onClick={() => handleLabelSelect(label)}
                                  selected={isSelected}
                                >
                                  <span style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '3px',
                                    background: label.color,
                                  }} />
                                  <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: COLORS.gray800 }}>
                                    {label.name}
                                  </span>
                                  {isSelected && <Check size={16} color={COLORS.blue} />}
                                </DropdownItem>
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
                                  padding: '10px 14px',
                                  border: 'none',
                                  borderTop: `1px solid ${COLORS.gray100}`,
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = COLORS.gray50}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <Plus size={16} color={COLORS.blue} />
                                <span style={{ fontSize: '14px', color: COLORS.blue, fontWeight: 500 }}>
                                  Create "{labelSearch}"
                                </span>
                              </button>
                            )}
                          </>
                        )}
                      </DropdownList>

                      {/* Create Label Form */}
                      {showCreateLabel && (
                        <div style={{ 
                          padding: '12px', 
                          borderTop: `1px solid ${COLORS.gray200}`,
                          background: COLORS.gray50,
                        }}>
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ 
                              fontSize: '12px', 
                              fontWeight: 600, 
                              color: COLORS.gray600,
                              marginBottom: '6px',
                            }}>
                              Choose a color
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {LABEL_COLORS.map(color => (
                                <button
                                  key={color.value}
                                  onClick={() => setNewLabelColor(color.value)}
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '4px',
                                    background: color.value,
                                    border: newLabelColor === color.value 
                                      ? '2px solid #1e293b' 
                                      : '2px solid transparent',
                                    cursor: 'pointer',
                                  }}
                                  title={color.name}
                                />
                              ))}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => { setShowCreateLabel(false); setLabelSearch(''); }}
                              style={{
                                flex: 1,
                                padding: '8px',
                                border: `1px solid ${COLORS.gray200}`,
                                borderRadius: '6px',
                                background: COLORS.white,
                                fontSize: '13px',
                                fontWeight: 500,
                                color: COLORS.gray600,
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleCreateLabel}
                              disabled={createLabelMutation.isPending}
                              style={{
                                flex: 1,
                                padding: '8px',
                                border: 'none',
                                borderRadius: '6px',
                                background: COLORS.blue,
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'white',
                                cursor: 'pointer',
                                opacity: createLabelMutation.isPending ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                              }}
                            >
                              {createLabelMutation.isPending && (
                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                              )}
                              Create
                            </button>
                          </div>
                        </div>
                      )}
                    </Dropdown>
                  )}
                </div>
              </FieldSection>

              {/* DESCRIPTION (with AUTO-SAVE indicator) */}
              <FieldSection>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <FieldLabel icon={<FileText size={14} />} label="Description" />
                  
                  {/* Auto-save status indicator */}
                  {saveStatus !== 'idle' && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: saveStatus === 'saved' ? COLORS.green : COLORS.gray500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      {saveStatus === 'saving' && (
                        <>
                          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          Saving...
                        </>
                      )}
                      {saveStatus === 'saved' && (
                        <>
                          <Check size={12} />
                          Saved
                        </>
                      )}
                    </span>
                  )}
                </div>
                <textarea
                  value={description}
                  onChange={e => handleDescriptionChange(e.target.value)}
                  placeholder={isReadOnly ? 'No description' : "Add a description..."}
                  disabled={isReadOnly}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '14px',
                    border: `1px solid ${COLORS.gray200}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: COLORS.gray800,
                    background: COLORS.white,
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    opacity: isReadOnly ? 0.7 : 1,
                  }}
                  onFocus={e => {
                    if (!isReadOnly) {
                      e.currentTarget.style.borderColor = COLORS.blue;
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = COLORS.gray200;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </FieldSection>
            </>
          ) : (
            /* ACTIVITY TAB */
            <T10ActivityTimeline itemId={item.id} />
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            FOOTER (with gradient)
        ═══════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: `1px solid ${COLORS.gray100}`,
            background: `linear-gradient(to bottom, ${COLORS.gray50}, ${COLORS.gray100})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '12px', color: COLORS.gray400 }}>
            Created {getRelativeTime(item.created_at)}
          </span>
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
                color: COLORS.red,
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: '6px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.red50}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );

  return createPortal(panelContent, document.body);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function FieldSection({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: '24px' }}>{children}</div>;
}

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
        color: COLORS.gray500,
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
          flexShrink: 0,
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
        background: `linear-gradient(135deg, ${COLORS.blue} 0%, ${COLORS.blueDark} 100%)`,
        color: 'white',
        fontSize: size * 0.4,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function LabelChip({ label, onRemove }: { label: T10Label; onRemove?: () => void }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        background: `${label.color}15`,
        border: `1px solid ${label.color}40`,
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        color: label.color,
      }}
    >
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: label.color,
      }} />
      {label.name}
      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '14px',
            height: '14px',
            border: 'none',
            background: 'transparent',
            color: label.color,
            cursor: 'pointer',
            opacity: 0.6,
          }}
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}

function MoreMenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        border: 'none',
        background: 'transparent',
        fontSize: '14px',
        color: COLORS.gray700,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = COLORS.gray50}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {icon}
      {label}
    </button>
  );
}

function Dropdown({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: '4px',
        background: COLORS.white,
        border: `1px solid ${COLORS.gray200}`,
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
        zIndex: 100,
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const DropdownSearch = React.forwardRef<HTMLInputElement, { 
  value: string; 
  onChange: (v: string) => void; 
  placeholder: string 
}>(({ value, onChange, placeholder }, ref) => {
  return (
    <div style={{ padding: '10px', borderBottom: `1px solid ${COLORS.gray100}` }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: COLORS.gray50,
        border: `1px solid ${COLORS.gray200}`,
        borderRadius: '8px',
      }}>
        <Search size={16} color={COLORS.gray400} />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            fontSize: '14px',
            color: COLORS.gray800,
            outline: 'none',
          }}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: COLORS.gray400,
              display: 'flex',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
});

DropdownSearch.displayName = 'DropdownSearch';

function DropdownList({ children }: { children: React.ReactNode }) {
  return <div style={{ maxHeight: '220px', overflowY: 'auto' }}>{children}</div>;
}

function DropdownLoading() {
  return (
    <div style={{ padding: '20px', textAlign: 'center', color: COLORS.gray500 }}>
      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

function DropdownEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '20px', textAlign: 'center', color: COLORS.gray500, fontSize: '14px' }}>
      {children}
    </div>
  );
}

function DropdownItem({ 
  children, 
  onClick, 
  selected = false,
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  selected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        border: 'none',
        background: selected ? COLORS.blue50 : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = COLORS.gray50}
      onMouseLeave={e => e.currentTarget.style.background = selected ? COLORS.blue50 : 'transparent'}
    >
      {children}
    </button>
  );
}
