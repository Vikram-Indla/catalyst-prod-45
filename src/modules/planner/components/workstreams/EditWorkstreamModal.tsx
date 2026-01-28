// ============================================================
// EDIT WORKSTREAM MODAL
// Rename workstream, change color, manage members
// Members are linked to profiles (APPROVED users only)
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2, UserPlus, Trash2, Search, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  useWorkstreamDetails,
  useWorkstreamMembers,
  useUpdateWorkstream,
  useAddWorkstreamMember,
  useRemoveWorkstreamMember,
} from './useWorkstreamMutations';
import { useSearchProfiles } from './useSearchProfiles';

interface EditWorkstreamModalProps {
  workstreamId: string | null;
  open: boolean;
  onClose: () => void;
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

export function EditWorkstreamModal({ workstreamId, open, onClose }: EditWorkstreamModalProps) {
  const { data: workstream, isLoading: loadingWorkstream } = useWorkstreamDetails(workstreamId);
  const { data: members = [], isLoading: loadingMembers } = useWorkstreamMembers(workstreamId);
  
  const updateWorkstream = useUpdateWorkstream();
  const addMember = useAddWorkstreamMember();
  const removeMember = useRemoveWorkstreamMember();
  
  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [memberSearch, setMemberSearch] = useState('');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  
  // Get existing member user IDs to exclude from search
  const existingMemberIds = useMemo(() => members.map(m => m.user_id), [members]);
  
  // Search profiles (only when popover is open and there's a search term)
  const { data: searchResults = [], isLoading: searchingProfiles } = useSearchProfiles(
    addMemberOpen ? memberSearch : '', 
    existingMemberIds
  );
  
  // Sync form state when workstream loads
  useEffect(() => {
    if (workstream) {
      setName(workstream.name || '');
      setColor(workstream.color || '#3b82f6');
    }
  }, [workstream]);
  
  const hasChanges = workstream && (name !== workstream.name || color !== workstream.color);
  
  const handleSave = async () => {
    if (!workstreamId || !name.trim()) return;
    
    await updateWorkstream.mutateAsync({
      id: workstreamId,
      name: name.trim(),
      color,
    });
  };
  
  const handleAddMember = async (userId: string) => {
    if (!workstreamId) return;
    await addMember.mutateAsync({ workstreamId, userId });
    setAddMemberOpen(false);
    setMemberSearch('');
  };
  
  const handleRemoveMember = async (memberId: string) => {
    if (!workstreamId) return;
    await removeMember.mutateAsync({ memberId, workstreamId });
  };
  
  const isLoading = loadingWorkstream || loadingMembers;
  const isSaving = updateWorkstream.isPending;
  
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold">Edit Workstream</DialogTitle>
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
                <Label>Team Members ({members.length})</Label>
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
                              onClick={() => handleAddMember(profile.id)}
                              disabled={addMember.isPending}
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
                {members.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No members yet. Add team members to this workstream.
                  </div>
                ) : (
                  members.map((member) => {
                    const profile = member.profile;
                    const initials = profile?.full_name
                      ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      : '??';
                    
                    return (
                      <div 
                        key={member.id}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                          style={{ backgroundColor: color }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {profile?.full_name || 'Unknown'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {profile?.vendor || profile?.role || profile?.email || 'No role'}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removeMember.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
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