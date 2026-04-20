import { useState } from 'react';
import { Plus, Pencil, Search, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Lozenge } from '@/components/ads';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { AdminGuard } from '@/components/admin/AdminGuard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface FieldOption {
  id: string;
  field_name: string;
  option_value: string;
  option_label: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

const FIELD_TABS = [
  { value: 'severity', label: 'Severity' },
  { value: 'impact', label: 'Impact' },
  { value: 'urgency', label: 'Urgency' },
  { value: 'priority', label: 'Priority' },
  { value: 'source_department', label: 'Source Departments' },
  { value: 'delivery_platform', label: 'Delivery Platforms' },
];

export default function IncidentFieldsConfig() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('severity');
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<FieldOption | null>(null);
  const [formData, setFormData] = useState({
    option_value: '',
    option_label: '',
    color: '#3B82F6',
    sort_order: 0,
    is_active: true,
  });

  const { data: fieldOptions = [], isLoading } = useQuery({
    queryKey: ['incident-field-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_field_options')
        .select('*')
        .order('field_name')
        .order('sort_order');

      if (error) throw error;
      return data as FieldOption[];
    },
  });

  const filteredOptions = fieldOptions.filter(
    (opt) =>
      opt.field_name === activeTab &&
      (opt.option_label.toLowerCase().includes(search.toLowerCase()) ||
        opt.option_value.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenDialog = (option?: FieldOption) => {
    if (option) {
      setEditingOption(option);
      setFormData({
        option_value: option.option_value,
        option_label: option.option_label,
        color: option.color || '#3B82F6',
        sort_order: option.sort_order,
        is_active: option.is_active,
      });
    } else {
      setEditingOption(null);
      const maxOrder = Math.max(0, ...filteredOptions.map((o) => o.sort_order));
      setFormData({
        option_value: '',
        option_label: '',
        color: '#3B82F6',
        sort_order: maxOrder + 1,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingOption(null);
    setFormData({
      option_value: '',
      option_label: '',
      color: '#3B82F6',
      sort_order: 0,
      is_active: true,
    });
  };

  const handleSubmit = async () => {
    if (!formData.option_value.trim() || !formData.option_label.trim()) return;

    try {
      if (editingOption) {
        const { error } = await supabase
          .from('incident_field_options')
          .update({
            option_value: formData.option_value.trim(),
            option_label: formData.option_label.trim(),
            color: formData.color,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          })
          .eq('id', editingOption.id);

        if (error) throw error;
        toast.success('Field option updated');
      } else {
        const { error } = await supabase
          .from('incident_field_options')
          .insert({
            field_name: activeTab,
            option_value: formData.option_value.trim(),
            option_label: formData.option_label.trim(),
            color: formData.color,
            sort_order: formData.sort_order,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success('Field option created');
      }

      queryClient.invalidateQueries({ queryKey: ['incident-field-options'] });
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save field option');
    }
  };

  const handleToggleActive = async (option: FieldOption) => {
    try {
      const { error } = await supabase
        .from('incident_field_options')
        .update({ is_active: !option.is_active })
        .eq('id', option.id);

      if (error) throw error;
      toast.success(`Option ${!option.is_active ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries({ queryKey: ['incident-field-options'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const currentTabLabel = FIELD_TABS.find((t) => t.value === activeTab)?.label || 'Options';

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Incident Fields Configuration</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure field options used in incident create, edit, and filters
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Changes to field options apply to future incidents only. Existing incidents retain their current values.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            {FIELD_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 space-y-4">
            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${currentTabLabel.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => handleOpenDialog()} className="bg-brand-primary hover:bg-brand-primary-hover text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add {currentTabLabel}
              </Button>
            </div>

            {/* Table */}
            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Order</TableHead>
                    <TableHead className="w-[200px]">Value</TableHead>
                    <TableHead className="w-[300px]">Label</TableHead>
                    <TableHead className="w-[100px]">Color</TableHead>
                    <TableHead className="w-[100px]">Active</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredOptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {search ? 'No matching options found' : `No ${currentTabLabel.toLowerCase()} configured`}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOptions.map((option) => (
                      <TableRow key={option.id}>
                        <TableCell className="text-muted-foreground">{option.sort_order}</TableCell>
                        <TableCell>
                          <Lozenge appearance="default">{option.option_value}</Lozenge>
                        </TableCell>
                        <TableCell className="font-medium">{option.option_label}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded border"
                              style={{ backgroundColor: option.color || '#E1E4E8' }}
                            />
                            <span className="text-xs text-muted-foreground">{option.color}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={option.is_active}
                            onCheckedChange={() => handleToggleActive(option)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(option)}
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
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingOption ? `Edit ${currentTabLabel}` : `Add ${currentTabLabel}`}
              </DialogTitle>
              <DialogDescription>
                {editingOption
                  ? 'Update the field option details below.'
                  : `Enter the details for the new ${currentTabLabel.toLowerCase()} option.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="option_value">Value *</Label>
                  <Input
                    id="option_value"
                    value={formData.option_value}
                    onChange={(e) => setFormData((prev) => ({ ...prev, option_value: e.target.value }))}
                    placeholder="e.g., SEV1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="option_label">Display Label *</Label>
                <Input
                  id="option_label"
                  value={formData.option_label}
                  onChange={(e) => setFormData((prev) => ({ ...prev, option_label: e.target.value }))}
                  placeholder="e.g., SEV1 - Critical"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.option_value.trim() || !formData.option_label.trim()}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white"
              >
                {editingOption ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}
