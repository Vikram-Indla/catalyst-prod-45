// ============================================================
// CREATE WORKSTREAM MODAL - ENTERPRISE GRADE
// Multi-select interface with workstream lead and member selection
// ============================================================

import { useState, useMemo } from 'react';
import { X, Users, Check, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { useQueryClient } from '@tanstack/react-query';
import type { PlannerUser } from '../types';
import { AVATAR_COLORS } from '../types';

interface CreateWorkstreamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: PlannerUser[];
}

const COLOR_OPTIONS = [
  { value: '#2563eb', label: 'Blue' },
  { value: '#0d9488', label: 'Teal' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#059669', label: 'Green' },
  { value: '#d97706', label: 'Orange' },
  { value: '#dc2626', label: 'Red' },
  { value: '#4f46e5', label: 'Indigo' },
  { value: '#6b7280', label: 'Gray' },
];

// Generate consistent avatar color based on user ID
function getAvatarColor(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function CreateWorkstreamModal({
  open,
  onOpenChange,
  users,
}: CreateWorkstreamModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(u => 
      u.name.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Selected users info (including lead)
  const selectedUsers = useMemo(() => {
    return users.filter(u => selectedUserIds.includes(u.id));
  }, [users, selectedUserIds]);

  // Get lead user info
  const leadUser = useMemo(() => {
    return leadId ? users.find(u => u.id === leadId) : null;
  }, [users, leadId]);

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSetLead = (userId: string) => {
    if (leadId === userId) {
      setLeadId(null);
    } else {
      setLeadId(userId);
      // Auto-add lead to members if not already
      if (!selectedUserIds.includes(userId)) {
        setSelectedUserIds(prev => [...prev, userId]);
      }
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUserIds(prev => prev.filter(id => id !== userId));
    // Remove lead if they're being removed from members
    if (leadId === userId) {
      setLeadId(null);
    }
  };

  const resetForm = () => {
    setName('');
    setColor('#2563eb');
    setLeadId(null);
    setSelectedUserIds([]);
    setSearchQuery('');
  };

  const handleCreateWorkstream = async () => {
    if (!name.trim()) {
      catalystToast.warning('Please enter a workstream name');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create workstream with lead
      const { data: workstream, error: workstreamError } = await supabase
        .from('teams')
        .insert({
          name: name.trim(),
          short_name: name.trim().slice(0, 3).toUpperCase(),
          is_active: true,
          lead_id: leadId,
        })
        .select()
        .single();

      if (workstreamError) throw workstreamError;

      // Add members if any selected
      if (selectedUserIds.length > 0 && workstream) {
        const { error: membersError } = await supabase
          .from('team_members')
          .insert(
            selectedUserIds.map(userId => ({
              team_id: workstream.id,
              user_id: userId,
            }))
          );

        if (membersError) {
          console.error('Error adding members:', membersError);
          catalystToast.warning('Workstream created but some members could not be added');
        }
      }

      catalystToast.success('Workstream created successfully!');
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error('Error creating workstream:', err);
      catalystToast.error('Failed to create workstream');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) resetForm();
    }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col bg-background p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold">Create New Workstream</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-4 space-y-5">
            {/* Workstream Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Workstream Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter workstream name..."
                className="h-10"
                autoFocus
              />
            </div>

            {/* Workstream Color */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Workstream Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all relative",
                      color === c.value
                        ? "ring-2 ring-offset-2 ring-blue-500"
                        : "hover:scale-110"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  >
                    {color === c.value && (
                      <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Workstream Lead */}
            {leadUser && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  Workstream Lead
                </Label>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback 
                      className="text-xs text-white font-medium"
                      style={{ backgroundColor: getAvatarColor(leadUser.id) }}
                    >
                      {leadUser.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{leadUser.name}</p>
                    {leadUser.role && (
                      <p className="text-xs text-muted-foreground">{leadUser.role}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setLeadId(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Selected Members Preview */}
            {selectedUsers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Selected Members ({selectedUsers.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm group",
                        leadId === user.id 
                          ? "bg-amber-100 border border-amber-300" 
                          : "bg-muted"
                      )}
                    >
                      {leadId === user.id && (
                        <Crown className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      <Avatar className="w-5 h-5">
                        <AvatarFallback 
                          className="text-[10px] text-white font-medium"
                          style={{ backgroundColor: getAvatarColor(user.id) }}
                        >
                          {user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-[120px] truncate">{user.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(user.id)}
                        className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Member Selection Section */}
          <div className="flex-1 flex flex-col border-t border-border">
            <div className="px-6 py-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Add Members</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedUserIds.length} of {users.length} selected
                </span>
              </div>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search members..."
                className="h-9"
              />
              <p className="text-xs text-muted-foreground mt-2">
                💡 Click the crown icon to set a user as workstream lead
              </p>
            </div>

            <ScrollArea className="flex-1 px-6">
              <div className="py-2 space-y-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No members found</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    const isLead = leadId === user.id;
                    return (
                      <div
                        key={user.id}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                          isSelected
                            ? isLead
                              ? "bg-amber-50 border border-amber-200"
                              : "bg-blue-50 border border-blue-200"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleUser(user.id)}
                          className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
                            isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "border-gray-300"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback 
                            className="text-xs text-white font-medium"
                            style={{ backgroundColor: getAvatarColor(user.id) }}
                          >
                            {user.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.name}
                            {isLead && (
                              <span className="ml-2 text-xs text-amber-600 font-normal">(Lead)</span>
                            )}
                          </p>
                          {user.role && (
                            <p className="text-xs text-muted-foreground truncate">
                              {user.role}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSetLead(user.id)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            isLead
                              ? "bg-amber-100 text-amber-600"
                              : "text-gray-400 hover:text-amber-500 hover:bg-amber-50"
                          )}
                          title={isLead ? "Remove as lead" : "Set as lead"}
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-muted/20">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateWorkstream}
            disabled={!name.trim() || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? 'Creating...' : 'Create Workstream'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
