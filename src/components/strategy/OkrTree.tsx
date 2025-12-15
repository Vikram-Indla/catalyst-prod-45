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
          className={`grid items-center py-1.5 transition-colors focus:outline-none focus:ring-0 ${
            isObjective || isTheme ? 'cursor-pointer' : ''
          }`}
          style={{
            gridTemplateColumns: '1fr 120px 50px 50px',
            borderBottom: '1px solid var(--divider)',
            backgroundColor: isTheme ? 'var(--surface-2)' : 'transparent',
          }}
          onMouseEnter={(e) => { if (!isTheme) e.currentTarget.style.backgroundColor = 'var(--surface-2)'; }}
          onMouseLeave={(e) => { if (!isTheme) e.currentTarget.style.backgroundColor = 'transparent'; }}
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
            <div className="w-[100px] h-1.5 bg-muted rounded-full overflow-hidden">
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
            <span className="text-xs font-semibold" style={{ color: getProgressColor(item.progress) }}>
              {Math.round(item.progress)}%
            </span>
          </div>

          {/* Owner */}
          <div className="flex justify-center">
            {item.owner ? (
              <Avatar className="h-6 w-6 border border-border">
                <AvatarImage src={item.owner.avatar} alt={item.owner.name} />
                <AvatarFallback className="text-[10px] bg-brand-dark text-white font-bold">
                  {item.owner.initials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-6 h-6" />
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
        className="rounded-lg shadow-sm border"
        style={{ 
          borderColor: 'var(--divider)',
          backgroundColor: 'var(--surface-1)',
        }}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="rounded-lg shadow-sm border"
      style={{ 
        borderColor: 'var(--divider)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <CardHeader 
        className="py-2 px-3 border-b" 
        style={{ 
          borderColor: 'var(--divider)',
          backgroundColor: 'var(--surface-1)',
        }}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>OKR Tree</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-40">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: 'var(--text-3)' }} />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-6 text-xs"
                style={{ 
                  backgroundColor: 'var(--input-bg)', 
                  borderColor: 'var(--input-border)',
                  color: 'var(--input-text)'
                }}
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5"
              onClick={() => navigate('/enterprise/okr-hub')}
              title="Open OKR Hub"
            >
              <Maximize2 className="h-3 w-3" style={{ color: 'var(--text-3)' }} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        <div className="border rounded overflow-hidden" style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--divider)' }}>
          {/* Column Headers */}
          <div
            className="grid items-center py-1 font-semibold text-[10px]"
            style={{
              gridTemplateColumns: '1fr 120px 50px 50px',
              backgroundColor: 'var(--surface-2)',
              borderBottom: '1px solid var(--divider)',
              color: 'var(--text-2)',
            }}
          >
            <div className="pl-3">Item</div>
            <div className="text-center">Progress</div>
            <div className="text-center">%</div>
            <div className="text-center">Owner</div>
          </div>

          {/* Tree Content */}
          {treeData.length > 0 ? (
            treeData.map((item) => renderTreeItem(item, 0))
          ) : (
            <div className="py-4 text-center text-xs" style={{ color: 'var(--text-3)' }}>
              No items found
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
