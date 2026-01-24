import { useState } from 'react';
import { useResourceCountries, type ResourceCountry } from '@/hooks/admin/useResourceCountries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical, Globe, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Convert ISO country code to flag emoji
const getFlagEmoji = (countryCode: string | null) => {
  if (!countryCode || countryCode.length !== 2) return null;
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

interface LinkedRecord {
  full_name: string;
}

export default function ResourceCountriesPage() {
  const { allCountries, isLoadingAll, createCountry, updateCountry, deleteCountry } = useResourceCountries();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<ResourceCountry | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', flag_svg: '' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [countryToDelete, setCountryToDelete] = useState<ResourceCountry | null>(null);
  const [linkedRecords, setLinkedRecords] = useState<LinkedRecord[]>([]);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const checkLinkedRecords = async (countryName: string) => {
    setIsCheckingLinks(true);
    const records: LinkedRecord[] = [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('country', countryName);

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
    await createCountry.mutateAsync({
      name: formData.name,
      code: formData.code || undefined,
      flag_svg: formData.flag_svg || undefined,
    });
    setFormData({ name: '', code: '', flag_svg: '' });
    setCreateModalOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingCountry || !formData.name.trim()) return;
    await updateCountry.mutateAsync({
      id: editingCountry.id,
      updates: {
        name: formData.name,
        code: formData.code || null,
        flag_svg: formData.flag_svg || null,
      },
    });
    setEditingCountry(null);
    setFormData({ name: '', code: '', flag_svg: '' });
  };

  const handleDeleteClick = async (country: ResourceCountry) => {
    setCountryToDelete(country);
    await checkLinkedRecords(country.name);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!countryToDelete) return;
    
    setIsDeleting(true);
    const records = await checkLinkedRecords(countryToDelete.name);
    if (records.length > 0) {
      setLinkedRecords(records);
      setIsDeleting(false);
      return;
    }

    await deleteCountry.mutateAsync(countryToDelete.id);
    setIsDeleting(false);
    setDeleteModalOpen(false);
    setCountryToDelete(null);
    setLinkedRecords([]);
  };

  const handleToggleActive = async (country: ResourceCountry) => {
    await updateCountry.mutateAsync({
      id: country.id,
      updates: { is_active: !country.is_active },
    });
  };

  const openEdit = (country: ResourceCountry) => {
    setEditingCountry(country);
    setFormData({ name: country.name, code: country.code || '', flag_svg: country.flag_svg || '' });
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
          <h1 className="text-2xl font-semibold text-foreground">Resource Countries</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure country values for resources.
          </p>
        </div>
        <Button 
          className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8]"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Country
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Flag</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Name</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Code</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Active</th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allCountries.map((country) => (
              <tr 
                key={country.id} 
                className={`border-t border-border hover:bg-muted/20 ${!country.is_active ? 'opacity-50' : ''}`}
              >
                <td className="px-4 py-3 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </td>
                <td className="px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center overflow-hidden">
                    {country.flag_svg ? (
                      <img 
                        src={country.flag_svg} 
                        alt={`${country.name} flag`} 
                        className="w-6 h-4 object-cover rounded-sm"
                      />
                    ) : getFlagEmoji(country.code) ? (
                      <span className="text-xl">{getFlagEmoji(country.code)}</span>
                    ) : (
                      <Globe className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-foreground">{country.name}</span>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                  {country.code || '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={country.is_active}
                    onCheckedChange={() => handleToggleActive(country)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(country)}
                      className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(country)}
                      className="w-8 h-8 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {allCountries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No countries configured. Click "Add Country" to create one.
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
            <DialogTitle>Add Country</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Saudi Arabia"
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData(f => ({ ...f, code: e.target.value }))}
                placeholder="e.g., SA"
              />
            </div>
            <div className="space-y-2">
              <Label>Flag SVG URL</Label>
              <Input
                value={formData.flag_svg}
                onChange={(e) => setFormData(f => ({ ...f, flag_svg: e.target.value }))}
                placeholder="e.g., https://flagcdn.com/sa.svg"
              />
              {formData.flag_svg && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Preview:</span>
                  <img 
                    src={formData.flag_svg} 
                    alt="Flag preview" 
                    className="h-5 w-8 object-cover rounded-sm border"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreate}
              disabled={createCountry.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {createCountry.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editingCountry !== null} onOpenChange={(open) => !open && setEditingCountry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Country</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Saudi Arabia"
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData(f => ({ ...f, code: e.target.value }))}
                placeholder="e.g., SA"
              />
            </div>
            <div className="space-y-2">
              <Label>Flag SVG URL</Label>
              <Input
                value={formData.flag_svg}
                onChange={(e) => setFormData(f => ({ ...f, flag_svg: e.target.value }))}
                placeholder="e.g., https://flagcdn.com/sa.svg"
              />
              {formData.flag_svg && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Preview:</span>
                  <img 
                    src={formData.flag_svg} 
                    alt="Flag preview" 
                    className="h-5 w-8 object-cover rounded-sm border"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCountry(null)}>Cancel</Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateCountry.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {updateCountry.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteModalOpen(false);
          setCountryToDelete(null);
          setLinkedRecords([]);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {linkedRecords.length > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Cannot Delete Country
                </>
              ) : (
                'Delete Country'
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
                The country <strong>"{countryToDelete?.name}"</strong> cannot be deleted because it has {linkedRecords.length} linked user{linkedRecords.length > 1 ? 's' : ''}:
              </p>
              <ScrollArea className="h-[200px] rounded-md border p-3">
                <div className="space-y-2">
                  {linkedRecords.map((record, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm py-1.5 px-2 bg-muted/50 rounded">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{record.full_name}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Please reassign these users to a different country before deleting.
              </p>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong>"{countryToDelete?.name}"</strong>? This action cannot be undone.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteModalOpen(false);
              setCountryToDelete(null);
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
