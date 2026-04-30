import { useState } from 'react';
import { useResourceLocations, type ResourceLocation } from '@/hooks/admin/useResourceLocations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical, MapPin, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface LinkedRecord {
  full_name: string;
}

export default function ResourceLocationsPage() {
  const { allLocations, isLoadingAll, createLocation, updateLocation, deleteLocation } = useResourceLocations();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ResourceLocation | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<ResourceLocation | null>(null);
  const [linkedRecords, setLinkedRecords] = useState<LinkedRecord[]>([]);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const checkLinkedRecords = async (locationName: string) => {
    setIsCheckingLinks(true);
    const records: LinkedRecord[] = [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('location', locationName);

    if (profiles && profiles.length > 0) {
      profiles.forEach((p: any) => {
        records.push({ full_name: p.full_name || 'Unknown User' });
      });
    }

    setLinkedRecords(records);
    setIsCheckingLinks(false);
    return records;
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    await createLocation.mutateAsync(formData);
    setFormData({ name: '' });
    setCreateModalOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingLocation || !formData.name.trim()) return;
    await updateLocation.mutateAsync({
      id: editingLocation.id,
      updates: formData,
    });
    setEditingLocation(null);
    setFormData({ name: '' });
  };

  const handleDeleteClick = async (location: ResourceLocation) => {
    setLocationToDelete(location);
    await checkLinkedRecords(location.name);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!locationToDelete) return;
    
    setIsDeleting(true);
    const records = await checkLinkedRecords(locationToDelete.name);
    if (records.length > 0) {
      setLinkedRecords(records);
      setIsDeleting(false);
      return;
    }

    await deleteLocation.mutateAsync(locationToDelete.id);
    setIsDeleting(false);
    setDeleteModalOpen(false);
    setLocationToDelete(null);
    setLinkedRecords([]);
  };

  const handleToggleActive = async (location: ResourceLocation) => {
    await updateLocation.mutateAsync({
      id: location.id,
      updates: { is_active: !location.is_active },
    });
  };

  const openEdit = (location: ResourceLocation) => {
    setEditingLocation(location);
    setFormData({ name: location.name });
  };

  if (isLoadingAll) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Resource Locations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure location values for resources.
          </p>
        </div>
        <Button 
          className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8]"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Name</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Active</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allLocations.map((location) => (
              <tr 
                key={location.id} 
                className={`border-t border-border hover:bg-muted/20 ${!location.is_active ? 'opacity-50' : ''}`}
              >
                <td className="px-4 py-3 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{location.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={location.is_active}
                    onCheckedChange={() => handleToggleActive(location)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(location)}
                      className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(location)}
                      className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {allLocations.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No locations configured. Click "Add Location" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., On-Site"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreate}
              disabled={createLocation.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {createLocation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editingLocation !== null} onOpenChange={(open) => !open && setEditingLocation(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., On-Site"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLocation(null)}>Cancel</Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateLocation.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {updateLocation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteModalOpen(false);
          setLocationToDelete(null);
          setLinkedRecords([]);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {linkedRecords.length > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Cannot Delete Location
                </>
              ) : (
                'Delete Location'
              )}
            </DialogTitle>
          </DialogHeader>
          
          {isCheckingLinks ? (
            <div className="py-8 text-center text-muted-foreground">
              Checking for linked records...
            </div>
          ) : linkedRecords.length > 0 ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                The location <strong>"{locationToDelete?.name}"</strong> cannot be deleted because it has {linkedRecords.length} linked user{linkedRecords.length > 1 ? 's' : ''}:
              </p>
              <ScrollArea className="h-[200px] rounded-md border p-3">
                <div className="space-y-2">
                  {linkedRecords.map((record, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm py-1.5 px-2 bg-muted/50 rounded">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{record.full_name}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Please reassign these users to a different location before deleting.
              </p>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong>"{locationToDelete?.name}"</strong>? This action cannot be undone.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteModalOpen(false);
              setLocationToDelete(null);
              setLinkedRecords([]);
            }}>
              {linkedRecords.length > 0 ? 'Close' : 'Cancel'}
            </Button>
            {linkedRecords.length === 0 && (
              <Button 
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
