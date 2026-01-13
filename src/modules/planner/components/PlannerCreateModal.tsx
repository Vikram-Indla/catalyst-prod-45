// ============================================================
// PLANNER CREATE TASK MODAL
// Enterprise-grade modal with searchable dropdowns, team filtering
// Follows Catalyst V5 Design System
// ============================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Plus, Zap, Paperclip, Link2, Calendar, Check, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TaskStatus, TaskPriority, PlannerUser, PlannerTeam } from '../types';
import { COLUMN_CONFIG, PRIORITY_CONFIG } from '../types';
import { SearchableSelect, SelectOption } from './SearchableSelect';
import { WorkItemSelector } from './WorkItemSelector';
import { WorkItemType } from '../hooks/usePlannerWorkItems';
import { useAIChecklist, ChecklistItem } from '../hooks/useAIChecklist';
import { cn } from '@/lib/utils';

interface CreateTaskData {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  reporterId?: string;
  teamId?: string;
  linkedWorkItemId?: string;
  linkedWorkItemType?: WorkItemType;
  startDate?: string;
  dueDate?: string;
  checklistItems?: ChecklistItem[];
}

interface PlannerCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateTaskData) => void;
  defaultStatus?: TaskStatus;
  defaultTeamId?: string;
  users?: PlannerUser[];
  teams?: PlannerTeam[];
  currentUserId?: string;
}

// Avatar color utility
const AVATAR_COLORS = [
  '#2563eb', // blue
  '#0d9488', // teal
  '#7c3aed', // purple
  '#d97706', // amber
  '#dc2626', // red
  '#059669', // emerald
];

function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function PlannerCreateModal({
  isOpen,
  onClose,
  onCreate,
  defaultStatus = 'backlog',
  defaultTeamId,
  users = [],
  teams = [],
  currentUserId,
}: PlannerCreateModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [reporterId, setReporterId] = useState<string | null>(currentUserId || null);
  const [teamId, setTeamId] = useState<string | null>(defaultTeamId || null);
  const [linkedWorkItemId, setLinkedWorkItemId] = useState<string | null>(null);
  const [linkedWorkItemType, setLinkedWorkItemType] = useState<WorkItemType | undefined>(undefined);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showLinkItem, setShowLinkItem] = useState(false);

  // AI Checklist hook
  const { 
    isGenerating, 
    checklistItems, 
    generateChecklist, 
    clearChecklist, 
    toggleItem, 
    removeItem 
  } = useAIChecklist();

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Filter assignees by selected team
  const availableAssignees = useMemo(() => {
    if (!teamId) return users;
    return users.filter(u => u.teamId === teamId || u.team === teamId);
  }, [users, teamId]);

  // Reset assignee when team changes (if current assignee not in new team)
  useEffect(() => {
    if (teamId && assigneeId) {
      const assigneeInTeam = availableAssignees.find(u => u.id === assigneeId);
      if (!assigneeInTeam) {
        setAssigneeId(null);
      }
    }
  }, [teamId, assigneeId, availableAssignees]);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setPriority('medium');
      setAssigneeId(null);
      setReporterId(currentUserId || null);
      setTeamId(defaultTeamId || null);
      setLinkedWorkItemId(null);
      setLinkedWorkItemType(undefined);
      setStartDate(getTodayDate()); // Default to today
      setDueDate('');
      setShowLinkItem(false);
      clearChecklist();
      // Focus title after animation
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultStatus, defaultTeamId, currentUserId, clearChecklist]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, title, linkedWorkItemId, onClose]);

  const handleSubmit = () => {
    if (!title.trim()) {
      titleInputRef.current?.focus();
      return;
    }

    // Work item link is required
    if (!linkedWorkItemId) {
      return;
    }

    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      assigneeId: assigneeId || undefined,
      reporterId: reporterId || undefined,
      teamId: teamId || undefined,
      linkedWorkItemId: linkedWorkItemId || undefined,
      linkedWorkItemType: linkedWorkItemType,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      checklistItems: checklistItems.length > 0 ? checklistItems : undefined,
    });

    onClose();
  };

  const handleAIChecklist = () => {
    if (!title.trim()) {
      titleInputRef.current?.focus();
      return;
    }
    generateChecklist(title, description);
  };

  // Transform data for SearchableSelect
  const teamOptions: SelectOption[] = teams.map(t => ({
    id: t.id,
    label: t.name,
    color: t.color,
    meta: `${t.memberCount} members`,
  }));

  const userOptions: SelectOption[] = availableAssignees.map(u => ({
    id: u.id,
    label: u.name,
    initials: u.initials,
    color: getAvatarColor(u.name),
    groupId: u.teamId || u.team,
  }));

  const allUserOptions: SelectOption[] = users.map(u => ({
    id: u.id,
    label: u.name,
    initials: u.initials,
    color: getAvatarColor(u.name),
    groupId: u.teamId || u.team,
  }));

  const statusOptions: SelectOption[] = COLUMN_CONFIG.map(s => ({
    id: s.id,
    label: s.title,
    color: s.color,
  }));

  const priorityOptions: SelectOption[] = (Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG['critical']][]).map(([key, config]) => ({
    id: key,
    label: config.label,
    color: config.color,
    emoji: config.emoji,
  }));


  // Group users by team for ungrouped assignee dropdown
  const getUserTeamName = (option: SelectOption): string => {
    const team = teams.find(t => t.id === option.groupId);
    return team?.name || 'Other';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-[600px] bg-background rounded-2xl shadow-2xl overflow-visible">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Create New Task</h2>
                    <p className="text-sm text-muted-foreground">Add a task to your planner</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto overflow-x-visible">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Task Title <span className="text-destructive">*</span>
                  </label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-base font-medium text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-foreground">
                      Description
                    </label>
                    <span className="text-xs text-muted-foreground">Optional</span>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add more details about this task..."
                    rows={3}
                    className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all resize-none"
                  />
                </div>

                {/* Assignment Section */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Assignment
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <SearchableSelect
                      label="Team"
                      placeholder="Select team..."
                      searchPlaceholder="Search teams..."
                      options={teamOptions}
                      value={teamId}
                      onChange={setTeamId}
                      renderOption={(option) => (
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                            style={{ background: option.color }}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{option.label}</div>
                            {option.meta && (
                              <div className="text-xs text-muted-foreground">{option.meta}</div>
                            )}
                          </div>
                        </div>
                      )}
                    />

                    <SearchableSelect
                      label="Assignee"
                      placeholder="Select assignee..."
                      searchPlaceholder="Search people..."
                      options={userOptions}
                      value={assigneeId}
                      onChange={setAssigneeId}
                      groupBy={!teamId ? getUserTeamName : undefined}
                      renderTrigger={(selected) => (
                        selected ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                              style={{ background: selected.color }}
                            >
                              {selected.initials}
                            </div>
                            <span className="text-foreground truncate">{selected.label}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Select assignee...</span>
                        )
                      )}
                      renderOption={(option) => (
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: option.color }}
                          >
                            {option.initials}
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">{option.label}</span>
                        </div>
                      )}
                    />
                  </div>
                </div>

                {/* Linked Work Item Section */}
                <WorkItemSelector
                  value={linkedWorkItemId}
                  onChange={(value, workItem) => {
                    setLinkedWorkItemId(value);
                    setLinkedWorkItemType(workItem?.type);
                  }}
                  required
                />

                {/* Classification Section */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Classification
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <SearchableSelect
                      label="Status"
                      options={statusOptions}
                      value={status}
                      onChange={(v) => setStatus((v as TaskStatus) || 'backlog')}
                      showSearch={false}
                      showClear={false}
                      renderTrigger={(selected) => (
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: selected?.color }}
                          />
                          <span className="text-foreground">{selected?.label || 'Select...'}</span>
                        </div>
                      )}
                    />

                    <SearchableSelect
                      label="Priority"
                      options={priorityOptions}
                      value={priority}
                      onChange={(v) => setPriority((v as TaskPriority) || 'medium')}
                      showSearch={false}
                      showClear={false}
                      renderTrigger={(selected) => (
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: selected?.color }}
                          />
                          <span className="text-foreground">{selected?.label || 'Select...'}</span>
                        </div>
                      )}
                      renderOption={(option) => (
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: option.color }}
                          />
                          <span className="text-sm font-medium text-foreground">{option.label}</span>
                        </div>
                      )}
                    />
                  </div>
                </div>

                {/* Timeline Section */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Timeline
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Start Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Due Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-sm text-foreground focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    type="button"
                    onClick={handleAIChecklist}
                    disabled={isGenerating || !title.trim()}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                      checklistItems.length > 0
                        ? "bg-primary/10 border border-primary text-primary"
                        : "bg-background border border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5",
                      (isGenerating || !title.trim()) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    {isGenerating ? 'Generating...' : checklistItems.length > 0 ? `Checklist (${checklistItems.length})` : 'AI Checklist'}
                  </button>
                  <button 
                    type="button"
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-full text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    Attach File
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowLinkItem(!showLinkItem)}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                      showLinkItem
                        ? "bg-primary/10 border border-primary text-primary"
                        : "bg-background border border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                    )}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Link Item
                  </button>
                </div>

                {/* AI Checklist Items */}
                {checklistItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        AI Generated Checklist
                      </div>
                      <button
                        type="button"
                        onClick={clearChecklist}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-1.5 p-3 bg-muted/30 rounded-xl border border-border">
                      {checklistItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 group"
                        >
                          <button
                            type="button"
                            onClick={() => toggleItem(index)}
                            className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-colors flex-shrink-0",
                              item.is_completed
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border hover:border-primary"
                            )}
                          >
                            {item.is_completed && <Check className="w-3 h-3" />}
                          </button>
                          <span
                            className={cn(
                              "text-sm flex-1",
                              item.is_completed && "line-through text-muted-foreground"
                            )}
                          >
                            {item.content}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Link Item section when toggled */}
                {showLinkItem && (
                  <div className="p-4 bg-muted/30 rounded-xl border border-border">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Additional Linked Items
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Use the "Linked Work Item" selector above to link this task to stories, features, epics, or business requests.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-medium">⌘</kbd>
                  {' + '}
                  <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-medium">Enter</kbd>
                  {' to create'}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-background border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted hover:border-border-strong transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!title.trim()}
                    className={cn(
                      "px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold",
                      "hover:bg-primary/90 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30",
                      "transition-all flex items-center gap-2",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    Create Task
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
