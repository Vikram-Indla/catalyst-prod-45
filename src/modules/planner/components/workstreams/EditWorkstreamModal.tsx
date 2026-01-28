// ============================================================
// EDIT WORKSTREAM MODAL
// Rename workstream, change color, manage members with lead toggle
// All changes are LOCAL until "Save Changes" is clicked
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2, UserPlus, Trash2, Search, Check, Crown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  useWorkstreamDetails,
  useWorkstreamMembers,
  useUpdateWorkstream,
} from './useWorkstreamMutations';
import { useSearchProfiles } from './useSearchProfiles';

interface EditWorkstreamModalProps {
  workstreamId: string | null;
  open: boolean;
  onClose: () => void;
  focusOnMembers?: boolean;
}

interface PendingMember {
  id: string; // temp id for new members, actual id for existing
  user_id: string;
  role: 'lead' | 'member';
  profile: {
    full_name: string | null;
    email: string | null;
    vendor?: string | null;
    role?: string | null;
  } | null;
  isNew?: boolean; // true if added in this session
}

const WORKSTREAM_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
];

export function EditWorkstreamModal({ workstreamId, open, onClose, focusOnMembers = false }: EditWorkstreamModalProps) {
  const queryClient = useQueryClient();
  const { data: workstream, isLoading: loadingWorkstream } = useWorkstreamDetails(workstreamId);
  const { data: dbMembers = [], isLoading: loadingMembers } = useWorkstreamMembers(workstreamId);
  
  const updateWorkstream = useUpdateWorkstream();
  
  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [memberSearch, setMemberSearch] = useState('');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // LOCAL pending members state (not committed until save)
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [removedMemberIds, setRemovedMemberIds] = useState<Set<string>>(new Set());
  const [roleChanges, setRoleChanges] = useState<Map<string, 'lead' | 'member'>>(new Map());
  
  // Auto-open member popover if focusOnMembers is true
  useEffect(() => {
    if (open && focusOnMembers && !loadingWorkstream && !loadingMembers) {
      const timer = setTimeout(() => setAddMemberOpen(true), 200);
      return () => clearTimeout(timer);
    }
  }, [open, focusOnMembers, loadingWorkstream, loadingMembers]);
  
  // Get existing member user IDs to exclude from search (including pending)
  const allMemberUserIds = useMemo(() => {
    const dbIds = dbMembers.filter(m => !removedMemberIds.has(m.id)).map(m => m.user_id);
    const pendingIds = pendingMembers.map(m => m.user_id);
    return [...new Set([...dbIds, ...pendingIds])];
  }, [dbMembers, pendingMembers, removedMemberIds]);
  
  // Search profiles
  const { data: searchResults = [], isLoading: searchingProfiles } = useSearchProfiles(
    addMemberOpen ? memberSearch : '', 
    allMemberUserIds
  );
  
  // Sync form state when workstream loads
  useEffect(() => {
    if (workstream) {
      setName(workstream.name || '');
      setColor(workstream.color || '#3b82f6');
    }
  }, [workstream]);
  
  // Reset local state when modal opens
  useEffect(() => {
    if (open) {
      setPendingMembers([]);
      setRemovedMemberIds(new Set());
      setRoleChanges(new Map());
    }
  }, [open]);
  
  // Calculate effective members list (db members - removed + pending)
  const effectiveMembers = useMemo(() => {
    const filtered = dbMembers
      .filter(m => !removedMemberIds.has(m.id))
      .map(m => ({
        id: m.id,
        user_id: m.user_id,
        role: roleChanges.get(m.id) || m.role as 'lead' | 'member',
        profile: m.profile,
        isNew: false,
      }));
    
    return [...filtered, ...pendingMembers];
  }, [dbMembers, removedMemberIds, pendingMembers, roleChanges]);
  
  // Check if there are any changes
  const hasNameChange = workstream && name !== workstream.name;
  const hasColorChange = workstream && color !== workstream.color;
  const hasMemberChanges = pendingMembers.length > 0 || removedMemberIds.size > 0 || roleChanges.size > 0;
  const hasChanges = hasNameChange || hasColorChange || hasMemberChanges;
  
  // Add member to pending list (local only)
  const handleAddMember = (profile: { id: string; full_name: string | null; email: string | null; job_title?: string | null }) => {
    const tempId = `pending-${Date.now()}-${profile.id}`;
    setPendingMembers(prev => [...prev, {
      id: tempId,
      user_id: profile.id,
      role: 'member',
      profile: {
        full_name: profile.full_name,
        email: profile.email,
        vendor: null,
        role: profile.job_title || null,
      },
      isNew: true,
    }]);
    setAddMemberOpen(false);
    setMemberSearch('');
  };
  
  // Remove member (track for deletion or remove from pending)
  const handleRemoveMember = (memberId: string, isNew?: boolean) => {
    if (isNew) {
      setPendingMembers(prev => prev.filter(m => m.id !== memberId));
    } else {
      setRemovedMemberIds(prev => new Set([...prev, memberId]));
      // Also clear any role changes for this member
      setRoleChanges(prev => {
        const next = new Map(prev);
        next.delete(memberId);
        return next;
      });
    }
  };
  
  // Toggle lead role (local only)
  const handleToggleLead = (memberId: string, currentRole: string, isNew?: boolean) => {
    const newRole = currentRole === 'lead' ? 'member' : 'lead';
    
    if (isNew) {
      // Update pending member
      setPendingMembers(prev => prev.map(m => {
        if (m.id === memberId) {
          return { ...m, role: newRole };
        }
        // If setting as lead, demote others
        if (newRole === 'lead' && m.role === 'lead') {
          return { ...m, role: 'member' };
        }
        return m;
      }));
      
      // Also demote any existing leads
      if (newRole === 'lead') {
        const currentDbLead = dbMembers.find(m => m.role === 'lead' && !removedMemberIds.has(m.id));
        if (currentDbLead) {
          setRoleChanges(prev => new Map(prev).set(currentDbLead.id, 'member'));
        }
      }
    } else {
      // If promoting to lead, demote others
      if (newRole === 'lead') {
        // Demote any pending leads
        setPendingMembers(prev => prev.map(m => 
          m.role === 'lead' ? { ...m, role: 'member' } : m
        ));
        
        // Demote any existing leads (except self)
        const newRoleChanges = new Map<string, 'lead' | 'member'>();
        dbMembers.forEach(m => {
          if (!removedMemberIds.has(m.id)) {
            if (m.id === memberId) {
              newRoleChanges.set(m.id, 'lead');
            } else if (m.role === 'lead' || roleChanges.get(m.id) === 'lead') {
              newRoleChanges.set(m.id, 'member');
            } else if (roleChanges.has(m.id)) {
              newRoleChanges.set(m.id, roleChanges.get(m.id)!);
            }
          }
        });
        setRoleChanges(newRoleChanges);
      } else {
        setRoleChanges(prev => new Map(prev).set(memberId, newRole));
      }
    }
  };
  
  // Commit all changes
  const handleSave = async () => {
    if (!workstreamId || !name.trim()) return;
    
    setIsSaving(true);
    
    try {
      // 1. Update workstream name/color if changed
      if (hasNameChange || hasColorChange) {
        await updateWorkstream.mutateAsync({
          id: workstreamId,
          name: name.trim(),
          color,
        });
      }
      
      // 2. Remove members
      if (removedMemberIds.size > 0) {
        const { error: removeError } = await supabase
          .from('workstream_members')
          .delete()
          .in('id', Array.from(removedMemberIds));
        
        if (removeError) throw removeError;
      }
      
      // 3. Add new members
      if (pendingMembers.length > 0) {
        const newMembers = pendingMembers.map(m => ({
          workstream_id: workstreamId,
          user_id: m.user_id,
          role: m.role,
        }));
        
        const { error: addError } = await supabase
          .from('workstream_members')
          .insert(newMembers);
        
        if (addError) throw addError;
      }
      
      // 4. Update roles
      if (roleChanges.size > 0) {
        for (const [memberId, newRole] of roleChanges) {
          const { error: roleError } = await supabase
            .from('workstream_members')
            .update({ role: newRole })
            .eq('id', memberId);
          
          if (roleError) throw roleError;
        }
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['workstream-members', workstreamId] });
      queryClient.invalidateQueries({ queryKey: ['workstream-lead-access'] });
      queryClient.invalidateQueries({ queryKey: ['workstreams'] });
      queryClient.invalidateQueries({ queryKey: ['workstreams-summary'] });
      
      toast.success('Workstream updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Failed to save workstream:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };
  
  const isLoading = loadingWorkstream || loadingMembers;
  
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            {focusOnMembers ? 'Manage Members' : 'Edit Workstream'}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="px-6 py-5 space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="ws-name">Workstream Name</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter workstream name..."
                className="h-10"
              />
            </div>
            
            {/* Color Picker */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {WORKSTREAM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-lg transition-all',
                      color === c 
                        ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                        : 'hover:scale-105'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            
            {/* Members Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Team Members ({effectiveMembers.length})</Label>
                <Popover open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 h-8">
                      <UserPlus className="w-3.5 h-3.5" />
                      Add Member
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="end">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          placeholder="Search users (min 2 chars)..."
                          className="pl-8 h-8 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>
                    <ScrollArea className="max-h-[200px]">
                      <div className="p-1">
                        {memberSearch.trim().length < 2 ? (
                          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                            Type at least 2 characters to search
                          </div>
                        ) : searchingProfiles ? (
                          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          </div>
                        ) : searchResults.length === 0 ? (
                          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                            No matching users found
                          </div>
                        ) : (
                          searchResults.map((profile) => (
                            <button
                              key={profile.id}
                              type="button"
                              onClick={() => handleAddMember(profile)}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-muted/50 transition-colors text-left"
                            >
                              <div 
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                                style={{ backgroundColor: profile.avatar_color }}
                              >
                                {profile.initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{profile.full_name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {profile.job_title || profile.email || 'No role'}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Member List */}
              <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
                {effectiveMembers.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No members yet. Add team members to this workstream.
                  </div>
                ) : (
                  effectiveMembers.map((member) => {
                    const profile = member.profile;
                    const initials = profile?.full_name
                      ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      : '??';
                    const isLead = member.role === 'lead';
                    
                    return (
                      <div 
                        key={member.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5",
                          isLead && "bg-amber-50/50 dark:bg-amber-900/10",
                          member.isNew && "bg-emerald-50/50 dark:bg-emerald-900/10"
                        )}
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold relative"
                          style={{ backgroundColor: color }}
                        >
                          {initials}
                          {isLead && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                              <Crown className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">
                              {profile?.full_name || 'Unknown'}
                            </span>
                            {isLead && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                Lead
                              </Badge>
                            )}
                            {member.isNew && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                New
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {profile?.vendor || profile?.role || profile?.email || 'No role'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-7 px-2 text-xs gap-1",
                              isLead 
                                ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" 
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => handleToggleLead(member.id, member.role, member.isNew)}
                            title={isLead ? 'Remove as lead' : 'Make lead'}
                          >
                            <Crown className="w-3.5 h-3.5" />
                            {isLead ? 'Lead' : 'Set Lead'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveMember(member.id, member.isNew)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3 bg-muted/30">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !hasChanges || !name.trim()}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
