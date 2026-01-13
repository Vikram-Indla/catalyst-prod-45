// ============================================================
// PLANNER SETTINGS - TEAMS MANAGEMENT
// Settings page with teams list, detail view, and create modal
// ============================================================

import { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  ChevronLeft, 
  Users, 
  Settings, 
  Trash2,
  Edit2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePlannerTeams } from '../hooks/usePlannerTeams';
import { usePlannerUsers } from '../hooks/usePlannerUsers';
import type { PlannerTeam, PlannerUser } from '../types';
import { catalystToast } from '@/lib/catalystToast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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

interface TeamFormData {
  name: string;
  description: string;
  color: string;
  leadId: string;
  memberIds: string[];
}

export function PlannerSettings() {
  const queryClient = useQueryClient();
  const { data: teams = [], isLoading: teamsLoading } = usePlannerTeams();
  const { data: users = [] } = usePlannerUsers();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<PlannerTeam | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState<PlannerTeam | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<TeamFormData>({
    name: '',
    description: '',
    color: '#2563eb',
    leadId: '',
    memberIds: [],
  });

  // Filter teams by search
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const query = searchQuery.toLowerCase();
    return teams.filter(team => 
      team.name.toLowerCase().includes(query) ||
      team.shortName.toLowerCase().includes(query)
    );
  }, [teams, searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#2563eb',
      leadId: '',
      memberIds: [],
    });
  };

  const handleCreateTeam = async () => {
    if (!formData.name.trim()) {
      catalystToast.warning('Please enter a team name');
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .insert({
          name: formData.name.trim(),
          short_name: formData.name.trim().slice(0, 3).toUpperCase(),
          description: formData.description || null,
          is_active: true,
        });

      if (error) throw error;

      catalystToast.success('Team created successfully!');
      queryClient.invalidateQueries({ queryKey: ['planner-teams'] });
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error creating team:', err);
      catalystToast.error('Failed to create team');
    }
  };

  const handleDeleteTeam = async (team: PlannerTeam) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ is_active: false })
        .eq('id', team.id);

      if (error) throw error;

      catalystToast.success('Team deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['planner-teams'] });
      setSelectedTeam(null);
      setDeleteConfirmTeam(null);
    } catch (err) {
      console.error('Error deleting team:', err);
      catalystToast.error('Failed to delete team');
    }
  };

  const handleSelectTeam = (team: PlannerTeam) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      color: team.color,
      leadId: team.leadId || '',
      memberIds: [],
    });
    setIsEditMode(false);
  };

  const handleAddMember = (userId: string) => {
    if (userId && !formData.memberIds.includes(userId)) {
      setFormData(prev => ({
        ...prev,
        memberIds: [...prev.memberIds, userId]
      }));
    }
  };

  const handleRemoveMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      memberIds: prev.memberIds.filter(id => id !== userId)
    }));
  };

  const availableUsers = users.filter(u => !formData.memberIds.includes(u.id));

  // Team List View
  const renderTeamsList = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Teams</h1>
            <p className="text-sm text-text-muted mt-0.5">Organize your workspace into teams</p>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams..."
            className="pl-10 h-10"
          />
        </div>

        {/* Teams Grid */}
        {teamsLoading ? (
          <div className="text-center py-12 text-text-muted">Loading teams...</div>
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted">No teams found</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create your first team
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeams.map((team) => (
              <div
                key={team.id}
                onClick={() => handleSelectTeam(team)}
                className={cn(
                  "p-4 bg-surface-0 rounded-lg border border-border cursor-pointer",
                  "hover:border-blue-300 hover:shadow-sm transition-all"
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.emoji || team.shortName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-text-primary truncate">{team.name}</h3>
                    <p className="text-sm text-text-muted">{team.shortName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Users className="w-4 h-4" />
                  <span>{team.memberCount} members</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Team Detail View
  const renderTeamDetail = () => {
    if (!selectedTeam) return null;

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setSelectedTeam(null)}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Teams
          </button>

          {/* Team Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-medium"
                style={{ backgroundColor: selectedTeam.color }}
              >
                {selectedTeam.emoji || selectedTeam.shortName.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-text-primary">{selectedTeam.name}</h1>
                <p className="text-sm text-text-muted">{selectedTeam.shortName} • {selectedTeam.memberCount} members</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {isEditMode ? 'Cancel' : 'Edit'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmTeam(selectedTeam)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Team Info Card */}
          <div className="bg-surface-0 rounded-lg border border-border p-6 space-y-6">
            {isEditMode ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Team Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter team name..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter team description..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Team Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color: c.value }))}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all",
                          formData.color === c.value
                            ? "ring-2 ring-offset-2 ring-blue-500"
                            : "hover:scale-110"
                        )}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setIsEditMode(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Save Changes
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-sm font-medium text-text-muted">Description</Label>
                  <p className="mt-1 text-text-primary">
                    {selectedTeam.description || 'No description provided'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-text-muted">Team Lead</Label>
                  <p className="mt-1 text-text-primary">
                    {selectedTeam.leadId ? 
                      users.find(u => u.id === selectedTeam.leadId)?.name || 'Unknown' 
                      : 'Not assigned'
                    }
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-text-muted">Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: selectedTeam.color }}
                    />
                    <span className="text-text-primary">
                      {COLOR_OPTIONS.find(c => c.value === selectedTeam.color)?.label || 'Custom'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Members Section */}
          <div className="bg-surface-0 rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-text-primary">Team Members</h2>
              <Badge variant="secondary">{selectedTeam.memberCount} members</Badge>
            </div>
            <p className="text-sm text-text-muted">
              Member management coming soon. Use the Admin panel to manage team members.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {selectedTeam ? renderTeamDetail() : renderTeamsList()}

      {/* Create Team Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create New Team</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            {/* Team Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Team Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter team name..."
                className="h-10"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter team description..."
                rows={3}
              />
            </div>

            {/* Team Color */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Team Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: c.value }))}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      formData.color === c.value
                        ? "ring-2 ring-offset-2 ring-blue-500"
                        : "hover:scale-110"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Team Lead */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Team Lead</Label>
              <Select 
                value={formData.leadId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, leadId: value }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select team lead..." />
                </SelectTrigger>
                <SelectContent 
                  position="popper" 
                  sideOffset={4}
                  className="bg-popover z-[9999]"
                  align="start"
                >
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {user.initials}
                        </div>
                        <span>{user.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Add Members */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add Members</Label>
              
              {/* Selected members */}
              {formData.memberIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.memberIds.map((id) => {
                    const user = users.find(u => u.id === id);
                    if (!user) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: formData.color }}
                        >
                          {user.initials}
                        </div>
                        <span>{user.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add member dropdown */}
              {availableUsers.length > 0 && (
                <Select onValueChange={handleAddMember} value="">
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="+ Add member" />
                  </SelectTrigger>
                  <SelectContent 
                    position="popper" 
                    sideOffset={4}
                    className="bg-popover z-[9999]"
                    align="start"
                  >
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {user.initials}
                          </div>
                          <span>{user.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTeam}
                disabled={!formData.name.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!deleteConfirmTeam} 
        onOpenChange={() => setDeleteConfirmTeam(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmTeam?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmTeam && handleDeleteTeam(deleteConfirmTeam)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
