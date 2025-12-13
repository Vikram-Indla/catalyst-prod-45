import { useState, useMemo, useCallback } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { 
  Plus, Search, MoreHorizontal, Copy, Trash2, Power, 
  ArrowUpDown, ChevronLeft, ChevronRight, Filter 
} from 'lucide-react';
import { 
  useDevelopmentInventory, 
  useRoleCatalog, 
  useProjectsForInventory,
  useCreateDevelopmentInventory, 
  useUpdateDevelopmentInventory, 
  useDeleteDevelopmentInventory,
  DevelopmentInventoryItem 
} from '@/hooks/useDevelopmentInventory';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

type SortField = 'name' | 'role_code' | 'project_name' | 'start_date' | 'end_date' | 'capacity_percent' | 'updated_at';
type SortDirection = 'asc' | 'desc';

export default function DevelopmentInventory() {
  const { data: inventory = [], isLoading } = useDevelopmentInventory();
  const { data: roles = [] } = useRoleCatalog();
  const { data: projects = [] } = useProjectsForInventory();
  const createMutation = useCreateDevelopmentInventory();
  const updateMutation = useUpdateDevelopmentInventory();
  const deleteMutation = useDeleteDevelopmentInventory();

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DevelopmentInventoryItem | null>(null);

  // New item form
  const [newItem, setNewItem] = useState({
    name: '',
    role_code: '',
    project_id: '',
    start_date: null as Date | null,
    end_date: null as Date | null,
    capacity_percent: 100,
    is_active: true,
    notes: '',
  });

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...inventory];

    // Search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.role_code?.toLowerCase().includes(searchLower) ||
        item.role_name?.toLowerCase().includes(searchLower)
      );
    }

    // Role filter
    if (selectedRoles.length > 0) {
      result = result.filter(item => item.role_code && selectedRoles.includes(item.role_code));
    }

    // Project filter
    if (selectedProjects.length > 0) {
      result = result.filter(item => item.project_id && selectedProjects.includes(item.project_id));
    }

    // Active filter
    if (activeFilter === 'active') {
      result = result.filter(item => item.is_active);
    } else if (activeFilter === 'inactive') {
      result = result.filter(item => !item.is_active);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'project_name') {
        aVal = a.project_name || '';
        bVal = b.project_name || '';
      }

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [inventory, search, selectedRoles, selectedProjects, activeFilter, sortField, sortDirection]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleInlineUpdate = useCallback(async (id: string, field: keyof DevelopmentInventoryItem, value: any) => {
    try {
      await updateMutation.mutateAsync({ id, [field]: value });
    } catch (error) {
      toast.error('Failed to update');
    }
  }, [updateMutation]);

  const handleCreate = async () => {
    if (!newItem.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: newItem.name.trim(),
        role_code: newItem.role_code || null,
        project_id: newItem.project_id || null,
        start_date: newItem.start_date?.toISOString().split('T')[0] || null,
        end_date: newItem.end_date?.toISOString().split('T')[0] || null,
        capacity_percent: newItem.capacity_percent,
        is_active: newItem.is_active,
        notes: newItem.notes || null,
      });
      toast.success('Resource added');
      setAddDialogOpen(false);
      setNewItem({
        name: '',
        role_code: '',
        project_id: '',
        start_date: null,
        end_date: null,
        capacity_percent: 100,
        is_active: true,
        notes: '',
      });
    } catch (error) {
      toast.error('Failed to create resource');
    }
  };

  const handleDuplicate = async (item: DevelopmentInventoryItem) => {
    try {
      await createMutation.mutateAsync({
        name: `${item.name} (Copy)`,
        role_code: item.role_code,
        project_id: item.project_id,
        start_date: item.start_date,
        end_date: item.end_date,
        capacity_percent: item.capacity_percent,
        is_active: item.is_active,
        notes: item.notes,
      });
      toast.success('Resource duplicated');
    } catch (error) {
      toast.error('Failed to duplicate');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteMutation.mutateAsync(itemToDelete.id);
      toast.success('Resource deleted');
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={cn(
          "h-3 w-3",
          sortField === field ? "text-foreground" : "text-muted-foreground"
        )} />
      </div>
    </TableHead>
  );

  return (
    <AdminGuard>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Development Inventory</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage development team resources and assignments
              </p>
            </div>
            <Button onClick={() => setAddDialogOpen(true)} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b bg-card px-6 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>

            {/* Role filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Role {selectedRoles.length > 0 && `(${selectedRoles.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 z-[400]">
                {roles.map(role => (
                  <label key={role.code} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer">
                    <Checkbox
                      checked={selectedRoles.includes(role.code)}
                      onCheckedChange={(checked) => {
                        setSelectedRoles(prev => 
                          checked ? [...prev, role.code] : prev.filter(r => r !== role.code)
                        );
                        setPage(1);
                      }}
                    />
                    <span className="text-sm">{role.code} — {role.name}</span>
                  </label>
                ))}
              </PopoverContent>
            </Popover>

            {/* Project filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Project {selectedProjects.length > 0 && `(${selectedProjects.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 z-[400]">
                {projects.map(project => (
                  <label key={project.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer">
                    <Checkbox
                      checked={selectedProjects.includes(project.id)}
                      onCheckedChange={(checked) => {
                        setSelectedProjects(prev => 
                          checked ? [...prev, project.id] : prev.filter(p => p !== project.id)
                        );
                        setPage(1);
                      }}
                    />
                    <span className="text-sm">{project.name}</span>
                  </label>
                ))}
              </PopoverContent>
            </Popover>

            {/* Active filter */}
            <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v as any); setPage(1); }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Page size */}
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                <SelectItem value="30">30 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <SortableHeader field="name">Name</SortableHeader>
                <SortableHeader field="role_code">Role</SortableHeader>
                <SortableHeader field="project_name">Project</SortableHeader>
                <SortableHeader field="start_date">Start Date</SortableHeader>
                <SortableHeader field="end_date">End Date</SortableHeader>
                <SortableHeader field="capacity_percent">Capacity %</SortableHeader>
                <TableHead>Active</TableHead>
                <SortableHeader field="updated_at">Updated</SortableHeader>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No resources found
                  </TableCell>
                </TableRow>
              ) : paginatedData.map(item => (
                <TableRow key={item.id} className="h-10">
                  {/* Name - inline edit */}
                  <TableCell className="font-medium min-w-[200px] sticky left-0 bg-card">
                    <Input
                      value={item.name}
                      onChange={(e) => handleInlineUpdate(item.id, 'name', e.target.value)}
                      className="h-8 border-transparent hover:border-border focus:border-brand-gold"
                    />
                  </TableCell>

                  {/* Role */}
                  <TableCell className="min-w-[180px]">
                    <Select
                      value={item.role_code || ''}
                      onValueChange={(v) => handleInlineUpdate(item.id, 'role_code', v || null)}
                    >
                      <SelectTrigger className="h-8 border-transparent hover:border-border">
                        <SelectValue placeholder="Select role">
                          {item.role_code && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{item.role_code}</Badge>
                              <span className="text-sm">{item.role_name}</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="z-[400]">
                        {roles.map(role => (
                          <SelectItem key={role.code} value={role.code}>
                            {role.code} — {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Project */}
                  <TableCell className="min-w-[160px]">
                    <Select
                      value={item.project_id || ''}
                      onValueChange={(v) => handleInlineUpdate(item.id, 'project_id', v || null)}
                    >
                      <SelectTrigger className="h-8 border-transparent hover:border-border">
                        <SelectValue placeholder="Select project">
                          {item.project_name || ''}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="z-[400]">
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Start Date */}
                  <TableCell className="min-w-[140px]">
                    <CatalystDatePicker
                      value={item.start_date ? new Date(item.start_date) : undefined}
                      onChange={(date) => handleInlineUpdate(item.id, 'start_date', date?.toISOString().split('T')[0] || null)}
                      placeholder="Start date"
                    />
                  </TableCell>

                  {/* End Date */}
                  <TableCell className="min-w-[140px]">
                    <CatalystDatePicker
                      value={item.end_date ? new Date(item.end_date) : undefined}
                      onChange={(date) => {
                        if (date && item.start_date && date < new Date(item.start_date)) {
                          toast.error('End date must be after start date');
                          return;
                        }
                        handleInlineUpdate(item.id, 'end_date', date?.toISOString().split('T')[0] || null);
                      }}
                      placeholder="End date"
                    />
                  </TableCell>

                  {/* Capacity */}
                  <TableCell className="w-[100px]">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={item.capacity_percent}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        handleInlineUpdate(item.id, 'capacity_percent', val);
                      }}
                      className="h-8 w-20 border-transparent hover:border-border focus:border-brand-gold"
                    />
                  </TableCell>

                  {/* Active */}
                  <TableCell>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={(checked) => handleInlineUpdate(item.id, 'is_active', checked)}
                    />
                  </TableCell>

                  {/* Updated */}
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(item.updated_at), 'MMM d, yyyy')}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[400]">
                        <DropdownMenuItem onClick={() => handleDuplicate(item)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleInlineUpdate(item.id, 'is_active', !item.is_active)}>
                          <Power className="h-4 w-4 mr-2" />
                          {item.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => { setItemToDelete(item); setDeleteDialogOpen(true); }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="border-t bg-card px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, filteredData.length)} of {filteredData.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm px-2">Page {page} of {totalPages || 1}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Add Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Resource</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Resource name"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={newItem.role_code} onValueChange={(v) => setNewItem(prev => ({ ...prev, role_code: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="z-[500]">
                    {roles.map(role => (
                      <SelectItem key={role.code} value={role.code}>
                        {role.code} — {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Project</label>
                <Select value={newItem.project_id} onValueChange={(v) => setNewItem(prev => ({ ...prev, project_id: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent className="z-[500]">
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <div className="mt-1">
                    <CatalystDatePicker
                      value={newItem.start_date || undefined}
                      onChange={(date) => setNewItem(prev => ({ ...prev, start_date: date || null }))}
                      placeholder="Start date"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <div className="mt-1">
                    <CatalystDatePicker
                      value={newItem.end_date || undefined}
                      onChange={(date) => setNewItem(prev => ({ ...prev, end_date: date || null }))}
                      placeholder="End date"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Capacity %</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={newItem.capacity_percent}
                  onChange={(e) => setNewItem(prev => ({ ...prev, capacity_percent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newItem.is_active}
                  onCheckedChange={(checked) => setNewItem(prev => ({ ...prev, is_active: checked }))}
                />
                <label className="text-sm font-medium">Active</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
                Add Resource
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Resource</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-4">
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}
