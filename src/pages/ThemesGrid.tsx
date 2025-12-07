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
import { ImportThemesDialog } from '@/components/backlog/ImportThemesDialog';
import { PullRankThemesDialog } from '@/components/backlog/PullRankThemesDialog';

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
        .insert({ 
          name,
          snapshot_id: 'f8c7e7b3-6b23-4261-a4ca-c011c1dc8836' // Default to Corporate Strategy 2025
        })
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
      <div className="h-[72px] border-b bg-card px-6 flex items-center">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-2xl font-semibold truncate">Themes</h1>
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

      {/* Import Themes Dialog - Catalyst spec compliant */}
      <ImportThemesDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      {/* Investment Analysis Report - Not a dialog, navigate to report page */}
      <Dialog open={investmentAnalysisOpen} onOpenChange={setInvestmentAnalysisOpen}>
        <DialogContent className="max-w-2xl z-50">
          <DialogHeader>
            <DialogTitle>Investment by Feature Report</DialogTitle>
            <DialogDescription>
              Shows breakdown of features by Investment Category and Business Driver
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Report Location</p>
              <p className="text-sm text-muted-foreground">
                Navigate to: <span className="font-mono">Reports → Investment by Feature</span>
              </p>
            </div>
            <div className="p-3 border rounded-lg bg-warning/10 border-warning/50">
              <p className="text-xs text-warning-foreground">
                <strong>Note:</strong> This is a read-only report page, not a dialog. 
                It shows feature counts by category and business driver per PI.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Source: <a href="https://help.jiraalign.com/hc/en-us/articles/115005862447" target="_blank" rel="noopener" className="underline">Jira Align Help Center</a>
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setInvestmentAnalysisOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Investment vs Spend Report - Not a dialog, navigate to report page */}
      <Dialog open={investmentVsSpendOpen} onOpenChange={setInvestmentVsSpendOpen}>
        <DialogContent className="max-w-2xl z-50">
          <DialogHeader>
            <DialogTitle>Investment vs. Spend Report</DialogTitle>
            <DialogDescription>
              View PI funding allocations and accepted spend per theme
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Report Location</p>
              <p className="text-sm text-muted-foreground">
                Navigate to: <span className="font-mono">Reports → Investment vs. Spend</span>
              </p>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <p className="text-sm font-medium">Report Features:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>3 pie charts: PI Funding, Estimated Spend, Accepted Spend</li>
                <li>Set Theme Guardrails button</li>
                <li>Table with Allocation and Investment & Spend columns</li>
                <li>Work columns: Epics, Stories, Total PI Estimate, Points Planned</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Source: <a href="https://help.jiraalign.com/hc/en-us/articles/115004314088" target="_blank" rel="noopener" className="underline">Jira Align Help Center</a>
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setInvestmentVsSpendOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pull Rank Dialog - Catalyst spec compliant */}
      <PullRankThemesDialog
        open={prioritizeOpen}
        onOpenChange={setPrioritizeOpen}
        onApply={(rankingOption) => {
          toast.success(`Applied ranking: ${rankingOption}`);
          queryClient.invalidateQueries({ queryKey: ['themes'] });
        }}
      />

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
