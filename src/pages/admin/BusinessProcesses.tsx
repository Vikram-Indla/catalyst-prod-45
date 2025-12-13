import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { Label } from '@/components/ui/label';
import {
  useAllBusinessProcesses,
  useCreateBusinessProcess,
  useUpdateBusinessProcess,
  useDeleteBusinessProcess,
  BusinessProcess,
} from '@/hooks/useBusinessProcesses';

export default function BusinessProcesses() {
  const { data: processes = [], isLoading } = useAllBusinessProcesses();
  const createMutation = useCreateBusinessProcess();
  const updateMutation = useUpdateBusinessProcess();
  const deleteMutation = useDeleteBusinessProcess();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<BusinessProcess | null>(null);
  const [formData, setFormData] = useState({ name_en: '', name_ar: '', active: true });

  const filteredProcesses = processes.filter(
    (p) =>
      p.name_en.toLowerCase().includes(search.toLowerCase()) ||
      p.name_ar?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (process?: BusinessProcess) => {
    if (process) {
      setEditingProcess(process);
      setFormData({
        name_en: process.name_en,
        name_ar: process.name_ar || '',
        active: process.active,
      });
    } else {
      setEditingProcess(null);
      setFormData({ name_en: '', name_ar: '', active: true });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProcess(null);
    setFormData({ name_en: '', name_ar: '', active: true });
  };

  const handleSubmit = async () => {
    if (!formData.name_en.trim()) return;

    if (editingProcess) {
      await updateMutation.mutateAsync({
        id: editingProcess.id,
        name_en: formData.name_en.trim(),
        name_ar: formData.name_ar.trim() || undefined,
        active: formData.active,
      });
    } else {
      await createMutation.mutateAsync({
        name_en: formData.name_en.trim(),
        name_ar: formData.name_ar.trim() || undefined,
        active: formData.active,
      });
    }
    handleCloseDialog();
  };

  const handleToggleActive = async (process: BusinessProcess) => {
    await updateMutation.mutateAsync({
      id: process.id,
      active: !process.active,
    });
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Business Processes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage business processes for Epic linking
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Business Process
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search business processes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="px-4 py-3 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-xl font-semibold">{processes.length}</p>
        </div>
        <div className="px-4 py-3 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-xl font-semibold text-secondary-green">
            {processes.filter((p) => p.active).length}
          </p>
        </div>
        <div className="px-4 py-3 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Inactive</p>
          <p className="text-xl font-semibold text-muted-foreground">
            {processes.filter((p) => !p.active).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">Name (English)</TableHead>
              <TableHead className="w-[300px]">Name (Arabic)</TableHead>
              <TableHead className="w-[100px]">Active</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredProcesses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {search ? 'No matching business processes found' : 'No business processes configured'}
                </TableCell>
              </TableRow>
            ) : (
              filteredProcesses.map((process) => (
                <TableRow key={process.id}>
                  <TableCell className="font-medium">{process.name_en}</TableCell>
                  <TableCell className="text-muted-foreground">{process.name_ar || '—'}</TableCell>
                  <TableCell>
                    <Switch
                      checked={process.active}
                      onCheckedChange={() => handleToggleActive(process)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(process)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(process.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
              {editingProcess ? 'Edit Business Process' : 'Add Business Process'}
            </DialogTitle>
            <DialogDescription>
              {editingProcess
                ? 'Update the business process details below.'
                : 'Enter the details for the new business process.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name_en">Name (English) *</Label>
              <Input
                id="name_en"
                value={formData.name_en}
                onChange={(e) => setFormData((prev) => ({ ...prev, name_en: e.target.value }))}
                placeholder="Enter English name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_ar">Name (Arabic)</Label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e) => setFormData((prev) => ({ ...prev, name_ar: e.target.value }))}
                placeholder="Enter Arabic name (optional)"
                dir="rtl"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, active: checked }))}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name_en.trim()}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {editingProcess ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
