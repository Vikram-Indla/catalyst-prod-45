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
  Trash2,
  Edit2,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { PlannerTeam } from '../types';
import { catalystToast } from '@/lib/catalystToast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { WorkstreamMembersSection } from './WorkstreamMembersSection';
import { CreateWorkstreamModal } from './CreateWorkstreamModal';

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
  leadId: string | null;
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
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<WorkstreamFormData>({
    name: '',
    description: '',
    color: '#2563eb',
    leadId: null,
  });

  const filteredWorkstreams = useMemo(() => {
    if (!searchQuery.trim()) return workstreams;
    const query = searchQuery.toLowerCase();
    return workstreams.filter(ws => 
      ws.name.toLowerCase().includes(query) ||
      ws.shortName.toLowerCase().includes(query)
    );
  }, [workstreams, searchQuery]);

  const resetForm = () => {
    setFormData({ name: '', description: '', color: '#2563eb', leadId: null });
  };

  const handleSaveWorkstream = async () => {
    if (!selectedWorkstream || !formData.name.trim()) {
      catalystToast.warning('Please enter a workstream name');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: formData.name.trim(), description: formData.description || null, lead_id: formData.leadId })
        .eq('id', selectedWorkstream.id);
      if (error) throw error;
      catalystToast.success('Workstream updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] });
      setIsEditMode(false);
      setSelectedWorkstream(prev => prev ? { ...prev, name: formData.name.trim(), description: formData.description || undefined, leadId: formData.leadId || undefined } : null);
    } catch (err) {
      console.error('Error updating workstream:', err);
      catalystToast.error('Failed to update workstream');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkstream = async (ws: PlannerTeam) => {
    try {
      const { error } = await supabase.from('teams').update({ is_active: false }).eq('id', ws.id);
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
    setFormData({ name: ws.name, description: ws.description || '', color: ws.color, leadId: ws.leadId || null });
    setIsEditMode(false);
  };

  const renderWorkstreamsList = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Workstreams</h1>
            <p className="text-sm text-text-muted mt-0.5">Organize your workspace into workstreams</p>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />Create Workstream
          </Button>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search workstreams..." className="pl-10 h-10" />
        </div>
        {workstreamsLoading ? (
          <div className="text-center py-12 text-text-muted">Loading workstreams...</div>
        ) : filteredWorkstreams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted">No workstreams found</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsCreateModalOpen(true)}>Create your first workstream</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkstreams.map((ws) => (
              <div key={ws.id} onClick={() => handleSelectWorkstream(ws)} className={cn("p-4 bg-surface-0 rounded-lg border border-border cursor-pointer", "hover:border-blue-300 hover:shadow-sm transition-all")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium" style={{ backgroundColor: ws.color }}>{ws.emoji || ws.shortName.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-text-primary truncate">{ws.name}</h3>
                    <p className="text-sm text-text-muted">{ws.shortName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-muted"><Users className="w-4 h-4" /><span>{ws.memberCount} members</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderWorkstreamDetail = () => {
    if (!selectedWorkstream) return null;
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <button onClick={() => setSelectedWorkstream(null)} className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors">
            <ChevronLeft className="w-4 h-4" />Back to Workstreams
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-medium" style={{ backgroundColor: selectedWorkstream.color }}>{selectedWorkstream.emoji || selectedWorkstream.shortName.charAt(0)}</div>
              <div>
                <h1 className="text-xl font-semibold text-text-primary">{selectedWorkstream.name}</h1>
                <p className="text-sm text-text-muted">{selectedWorkstream.shortName} • {selectedWorkstream.memberCount} members</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditMode(!isEditMode)}><Edit2 className="w-4 h-4 mr-2" />{isEditMode ? 'Cancel' : 'Edit'}</Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmWorkstream(selectedWorkstream)} className="text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="bg-surface-0 rounded-lg border border-border p-6 space-y-6">
            {isEditMode ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Workstream Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter workstream name..." />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Enter workstream description..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" />Workstream Lead</Label>
                  <div className="flex flex-wrap gap-2">
                    {users.slice(0, 10).map((user) => (
                      <button key={user.id} type="button" onClick={() => setFormData(prev => ({ ...prev, leadId: prev.leadId === user.id ? null : user.id }))} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-sm", formData.leadId === user.id ? "bg-amber-50 border-amber-300" : "border-border hover:border-amber-300 hover:bg-amber-50/50")}>
                        {formData.leadId === user.id && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                        <span>{user.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setIsEditMode(false)} disabled={isSaving}>Cancel</Button>
                  <Button onClick={handleSaveWorkstream} disabled={isSaving || !formData.name.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">{isSaving ? 'Saving...' : 'Save Changes'}</Button>
                </div>
              </>
            ) : (
              <>
                <div><Label className="text-sm font-medium text-text-muted">Description</Label><p className="mt-1 text-text-primary">{selectedWorkstream.description || 'No description provided'}</p></div>
                <div><Label className="text-sm font-medium text-text-muted">Workstream Lead</Label><p className="mt-1 text-text-primary">{selectedWorkstream.leadId ? users.find(u => u.id === selectedWorkstream.leadId)?.name || 'Unknown' : 'Not assigned'}</p></div>
                <div><Label className="text-sm font-medium text-text-muted">Color</Label><div className="flex items-center gap-2 mt-1"><div className="w-6 h-6 rounded-full" style={{ backgroundColor: selectedWorkstream.color }} /><span className="text-text-primary">{COLOR_OPTIONS.find(c => c.value === selectedWorkstream.color)?.label || 'Custom'}</span></div></div>
              </>
            )}
          </div>
          <WorkstreamMembersSection workstream={selectedWorkstream} users={users} onMembersChange={() => { queryClient.invalidateQueries({ queryKey: ['planner-workstreams'] }); }} />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {selectedWorkstream ? renderWorkstreamDetail() : renderWorkstreamsList()}
      <CreateWorkstreamModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} users={users} />
      <AlertDialog open={!!deleteConfirmWorkstream} onOpenChange={() => setDeleteConfirmWorkstream(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Workstream</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{deleteConfirmWorkstream?.name}"? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteConfirmWorkstream && handleDeleteWorkstream(deleteConfirmWorkstream)} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
