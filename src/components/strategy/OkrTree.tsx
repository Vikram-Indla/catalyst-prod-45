import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Maximize2, ChevronRight, ChevronDown, Target, Palette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PremiumCard, PremiumCardHeader, PremiumCardContent } from '@/components/ui/premium-card';
import { useOKRTreeV2, OKRTreeV2Item } from '@/hooks/useOKRTreeV2';
import { OKRTreeColumnsDialog, ColumnConfig } from './OKRTreeColumnsDialog';

interface OkrTreeProps {
  selectedSnapshot: string;
  onObjectiveClick: (objective: any) => void;
  onThemeClick?: (theme: any) => void;
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
          className={`grid items-center py-2 transition-colors focus:outline-none ${
            isObjective || isTheme ? 'cursor-pointer hover:bg-[var(--surface-2)]' : ''
          }`}
          style={{
            gridTemplateColumns: '1fr 120px 50px 50px',
            borderBottom: '1px solid var(--divider)',
            backgroundColor: isTheme ? 'var(--surface-2)' : 'transparent',
          }}
          onClick={() => {
            if (isTheme && onThemeClick) {
              onThemeClick({ id: item.id, name: item.title, type: 'theme' });
            } else if (isObjective) {
              onObjectiveClick({ id: item.id, title: item.title, type: 'objective_v2' });
            }
          }}
          tabIndex={-1}
        >
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
            
            <span className={`text-sm ${isObjective ? 'text-secondary-green hover:underline' : ''} font-medium`} style={{ color: isObjective ? undefined : 'var(--text-1)' }}>
              {item.title}
            </span>
            
            {isObjective && item.health && (
              <Badge className={`${getHealthBgColor(item.health)} text-xs ml-2`}>
                {item.health}
              </Badge>
            )}
          </div>

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

          <div className="flex justify-center">
            <span className="text-xs font-semibold" style={{ color: getProgressColor(item.progress) }}>
              {Math.round(item.progress)}%
            </span>
          </div>

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

        {isExpanded && hasChildren && item.children.map((child) => renderTreeItem(child, depth + 1))}
      </div>
    );
  };

  const headerAction = (
    <div className="flex items-center gap-2">
      <div className="relative w-40">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-3)' }} />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-7 text-xs"
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
        className="h-7 w-7"
        onClick={() => navigate('/enterprise/okr-hub')}
        title="Open OKR Hub"
      >
        <Maximize2 className="h-3.5 w-3.5" style={{ color: 'var(--text-3)' }} />
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <PremiumCard>
        <PremiumCardHeader title="OKR Tree" action={headerAction} />
        <PremiumCardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard>
      <PremiumCardHeader title="OKR Tree" action={headerAction} />
      <PremiumCardContent noPadding>
        <div className="border-t" style={{ borderColor: 'var(--divider)' }}>
          {/* Column Headers */}
          <div
            className="grid items-center py-2 px-4 font-semibold text-[11px] uppercase tracking-wide"
            style={{
              gridTemplateColumns: '1fr 120px 50px 50px',
              backgroundColor: 'var(--surface-2)',
              borderBottom: '1px solid var(--divider)',
              color: 'var(--text-2)',
            }}
          >
            <div>Item</div>
            <div className="text-center">Progress</div>
            <div className="text-center">%</div>
            <div className="text-center">Owner</div>
          </div>

          {/* Tree Content */}
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {treeData.length > 0 ? (
              treeData.map((item) => renderTreeItem(item, 0))
            ) : (
              <div className="py-8 text-center">
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>No items found</span>
              </div>
            )}
          </div>
        </div>
      </PremiumCardContent>

      <OKRTreeColumnsDialog
        open={columnsDialogOpen}
        onOpenChange={setColumnsDialogOpen}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
      />
    </PremiumCard>
  );
}
