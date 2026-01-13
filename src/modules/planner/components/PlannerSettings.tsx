// ============================================================
// PLANNER SETTINGS - WORKSTREAMS MANAGEMENT
// Settings page with workstreams list, detail view, and create modal
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
import { usePlannerWorkstreams } from '../hooks/usePlannerWorkstreams';
import { usePlannerUsers } from '../hooks/usePlannerUsers';
import type { PlannerTeam, PlannerUser } from '../types';
import { catalystToast } from '@/lib/catalystToast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { WorkstreamMembersSection } from './WorkstreamMembersSection';

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

interface WorkstreamFormData {
  name: string;
  description: string;
  color: string;
  leadId: string;
  memberIds: string[];
}

export function PlannerSettings() {
  const queryClient = useQueryClient();
  const { data: workstreams = [], isLoading: workstreamsLoading } = usePlannerWorkstreams();
  const { data: users = [] } = usePlannerUsers();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkstream, setSelectedWorkstream] = useState<PlannerTeam | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteConfirmWorkstream, setDeleteConfirmWorkstream] = useState<PlannerTeam | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<WorkstreamFormData>({
    name: '',
    description: '',
    color: '#2563eb',
    leadId: '',
    memberIds: [],
  });

  // Filter workstreams by search
  const filteredWorkstreams = useMemo(() => {
    if (!searchQuery.trim()) return workstreams;
    const query = searchQuery.toLowerCase();
    return workstreams.filter(ws => 
      ws.name.toLowerCase().includes(query) ||
      ws.shortName.toLowerCase().includes(query)
    );
  }, [workstreams, searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#2563eb',
      leadId: '',
      memberIds: [],
    });
  };

  const handleCreateWorkstream = async () => {
    if (!formData.name.trim()) {
      catalystToast.warning('Please enter a workstream name');
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

      catalystToast.success('Workstream created successfully!');
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error creating workstream:', err);
      catalystToast.error('Failed to create workstream');
    }
  };

  const handleDeleteWorkstream = async (ws: PlannerTeam) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ is_active: false })
        .eq('id', ws.id);

      if (error) throw error;

      catalystToast.success('Workstream deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      setSelectedWorkstream(null);
      setDeleteConfirmWorkstream(null);
    } catch (err) {
      console.error('Error deleting workstream:', err);
      catalystToast.error('Failed to delete workstream');
    }
  };

  const handleSelectWorkstream = (ws: PlannerTeam) => {
    setSelectedWorkstream(ws);
    setFormData({
      name: ws.name,
      description: ws.description || '',
      color: ws.color,
      leadId: ws.leadId || '',
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

  // Workstream List View
  const renderWorkstreamsList = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Workstreams</h1>
            <p className="text-sm text-text-muted mt-0.5">Organize your workspace into workstreams</p>
          </div>
          <Button 
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Workstream
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workstreams..."
            className="pl-10 h-10"
          />
        </div>

        {/* Workstreams Grid */}
        {workstreamsLoading ? (
          <div className="text-center py-12 text-text-muted">Loading workstreams...</div>
        ) : filteredWorkstreams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted">No workstreams found</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create your first workstream
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkstreams.map((ws) => (
              <div
                key={ws.id}
                onClick={() => handleSelectWorkstream(ws)}
                className={cn(
                  "p-4 bg-surface-0 rounded-lg border border-border cursor-pointer",
                  "hover:border-blue-300 hover:shadow-sm transition-all"
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: ws.color }}
                  >
                    {ws.emoji || ws.shortName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-text-primary truncate">{ws.name}</h3>
                    <p className="text-sm text-text-muted">{ws.shortName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Users className="w-4 h-4" />
                  <span>{ws.memberCount} members</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Workstream Detail View
  const renderWorkstreamDetail = () => {
    if (!selectedWorkstream) return null;

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setSelectedWorkstream(null)}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Workstreams
          </button>

          {/* Workstream Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-medium"
                style={{ backgroundColor: selectedWorkstream.color }}
              >
                {selectedWorkstream.emoji || selectedWorkstream.shortName.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-text-primary">{selectedWorkstream.name}</h1>
                <p className="text-sm text-text-muted">{selectedWorkstream.shortName} • {selectedWorkstream.memberCount} members</p>
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
                onClick={() => setDeleteConfirmWorkstream(selectedWorkstream)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Workstream Info Card */}
          <div className="bg-surface-0 rounded-lg border border-border p-6 space-y-6">
            {isEditMode ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Workstream Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter workstream name..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter workstream description..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Workstream Color</Label>
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
                    {selectedWorkstream.description || 'No description provided'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-text-muted">Workstream Lead</Label>
                  <p className="mt-1 text-text-primary">
                    {selectedWorkstream.leadId ? 
                      users.find(u => u.id === selectedWorkstream.leadId)?.name || 'Unknown' 
                      : 'Not assigned'
                    }
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-text-muted">Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: selectedWorkstream.color }}
                    />
                    <span className="text-text-primary">
                      {COLOR_OPTIONS.find(c => c.value === selectedWorkstream.color)?.label || 'Custom'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Members Section */}
          <WorkstreamMembersSection 
            workstream={selectedWorkstream} 
            users={users} 
            onMembersChange={() => {
              queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {selectedWorkstream ? renderWorkstreamDetail() : renderWorkstreamsList()}

      {/* Create Workstream Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create New Workstream</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            {/* Workstream Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Workstream Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                <Select 
                  key={`add-member-${formData.memberIds.length}`}
                  onValueChange={handleAddMember} 
                  value=""
                >
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
                onClick={handleCreateWorkstream}
                disabled={!formData.name.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create Workstream
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!deleteConfirmWorkstream} 
        onOpenChange={() => setDeleteConfirmWorkstream(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workstream</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmWorkstream?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmWorkstream && handleDeleteWorkstream(deleteConfirmWorkstream)}
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
