import { useState } from 'react';
import { useResourceVendors, type ResourceVendor } from '@/hooks/admin/useResourceVendors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical, Building2, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface LinkedRecord {
  full_name: string;
}

export default function ResourceVendorsPage() {
  const { allVendors, isLoadingAll, createVendor, updateVendor, deleteVendor } = useResourceVendors();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<ResourceVendor | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<ResourceVendor | null>(null);
  const [linkedRecords, setLinkedRecords] = useState<LinkedRecord[]>([]);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const checkLinkedRecords = async (vendorName: string) => {
    setIsCheckingLinks(true);
    const records: LinkedRecord[] = [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('vendor', vendorName);

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
    await createVendor.mutateAsync(formData);
    setFormData({ name: '', description: '' });
    setCreateModalOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingVendor || !formData.name.trim()) return;
    await updateVendor.mutateAsync({
      id: editingVendor.id,
      updates: formData,
    });
    setEditingVendor(null);
    setFormData({ name: '', description: '' });
  };

  const handleDeleteClick = async (vendor: ResourceVendor) => {
    setVendorToDelete(vendor);
    await checkLinkedRecords(vendor.name);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vendorToDelete) return;
    
    setIsDeleting(true);
    const records = await checkLinkedRecords(vendorToDelete.name);
    if (records.length > 0) {
      setLinkedRecords(records);
      setIsDeleting(false);
      return;
    }

    await deleteVendor.mutateAsync(vendorToDelete.id);
    setIsDeleting(false);
    setDeleteModalOpen(false);
    setVendorToDelete(null);
    setLinkedRecords([]);
  };

  const handleToggleActive = async (vendor: ResourceVendor) => {
    await updateVendor.mutateAsync({
      id: vendor.id,
      updates: { is_active: !vendor.is_active },
    });
  };

  const openEdit = (vendor: ResourceVendor) => {
    setEditingVendor(vendor);
    setFormData({ name: vendor.name, description: vendor.description || '' });
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
          <h1 className="text-2xl font-semibold text-foreground">Resource Vendors</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure vendor values for resources.
          </p>
        </div>
        <Button 
          className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8]"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Name</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Description</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Active</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allVendors.map((vendor) => (
              <tr 
                key={vendor.id} 
                className={`border-t border-border hover:bg-muted/20 ${!vendor.is_active ? 'opacity-50' : ''}`}
              >
                <td className="px-4 py-3 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-purple-500" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{vendor.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {vendor.description || '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={vendor.is_active}
                    onCheckedChange={() => handleToggleActive(vendor)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(vendor)}
                      className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(vendor)}
                      className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {allVendors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No vendors configured. Click "Add Vendor" to create one.
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
            <DialogTitle>Add Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Thiqah"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreate}
              disabled={createVendor.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {createVendor.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editingVendor !== null} onOpenChange={(open) => !open && setEditingVendor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Thiqah"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVendor(null)}>Cancel</Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateVendor.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {updateVendor.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteModalOpen(false);
          setVendorToDelete(null);
          setLinkedRecords([]);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {linkedRecords.length > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Cannot Delete Vendor
                </>
              ) : (
                'Delete Vendor'
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
                The vendor <strong>"{vendorToDelete?.name}"</strong> cannot be deleted because it has {linkedRecords.length} linked user{linkedRecords.length > 1 ? 's' : ''}:
              </p>
              <ScrollArea className="h-[200px] rounded-md border p-3">
                <div className="space-y-2">
                  {linkedRecords.map((record, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm py-1.5 px-2 bg-muted/50 rounded">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{record.full_name}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Please reassign these users to a different vendor before deleting.
              </p>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong>"{vendorToDelete?.name}"</strong>? This action cannot be undone.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteModalOpen(false);
              setVendorToDelete(null);
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
