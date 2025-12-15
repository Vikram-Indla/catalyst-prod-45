import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Star, Grid3x3, Filter, ListIcon, LayoutGrid, Eye, Plus } from 'lucide-react';
import { BacklogViewSelector, BacklogView } from '@/components/portfolio/BacklogViewSelector';
import { ThemeBacklog } from '@/components/backlog/ThemeBacklog';
import { EpicBacklogView } from '@/components/backlog/EpicBacklogView';
import { ThemeColumnsDialog } from '@/components/backlog/ThemeColumnsDialog';
import { ThemeFiltersDialog, ThemeFilters } from '@/components/backlog/ThemeFiltersDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';

export default function PortfolioBacklog() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const [searchParams] = useSearchParams();
  const piId = searchParams.get('pi');
  
  const [viewingOption, setViewingOption] = useState<BacklogView>('theme');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'unassigned'>('list');
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['rank', 'id', 'name', 'state', 'pis']);
  const [filters, setFilters] = useState<ThemeFilters>({});

  // Toolbar content
  const toolbarContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        <Star className="h-4 w-4" style={{ color: 'var(--icon-muted)' }} />
        <BacklogViewSelector 
          value={viewingOption} 
          onChange={setViewingOption}
        />
        <Button size="sm" className="bg-brand-gold hover:bg-brand-gold-hover" onClick={() => toast.info(`Create ${viewingOption === 'theme' ? 'Theme' : viewingOption === 'epic' ? 'Epic' : 'Feature'} dialog coming soon`)}>
          <Plus className="h-4 w-4 mr-1" />
          Create {viewingOption === 'theme' ? 'Theme' : viewingOption === 'epic' ? 'Epic' : 'Feature'}
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          style={{ color: 'var(--text-2)' }}
          onClick={() => setIsColumnsDialogOpen(true)}
        >
          <Grid3x3 className="h-4 w-4" />
          <span className="text-sm">Columns</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          style={{ color: 'var(--text-2)' }}
          onClick={() => setIsFiltersDialogOpen(true)}
        >
          <Filter className="h-4 w-4" />
          <span className="text-sm">Filters</span>
        </Button>
        <Input
          placeholder="Search"
          className="w-48 h-8 text-sm"
          style={{ 
            backgroundColor: 'var(--input-bg)', 
            borderColor: 'var(--input-border)',
            color: 'var(--input-text)',
          }}
        />
        
        {viewingOption === 'epic' && (
          <div className="flex items-center gap-1 border-l pl-3 ml-2" style={{ borderColor: 'var(--divider)' }}>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-1.5"
            >
              <ListIcon className="h-4 w-4" />
              <span className="text-sm">List</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="text-sm">Kanban</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[400]">
                <DropdownMenuItem onClick={() => setViewMode('kanban')}>
                  State View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('kanban')}>
                  Process Flow View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('kanban')}>
                  Column View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant={viewMode === 'unassigned' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('unassigned')}
              className="gap-1.5"
            >
              <Eye className="h-4 w-4" />
              <span className="text-sm">Unassigned</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Global Page Header with toolbar */}
      <GlobalPageHeader
        sectionLabel="Enterprise"
        pageTitle="Portfolio Backlog"
        toolbar={toolbarContent}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {viewingOption === 'theme' && (
          <ThemeBacklog portfolioId={portfolioId || ''} piId={piId || undefined} />
        )}
        
        {viewingOption === 'epic' && (
          <EpicBacklogView portfolioId={portfolioId} piId={piId || undefined} />
        )}
        
        {viewingOption === 'feature' && (
          <div className="p-6">
            <div className="border border-dashed rounded-lg p-8 text-center" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                Feature Backlog view will be implemented in Phase 2
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ThemeColumnsDialog
        open={isColumnsDialogOpen}
        onOpenChange={setIsColumnsDialogOpen}
        selectedColumns={selectedColumns}
        onSave={setSelectedColumns}
      />
      
      <ThemeFiltersDialog
        open={isFiltersDialogOpen}
        onOpenChange={setIsFiltersDialogOpen}
        currentFilters={filters}
        onApply={setFilters}
      />
    </div>
  );
}
