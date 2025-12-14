import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  useRiskSeverityLevels,
  useCreateRiskSeverityLevel,
  useUpdateRiskSeverityLevel,
  useToggleRiskSeverityLevel,
  RiskSeverityLevel,
} from '@/hooks/useRiskSeverityLevels';

export default function RiskSeverityLevels() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<RiskSeverityLevel | null>(null);
  const [formData, setFormData] = useState({ value: '', label: '' });

  const { data: levels = [], isLoading } = useRiskSeverityLevels();
  const createMutation = useCreateRiskSeverityLevel();
  const updateMutation = useUpdateRiskSeverityLevel();
  const toggleMutation = useToggleRiskSeverityLevel();

  const filteredLevels = levels.filter(level =>
    level.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    level.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async () => {
    if (!formData.label.trim()) return;

    if (editingLevel) {
      await updateMutation.mutateAsync({
        id: editingLevel.id,
        label: formData.label.trim(),
      });
    } else {
      await createMutation.mutateAsync({
        value: formData.value.trim() || formData.label.trim(),
        label: formData.label.trim(),
        sort_order: levels.length + 1,
      });
    }

    setFormData({ value: '', label: '' });
    setEditingLevel(null);
    setIsDialogOpen(false);
  };

  const handleToggleActive = async (level: RiskSeverityLevel) => {
    await toggleMutation.mutateAsync({ id: level.id, is_active: level.is_active });
  };

  const openEditDialog = (level: RiskSeverityLevel) => {
    setEditingLevel(level);
    setFormData({ value: level.value, label: level.label });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingLevel(null);
    setFormData({ value: '', label: '' });
    setIsDialogOpen(true);
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Risk Severity Levels</h1>
            <p className="text-muted-foreground mt-2">
              Manage severity level options for Risk Occurrence and Impact fields
            </p>
          </div>
          <Button className="bg-brand-gold hover:bg-brand-gold-hover" onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Severity Level
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{levels.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {levels.filter(l => l.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {levels.filter(l => !l.is_active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Severity Level Configuration</CardTitle>
            <CardDescription>
              Configure severity levels that appear in Risk Occurrence and Impact dropdowns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search severity levels..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="border rounded-lg">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium w-10"></th>
                    <th className="text-left p-3 text-sm font-medium">Label</th>
                    <th className="text-left p-3 text-sm font-medium">Value (Key)</th>
                    <th className="text-left p-3 text-sm font-medium">Order</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-3 text-center text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredLevels.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-3 text-center text-muted-foreground">
                        No severity levels found
                      </td>
                    </tr>
                  ) : (
                    filteredLevels.map((level) => (
                      <tr key={level.id} className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        </td>
                        <td className="p-3 text-sm font-medium">{level.label}</td>
                        <td className="p-3 text-sm text-muted-foreground font-mono">{level.value}</td>
                        <td className="p-3 text-sm text-muted-foreground">{level.sort_order}</td>
                        <td className="p-3 text-sm">
                          <Switch
                            checked={level.is_active}
                            onCheckedChange={() => handleToggleActive(level)}
                          />
                        </td>
                        <td className="p-3 text-sm text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(level)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLevel ? 'Edit Severity Level' : 'Add Severity Level'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="label">Display Label</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., Critical"
                />
              </div>
              {!editingLevel && (
                <div className="space-y-2">
                  <Label htmlFor="value">Value (Key)</Label>
                  <Input
                    id="value"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="e.g., Critical (uses label if empty)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used internally as the database value. Uses label if left empty.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-brand-gold hover:bg-brand-gold-hover"
                onClick={handleSave}
                disabled={!formData.label.trim()}
              >
                {editingLevel ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}
