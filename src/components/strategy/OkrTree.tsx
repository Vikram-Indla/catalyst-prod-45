import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Settings, Maximize2, ChevronRight, ChevronDown, Target, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useOKRTreeV2, OKRTreeV2Item } from '@/hooks/useOKRTreeV2';
import { OKRTreeColumnsDialog, ColumnConfig } from './OKRTreeColumnsDialog';

interface OkrTreeProps {
  selectedSnapshot: string;
  onObjectiveClick: (objective: any) => void;
  onThemeClick?: (theme: any) => void;
}

function getHealthColor(health: string | null): string {
  switch (health?.toLowerCase()) {
    case 'good': return 'text-secondary-green';
    case 'fair': return 'text-brand-gold';
    case 'poor': return 'text-destructive';
    case 'at_risk': return 'text-brand-gold';
    default: return 'text-muted-foreground';
  }
}

function getHealthBgColor(health: string | null): string {
  switch (health?.toLowerCase()) {
    case 'good': return 'bg-secondary-green/10 text-secondary-green';
    case 'fair': return 'bg-brand-gold/10 text-brand-gold';
    case 'poor': return 'bg-destructive/10 text-destructive';
    case 'at_risk': return 'bg-brand-gold/10 text-brand-gold';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getProgressColor(progress: number): string {
  if (progress >= 70) return 'hsl(var(--secondary-green))';
  if (progress >= 40) return 'hsl(var(--brand-gold))';
  return 'hsl(var(--destructive))';
}

export function OkrTree({ selectedSnapshot, onObjectiveClick, onThemeClick }: OkrTreeProps) {
  const navigate = useNavigate();
  const { data: treeData = [], isLoading } = useOKRTreeV2(selectedSnapshot);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnConfig>({
    objective: true,
    keyResultsProgress: true,
    score: true,
    owner: true,
  });

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderTreeItem = (item: OKRTreeV2Item, depth: number = 0) => {
    const hasChildren = item.children.length > 0;
    const isExpanded = expandedIds.has(item.id);
    const indentPx = depth * 24;

    // Filter by search
    if (searchQuery) {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const childrenMatch = item.children.some(child => 
        child.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        child.children.some(grandChild => grandChild.title.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      if (!matchesSearch && !childrenMatch) return null;
    }

    const isTheme = item.type === 'theme';
    const isObjective = item.type === 'objective';
    const isKeyResult = item.type === 'key_result';

    return (
      <div key={item.id}>
        <div
          className={`grid items-center py-2.5 border-b hover:bg-muted/20 transition-colors focus:outline-none focus:ring-0 ${
            isObjective || isTheme ? 'cursor-pointer' : ''
          } ${isTheme ? 'bg-muted/30' : ''}`}
          style={{
            gridTemplateColumns: '1fr 180px 80px 80px',
          }}
          onClick={() => {
            if (isTheme && onThemeClick) {
              console.log('🎨 OkrTree: Theme clicked:', { id: item.id, title: item.title });
              onThemeClick({ id: item.id, name: item.title, type: 'theme' });
            } else if (isObjective) {
              console.log('🎯 OkrTree: Objective clicked:', { id: item.id, title: item.title });
              onObjectiveClick({ id: item.id, title: item.title, type: 'objective_v2' });
            }
          }}
          tabIndex={-1}>
          <div className="flex items-center gap-3" style={{ paddingLeft: `${indentPx + 16}px` }}>
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.id);
                }}
                className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground transition-transform flex-shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-5 flex-shrink-0" />
            )}
            
            {/* Type Badge */}
            {isTheme && (
              <Badge variant="outline" className="bg-brand-gold/10 text-brand-gold border-brand-gold/30 text-xs">
                <Palette className="h-3 w-3 mr-1" />
                Theme
              </Badge>
            )}
            {isObjective && (
              <Badge variant="outline" className="bg-secondary-green/10 text-secondary-green border-secondary-green/30 text-xs">
                <Target className="h-3 w-3 mr-1" />
                Objective
              </Badge>
            )}
            {isKeyResult && (
              <Badge variant="secondary" className="text-xs">
                KR
              </Badge>
            )}
            
            <span className={`text-sm ${isObjective ? 'text-secondary-green hover:underline' : 'text-foreground'} font-medium`}>
              {item.title}
            </span>
            
            {/* Health badge for objectives */}
            {isObjective && item.health && (
              <Badge className={`${getHealthBgColor(item.health)} text-xs ml-2`}>
                {item.health}
              </Badge>
            )}
          </div>

          {/* Progress */}
          <div className="flex justify-center">
            <div className="w-[140px] h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${item.progress}%`,
                  backgroundColor: getProgressColor(item.progress)
                }}
              />
            </div>
          </div>

          {/* Progress % */}
          <div className="flex justify-center">
            <span className="text-sm font-semibold" style={{ color: getProgressColor(item.progress) }}>
              {Math.round(item.progress)}%
            </span>
          </div>

          {/* Owner */}
          <div className="flex justify-center">
            {item.owner ? (
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={item.owner.avatar} alt={item.owner.name} />
                <AvatarFallback className="text-xs bg-brand-dark text-white font-bold">
                  {item.owner.initials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-8 h-8" />
            )}
          </div>
        </div>

        {/* Render children when expanded */}
        {isExpanded && hasChildren && item.children.map((child) => renderTreeItem(child, depth + 1))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card 
        style={{ 
          borderLeft: '3px solid var(--accent-color)',
          backgroundColor: 'var(--surface-2)',
        }}
      >
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      style={{ 
        borderLeft: '3px solid var(--accent-color)',
        backgroundColor: 'var(--surface-2)',
      }}
    >
      <CardHeader className="pb-3 space-y-3" style={{ backgroundColor: 'var(--surface-3)', borderRadius: '8px 8px 0 0' }}>
        <CardTitle className="text-base flex items-center gap-2" style={{ color: 'var(--text-1)' }}>OKR Tree</CardTitle>
        <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>
          Theme → Objective → Key Results hierarchy for this snapshot
        </p>
        <div className="flex items-center justify-between pt-1">
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => setColumnsDialogOpen(true)}
              title="Configure columns"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => navigate('/enterprise/okr-hub')}
              title="Open OKR Hub"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="border rounded-md overflow-hidden bg-card">
          {/* Column Headers */}
          <div
            className="grid items-center py-2.5 bg-muted/30 border-b font-semibold text-sm sticky top-0 z-10"
            style={{
              gridTemplateColumns: '1fr 180px 80px 80px',
            }}
          >
            <div className="text-foreground/90 pl-4">Item</div>
            <div className="text-foreground/80 text-center">Progress</div>
            <div className="text-foreground/80 text-center">%</div>
            <div className="text-foreground/80 text-center">Owner</div>
          </div>

          {/* Tree Content */}
          {treeData.length > 0 ? (
            treeData.map((item) => renderTreeItem(item, 0))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No themes or objectives found for this snapshot
            </div>
          )}
        </div>
      </CardContent>

      <OKRTreeColumnsDialog
        open={columnsDialogOpen}
        onOpenChange={setColumnsDialogOpen}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
      />
    </Card>
  );
}
