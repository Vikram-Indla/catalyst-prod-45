// ============================================================
// WORKSTREAMS V10 - Detail Drawer Component
// Fixes: overlap, add member, navigation, rename/delete/archive
// ============================================================

import '@/styles/workstreams.css';
import { useState, useEffect, useRef } from 'react';
import { Pencil, X, AlertTriangle, Check, LayoutGrid, Columns3, Calendar, UserPlus, Trash2, Search, Archive, ArchiveRestore, ChevronDown } from 'lucide-react';
import { Workstream, useUpdateWorkstream, useAddWorkstreamMember, useRemoveWorkstreamMember, useDeleteWorkstream, useArchiveWorkstream } from '../../hooks/usePlannerWorkstreams';
import { useResourceInventory, Resource } from '../../hooks/useResourceInventory';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkstreamDrawerProps {
  workstream: Workstream | null;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkstreamDrawer({ workstream, isOpen, onClose }: WorkstreamDrawerProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const prefixInputRef = useRef<HTMLInputElement>(null);
  
  // Rename mode
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState('');
  
  // Key prefix edit mode
  const [isEditingPrefix, setIsEditingPrefix] = useState(false);
  const [editPrefix, setEditPrefix] = useState('');
  
  // Add member modal state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  
  // Delete confirmation
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const { data: resources = [] } = useResourceInventory();
  const updateWorkstream = useUpdateWorkstream();
  const addMember = useAddWorkstreamMember();
  const removeMember = useRemoveWorkstreamMember();
  const deleteWorkstream = useDeleteWorkstream();
  const archiveWorkstream = useArchiveWorkstream();

  // Reset state when workstream changes
  useEffect(() => {
    if (workstream) {
      setRenameName(workstream.name);
      setEditPrefix(workstream.key_prefix || workstream.code || '');
      setIsRenaming(false);
      setIsEditingPrefix(false);
      setIsAddMemberOpen(false);
      setMemberSearch('');
    }
  }, [workstream?.id]);

  // Focus input when renaming starts
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Focus prefix input when editing starts
  useEffect(() => {
    if (isEditingPrefix && prefixInputRef.current) {
      prefixInputRef.current.focus();
      prefixInputRef.current.select();
    }
  }, [isEditingPrefix]);

  if (!workstream) return null;

  const healthInfo = {
    'healthy': { icon: Check, label: 'On Track', color: 'var(--ws-success)' },
    'at-risk': { icon: AlertTriangle, label: 'At Risk', color: 'var(--ws-warning)' },
    'critical': { icon: AlertTriangle, label: 'Critical', color: 'var(--ws-danger)' },
    'locked': { icon: null, label: 'Locked', color: 'var(--ws-text-muted)' },
  };

  const health = healthInfo[workstream.health || 'healthy'];
  const HealthIcon = health.icon;

  // Get existing member IDs
  const existingMemberIds = new Set(workstream.members?.map(m => m.user_id) || []);
  
  // Filter available resources (not already members)
  const availableResources = resources.filter(r => 
    r.profile_id && 
    !existingMemberIds.has(r.profile_id) &&
    r.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const membersForLead = (workstream.members || [])
    .filter(m => !!m.user_id)
    .map(m => ({
      userId: m.user_id,
      name: m.profile?.full_name || 'Unknown',
      initials: (m.profile?.full_name || 'U')
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Rename handlers
  const handleRenameStart = () => {
    setRenameName(workstream.name);
    setIsRenaming(true);
  };

  const handleRenameSave = async () => {
    if (renameName.trim() && renameName !== workstream.name) {
      await updateWorkstream.mutateAsync({
        id: workstream.id,
        updates: { name: renameName.trim() },
      });
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSave();
    } else if (e.key === 'Escape') {
      setRenameName(workstream.name);
      setIsRenaming(false);
    }
  };

  // Key prefix handlers
  const handlePrefixStart = () => {
    setEditPrefix(workstream.key_prefix || workstream.code || '');
    setIsEditingPrefix(true);
  };

  const handlePrefixSave = async () => {
    const cleanPrefix = editPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    if (cleanPrefix && cleanPrefix !== workstream.key_prefix) {
      await updateWorkstream.mutateAsync({
        id: workstream.id,
        updates: { key_prefix: cleanPrefix },
      });
    }
    setIsEditingPrefix(false);
  };

  const handlePrefixKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePrefixSave();
    } else if (e.key === 'Escape') {
      setEditPrefix(workstream.key_prefix || workstream.code || '');
      setIsEditingPrefix(false);
    }
  };

  // Add member handler
  const handleAddMember = async (resource: Resource) => {
    if (!resource.profile_id) return;
    
    await addMember.mutateAsync({
      workstreamId: workstream.id,
      userId: resource.profile_id,
      role: 'member',
    });
    setMemberSearch('');
    setIsAddMemberOpen(false);
  };

  // Delete handler
  const handleDelete = async () => {
    await deleteWorkstream.mutateAsync(workstream.id);
    setIsDeleteOpen(false);
    onClose();
  };

  // Archive handler
  const handleArchive = async () => {
    await archiveWorkstream.mutateAsync({
      id: workstream.id,
      archive: !workstream.is_archived,
    });
    onClose();
  };

  // Navigation handlers with workstream filter
  const navigateToTasks = () => {
    navigate(`/planner/task-list?workstream=${encodeURIComponent(workstream.slug || workstream.id)}`);
    onClose();
  };

  const navigateToBoard = () => {
    navigate(`/planner/boards?workstream=${encodeURIComponent(workstream.slug || workstream.id)}`);
    onClose();
  };

  const navigateToCalendar = () => {
    navigate(`/planner/calendar?workstream=${encodeURIComponent(workstream.slug || workstream.id)}`);
    onClose();
  };

  const canDelete = (workstream.taskCount || 0) === 0;

  return (
    <>
      {/* Overlay - higher z-index to prevent overlap */}
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity z-[60] ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose} 
      />
      
      {/* Drawer Panel - higher z-index */}
      <aside 
        className={`fixed right-0 top-0 h-full w-[420px] bg-white dark:bg-[#1a1a1a] shadow-2xl transform transition-transform duration-300 z-[70] flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} 
        role="dialog" 
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ background: workstream.color }} 
                />
                {isRenaming ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    onBlur={handleRenameSave}
                    onKeyDown={handleRenameKeyDown}
                    className="flex-1 px-2 py-1 text-lg font-semibold bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {workstream.name}
                  </h2>
                )}
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-6 flex items-center gap-1">
                {isEditingPrefix ? (
                  <input
                    ref={prefixInputRef}
                    type="text"
                    value={editPrefix}
                    onChange={(e) => setEditPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
                    onBlur={handlePrefixSave}
                    onKeyDown={handlePrefixKeyDown}
                    className="w-16 px-1 py-0.5 font-mono text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={5}
                  />
                ) : (
                  <button
                    onClick={handlePrefixStart}
                    className="font-mono hover:bg-gray-100 dark:hover:bg-gray-800 px-1 py-0.5 rounded transition-colors"
                    title="Click to edit task key prefix"
                  >
                    {workstream.key_prefix || workstream.code}
                  </button>
                )}
                {' · Created '}
                {new Date(workstream.created_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <button 
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                onClick={handleRenameStart}
                title="Rename"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                onClick={handleArchive}
                title={workstream.is_archived ? 'Unarchive' : 'Archive'}
              >
                {workstream.is_archived ? (
                  <ArchiveRestore className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
              </button>
              <button 
                className={`p-2 rounded-lg transition-colors ${
                  canDelete 
                    ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 hover:text-red-600' 
                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                }`}
                onClick={() => canDelete && setIsDeleteOpen(true)}
                disabled={!canDelete}
                title={canDelete ? 'Delete' : `Cannot delete: ${workstream.taskCount} task(s) linked`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button 
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors" 
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Health Status */}
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 mb-3">
            <div 
              className="flex items-center gap-2 font-semibold mb-1"
              style={{ color: health.color }}
            >
              {HealthIcon && <HealthIcon className="w-4 h-4" />}
              {health.label}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {workstream.overdueCount || 0} overdue · {workstream.taskCount || 0} tasks
            </div>
          </div>

          {/* Save Status */}
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="w-3 h-3" />
            All changes saved
          </div>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Description Section */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Description
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {workstream.description || 'No description provided'}
            </p>
          </div>

          {/* Team Section */}
          <div>
            <div className="flex justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Team
              </div>
              <span className="text-xs text-gray-400">
                {workstream.memberCount || 0} members
              </span>
            </div>

            {/* Lead Assignment */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Lead
              </div>
              {membersForLead.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild disabled={addMember.isPending}>
                    <button
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      type="button"
                    >
                      {workstream.lead ? workstream.lead.name : 'Assign lead...'}
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[9999]">
                    {membersForLead.map((m) => (
                      <DropdownMenuItem
                        key={m.userId}
                        onClick={async () => {
                          await addMember.mutateAsync({
                            workstreamId: workstream.id,
                            userId: m.userId,
                            role: 'lead',
                          });
                        }}
                        className="gap-2"
                      >
                        <span className="font-medium">{m.name}</span>
                        {workstream.lead?.id === m.userId && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}
            </div>

            {/* Lead Card */}
            {workstream.lead && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                      style={{ background: workstream.color }}
                    >
                      {workstream.lead.initials}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {workstream.lead.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Team Lead
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    Lead
                  </span>
                </div>
              </div>
            )}

            {/* Members List */}
            {workstream.members && workstream.members.length > 0 && (
              <div className="space-y-2">
                {workstream.members
                  .filter(m => m.role !== 'lead')
                  .map((member) => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                          style={{ background: workstream.color }}
                        >
                          {member.profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-200">
                          {member.profile?.full_name || 'Unknown'}
                        </span>
                      </div>
                      <button 
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                        onClick={() => removeMember.mutate({ 
                          workstreamId: workstream.id, 
                          userId: member.user_id 
                        })}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* Add Member Section */}
            {isAddMemberOpen ? (
              <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Add Team Member
                  </span>
                  <button 
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400"
                    onClick={() => {
                      setIsAddMemberOpen(false);
                      setMemberSearch('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search resources..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {availableResources.length === 0 ? (
                    <div className="text-sm text-gray-400 text-center py-4">
                      No available resources
                    </div>
                  ) : (
                    availableResources.slice(0, 8).map(resource => (
                      <button
                        key={resource.id}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        onClick={() => handleAddMember(resource)}
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                          style={{ background: workstream.color }}
                        >
                          {resource.initials}
                        </div>
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {resource.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {resource.role}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <button 
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setIsAddMemberOpen(true)}
              >
                <UserPlus className="w-4 h-4" />
                Add Member
              </button>
            )}
          </div>

          {/* Work Summary */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Work Summary
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {workstream.taskCount || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Total Tasks
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
                <div className="text-xl font-bold text-red-500">
                  {workstream.overdueCount || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Overdue
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {workstream.memberCount || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Members
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300" 
                style={{ width: `${workstream.progress || 0}%` }} 
              />
            </div>
            <div className="text-right mt-1 text-xs text-gray-500 dark:text-gray-400">
              {workstream.progress || 0}% complete
            </div>
          </div>

          {/* Activity Feed */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Activity
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                  style={{ background: workstream.color }}
                >
                  {workstream.lead?.initials || 'SY'}
                </div>
                <div>
                  <div className="text-sm text-gray-700 dark:text-gray-200">
                    <strong>{workstream.lead?.name || 'System'}</strong> created this workstream
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(workstream.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - fixed at bottom */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a]">
          <div className="flex gap-2">
            <button 
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              onClick={navigateToTasks}
            >
              <LayoutGrid className="w-4 h-4" />
              Task List
            </button>
            <button 
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
              onClick={navigateToBoard}
            >
              <Columns3 className="w-4 h-4" />
              Board
            </button>
            <button 
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
              onClick={navigateToCalendar}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </button>
          </div>
        </div>
      </aside>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workstream</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{workstream.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
