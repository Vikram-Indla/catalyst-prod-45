// ============================================================
// PLANNER CREATE TASK MODAL
// Enterprise-grade modal with searchable dropdowns, team filtering
// Follows Catalyst V5 Design System
// ============================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Plus, Zap, Paperclip, Link2, Calendar, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TaskStatus, TaskPriority, PlannerUser, PlannerTeam } from '../types';
import { COLUMN_CONFIG, PRIORITY_CONFIG } from '../types';
import { SearchableSelect, SelectOption } from './SearchableSelect';
import { usePlannerFeatures, PlannerFeature } from '../hooks/usePlannerFeatures';
import { cn } from '@/lib/utils';

interface CreateTaskData {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  reporterId?: string;
  teamId?: string;
  featureId?: string;
  startDate?: string;
  dueDate?: string;
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
  const [featureId, setFeatureId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  // Fetch features
  const { data: features = [] } = usePlannerFeatures();

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
      setFeatureId(null);
      setStartDate('');
      setDueDate('');
      // Focus title after animation
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultStatus, defaultTeamId, currentUserId]);

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
  }, [isOpen, title, featureId, onClose]);

  const handleSubmit = () => {
    if (!title.trim()) {
      titleInputRef.current?.focus();
      return;
    }

    // Feature is required
    if (!featureId) {
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
      featureId: featureId || undefined,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
    });

    onClose();
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

  // Feature options
  const featureOptions: SelectOption[] = features.map(f => ({
    id: f.id,
    label: f.name,
    meta: f.displayId,
    color: '#8b5cf6', // Purple for features
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
            <div className="w-full max-w-[600px] bg-background rounded-2xl shadow-2xl overflow-hidden">
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
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
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

                {/* Linked Feature Section */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Linked Feature <span className="text-destructive">*</span>
                  </div>
                  <SearchableSelect
                    placeholder="Select a feature..."
                    searchPlaceholder="Search features..."
                    options={featureOptions}
                    value={featureId}
                    onChange={setFeatureId}
                    renderTrigger={(selected) => (
                      selected ? (
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <span className="text-foreground truncate">{selected.label}</span>
                          <span className="text-xs text-muted-foreground">({selected.meta})</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Select a feature...</span>
                      )
                    )}
                    renderOption={(option) => (
                      <div className="flex items-center gap-3">
                        <Layers className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.meta}</div>
                        </div>
                      </div>
                    )}
                  />
                </div>

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
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-full text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    AI Checklist
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
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-full text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Link Item
                  </button>
                </div>
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
