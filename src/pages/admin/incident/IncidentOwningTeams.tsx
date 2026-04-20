import { useState } from 'react';
import { Plus, Pencil, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lozenge } from '@/components/ads';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { 
  useAllIncidentTeams, 
  useCreateIncidentTeam, 
  useUpdateIncidentTeam,
  useDeactivateIncidentTeam,
  IncidentTeam 
} from '@/hooks/useIncidentTeams';
import { toast } from 'sonner';

export default function IncidentOwningTeams() {
  const { data: teams = [], isLoading } = useAllIncidentTeams();
  const createTeam = useCreateIncidentTeam();
  const updateTeam = useUpdateIncidentTeam();
  const deactivateTeam = useDeactivateIncidentTeam();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<IncidentTeam | null>(null);
  const [deleteTeam, setDeleteTeam] = useState<IncidentTeam | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  const filteredTeams = teams.filter(
    (t) => t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (team?: IncidentTeam) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name,
        description: team.description || '',
        is_active: team.is_active,
      });
    } else {
      setEditingTeam(null);
      setFormData({ name: '', description: '', is_active: true });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTeam(null);
    setFormData({ name: '', description: '', is_active: true });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    try {
      if (editingTeam) {
        await updateTeam.mutateAsync({
          id: editingTeam.id,
          data: {
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            is_active: formData.is_active,
          },
        });
        toast.success('Owning team updated');
      } else {
        await createTeam.mutateAsync({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        });
        toast.success('Owning team created');
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save owning team');
    }
  };

  const handleDelete = async () => {
    if (!deleteTeam) return;
    try {
      await deactivateTeam.mutateAsync(deleteTeam.id);
      toast.success('Owning team deactivated');
      setDeleteTeam(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate owning team');
    }
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Owning Teams</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure teams that can own incidents (e.g., Delivery, Operations, Business)
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-brand-primary hover:bg-brand-primary-hover text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Team
          </Button>
        </div>

        {/* Info */}
        <div className="p-4 rounded-lg border bg-muted/30">
          <h3 className="font-medium mb-2">Default Teams</h3>
          <p className="text-sm text-muted-foreground">
            The default owning team for new incidents is <strong>Delivery</strong>. You can configure additional teams below.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[80px]">Order</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {search ? 'No matching teams found' : 'No owning teams configured'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeams.map((team) => (
                  <TableRow key={team.id} className={!team.is_active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {team.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Lozenge appearance={team.is_active ? 'inprogress' : 'default'}>
                        {team.is_active ? 'Active' : 'Inactive'}
                      </Lozenge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {team.sort_order}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(team)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTeam(team)}
                        disabled={!team.is_active}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTeam ? 'Edit Owning Team' : 'Add Owning Team'}
              </DialogTitle>
              <DialogDescription>
                {editingTeam
                  ? 'Update the team details below.'
                  : 'Enter the details for the new owning team.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Delivery"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              {editingTeam && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Active</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name.trim() || createTeam.isPending || updateTeam.isPending}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white"
              >
                {editingTeam ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTeam} onOpenChange={() => setDeleteTeam(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Owning Team?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate "{deleteTeam?.name}". The team will no longer be available for selection but existing incidents will retain their assignment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminGuard>
  );
}
