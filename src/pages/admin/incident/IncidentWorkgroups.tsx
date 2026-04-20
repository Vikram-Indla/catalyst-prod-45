import { useState } from 'react';
import { Plus, Pencil, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { useWorkgroups } from '@/hooks/useIncidents';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Workgroup {
  id: string;
  name: string;
  code: string;
  description: string | null;
  support_level_default: string | null;
}

const SUPPORT_LEVELS = [
  { value: 'L1', label: 'L1 - First Line Support' },
  { value: 'L2', label: 'L2 - Technical Support' },
  { value: 'L3', label: 'L3 - Delivery/Development' },
];

export default function IncidentWorkgroups() {
  const { data: workgroups = [], isLoading } = useWorkgroups();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkgroup, setEditingWorkgroup] = useState<Workgroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    support_level_default: 'L1',
  });

  const filteredWorkgroups = (workgroups as Workgroup[]).filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (workgroup?: Workgroup) => {
    if (workgroup) {
      setEditingWorkgroup(workgroup);
      setFormData({
        name: workgroup.name,
        code: workgroup.code,
        description: workgroup.description || '',
        support_level_default: workgroup.support_level_default || 'L1',
      });
    } else {
      setEditingWorkgroup(null);
      setFormData({ name: '', code: '', description: '', support_level_default: 'L1' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingWorkgroup(null);
    setFormData({ name: '', code: '', description: '', support_level_default: 'L1' });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.code.trim()) return;

    try {
      if (editingWorkgroup) {
        const { error } = await supabase
          .from('workgroups')
          .update({
            name: formData.name.trim(),
            code: formData.code.trim().toLowerCase(),
            description: formData.description.trim() || null,
            support_level_default: formData.support_level_default,
          })
          .eq('id', editingWorkgroup.id);

        if (error) throw error;
        toast.success('Workgroup updated');
      } else {
        const { error } = await supabase
          .from('workgroups')
          .insert({
            name: formData.name.trim(),
            code: formData.code.trim().toLowerCase(),
            description: formData.description.trim() || null,
            support_level_default: formData.support_level_default,
          });

        if (error) throw error;
        toast.success('Workgroup created');
      }

      queryClient.invalidateQueries({ queryKey: ['workgroups'] });
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save workgroup');
    }
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Workgroups & Support Levels</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Define workgroups and map support levels for incident assignment
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-brand-primary hover:bg-brand-primary-hover text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Workgroup
          </Button>
        </div>

        {/* Support Level Mapping Info */}
        <div className="p-4 rounded-lg border bg-muted/30">
          <h3 className="font-medium mb-2">Support Level Mapping</h3>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Lozenge appearance="default">L1</Lozenge>
              <span className="text-muted-foreground">→ Operations (First Line)</span>
            </div>
            <div className="flex items-center gap-2">
              <Lozenge appearance="default">L2</Lozenge>
              <span className="text-muted-foreground">→ Operations (Technical)</span>
            </div>
            <div className="flex items-center gap-2">
              <Lozenge appearance="default">L3</Lozenge>
              <span className="text-muted-foreground">→ Delivery (Development)</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workgroups..."
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
                <TableHead className="w-[150px]">Code</TableHead>
                <TableHead className="w-[150px]">Default Support Level</TableHead>
                <TableHead>Description</TableHead>
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
              ) : filteredWorkgroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {search ? 'No matching workgroups found' : 'No workgroups configured'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkgroups.map((workgroup) => (
                  <TableRow key={workgroup.id}>
                    <TableCell className="font-medium">{workgroup.name}</TableCell>
                    <TableCell>
                      <Lozenge appearance="default">{workgroup.code}</Lozenge>
                    </TableCell>
                    <TableCell>
                      <Lozenge appearance="default">{workgroup.support_level_default || 'L1'}</Lozenge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {workgroup.description || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(workgroup)}
                      >
                        <Pencil className="h-4 w-4" />
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
                {editingWorkgroup ? 'Edit Workgroup' : 'Add Workgroup'}
              </DialogTitle>
              <DialogDescription>
                {editingWorkgroup
                  ? 'Update the workgroup details below.'
                  : 'Enter the details for the new workgroup.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Operations"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g., operations"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support_level">Default Support Level</Label>
                <Select
                  value={formData.support_level_default}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, support_level_default: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name.trim() || !formData.code.trim()}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white"
              >
                {editingWorkgroup ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}
