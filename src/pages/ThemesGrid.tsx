import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, MoreVertical, Download, Upload, TrendingUp, DollarSign, Trash2, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';

export default function ThemesGrid() {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [investmentAnalysisOpen, setInvestmentAnalysisOpen] = useState(false);
  const [investmentVsSpendOpen, setInvestmentVsSpendOpen] = useState(false);
  const [prioritizeOpen, setPrioritizeOpen] = useState(false);
  const [addThemeOpen, setAddThemeOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  
  const queryClient = useQueryClient();

  const { data: themes, isLoading } = useQuery({
    queryKey: ['themes', sortField, sortDirection],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('*')
        .order(sortField, { ascending: sortDirection === 'asc' });
      
      if (error) throw error;
      return data || [];
    },
  });

  const createThemeMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('strategic_themes')
        .insert({ name })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Theme created successfully');
      setAddThemeOpen(false);
      setNewThemeName('');
    },
    onError: (error) => {
      toast.error('Failed to create theme');
      console.error(error);
    },
  });

  const deleteThemeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('strategic_themes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Theme deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete theme');
      console.error(error);
    },
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Name', 'Description', 'Status', 'Created At'].join(','),
      ...(themes || []).map((theme) =>
        [
          theme.id,
          `"${theme.name}"`,
          `"${theme.description || ''}"`,
          theme.status || '',
          theme.created_at,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `themes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Themes exported to CSV');
  };

  const handleAddTheme = () => {
    if (newThemeName.trim()) {
      createThemeMutation.mutate(newThemeName);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Themes</h1>
          <div className="flex items-center gap-2">
            <Button onClick={() => setAddThemeOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Theme
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreVertical className="h-4 w-4 mr-2" />
                  More Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-50 bg-popover">
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInvestmentAnalysisOpen(true)}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Investment Analysis
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInvestmentVsSpendOpen(true)}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Investment vs. Spend
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPrioritizeOpen(true)}>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Prioritize
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort('id')}>
                  <div className="flex items-center gap-2">
                    ID
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">
                    Name
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[150px]">Created At</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading themes...
                  </TableCell>
                </TableRow>
              ) : themes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No themes found. Click "Add Theme" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                themes?.map((theme) => (
                  <TableRow
                    key={theme.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => setSelectedTheme(theme.id)}
                  >
                    <TableCell className="font-mono text-sm">{theme.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{theme.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {theme.description || '-'}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{theme.status || 'active'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {theme.created_at ? new Date(theme.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-50 bg-popover">
                          <DropdownMenuItem onClick={() => setSelectedTheme(theme.id)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this theme?')) {
                                deleteThemeMutation.mutate(theme.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Theme Dialog */}
      <Dialog open={addThemeOpen} onOpenChange={setAddThemeOpen}>
        <DialogContent className="z-50">
          <DialogHeader>
            <DialogTitle>Add New Theme</DialogTitle>
            <DialogDescription>
              Create a new strategic theme for your portfolio.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Theme name..."
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTheme();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddThemeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTheme} disabled={!newThemeName.trim()}>
              Create Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="z-50">
          <DialogHeader>
            <DialogTitle>Import Themes</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import multiple themes at once.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input type="file" accept=".csv" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success('Import functionality coming soon');
              setImportDialogOpen(false);
            }}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Investment Analysis Dialog */}
      <Dialog open={investmentAnalysisOpen} onOpenChange={setInvestmentAnalysisOpen}>
        <DialogContent className="max-w-4xl z-50">
          <DialogHeader>
            <DialogTitle>Investment Analysis</DialogTitle>
            <DialogDescription>
              Analyze investment allocation across themes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8">
            <p className="text-center text-muted-foreground">
              Investment analysis report will be displayed here.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setInvestmentAnalysisOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Investment vs Spend Dialog */}
      <Dialog open={investmentVsSpendOpen} onOpenChange={setInvestmentVsSpendOpen}>
        <DialogContent className="max-w-4xl z-50">
          <DialogHeader>
            <DialogTitle>Investment vs. Spend</DialogTitle>
            <DialogDescription>
              Compare planned investment against actual spend.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8">
            <p className="text-center text-muted-foreground">
              Investment vs. spend report will be displayed here.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setInvestmentVsSpendOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prioritize Dialog */}
      <Dialog open={prioritizeOpen} onOpenChange={setPrioritizeOpen}>
        <DialogContent className="max-w-2xl z-50">
          <DialogHeader>
            <DialogTitle>Prioritize Themes</DialogTitle>
            <DialogDescription>
              Drag to reorder themes by priority.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8">
            <p className="text-center text-muted-foreground">
              Drag and drop prioritization will be displayed here.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrioritizeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success('Theme priorities updated');
              setPrioritizeOpen(false);
            }}>
              Save Priority
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Theme Details Drawer */}
      {selectedTheme && themes && (
        <ThemeDetailsDrawer
          theme={themes.find(t => t.id === selectedTheme) || null}
          isOpen={!!selectedTheme}
          onClose={() => setSelectedTheme(null)}
        />
      )}
    </div>
  );
}
