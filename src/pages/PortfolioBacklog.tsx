import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Star, Grid3x3, Filter, Search, ListIcon, LayoutGrid, Eye } from 'lucide-react';
import { BacklogViewSelector, BacklogView } from '@/components/portfolio/BacklogViewSelector';
import { ThemeBacklog } from '@/components/backlog/ThemeBacklog';
import { EpicBacklogView } from '@/components/backlog/EpicBacklogView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Citation: (Doc: Navigate to the backlog - PDF provided)
// Citation: (Doc: Backlog for themes - PDF provided)
// Citation: (Screenshot: image-189.png, image-190.png, image-191.png, image-192.png)

export default function PortfolioBacklog() {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const [searchParams] = useSearchParams();
  const piId = searchParams.get('pi');
  
  const [viewingOption, setViewingOption] = useState<BacklogView>('theme');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'unassigned'>('list');

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - Citation: (Screenshot: image-190.png) */}
      <div className="border-b bg-card px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Star className="h-4 w-4 text-muted-foreground" />
            <BacklogViewSelector 
              value={viewingOption} 
              onChange={setViewingOption}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Grid3x3 className="h-4 w-4" />
              <span className="text-sm">Columns Shown</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Filter className="h-4 w-4" />
              <span className="text-sm">Apply Filters</span>
            </Button>
            <Input
              placeholder="Search"
              className="w-48 h-8 text-sm"
            />
            
            {viewingOption === 'epic' && (
              <div className="flex items-center gap-1 border-l pl-3 ml-2">
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
                  <DropdownMenuContent align="end" className="z-50 bg-popover">
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
                  <span className="text-sm">Unassigned Backlog</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {viewingOption === 'theme' && (
          <ThemeBacklog portfolioId={portfolioId || ''} piId={piId || undefined} />
        )}
        
        {viewingOption === 'epic' && (
          <EpicBacklogView portfolioId={portfolioId} piId={piId || undefined} />
        )}
        
        {viewingOption === 'capability' && (
          <div className="p-6">
            <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Capability Backlog view will be implemented in Phase 2
              </p>
            </div>
          </div>
        )}
        
        {viewingOption === 'feature' && (
          <div className="p-6">
            <div className="bg-muted/30 border border-dashed rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Feature Backlog view will be implemented in Phase 2
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
