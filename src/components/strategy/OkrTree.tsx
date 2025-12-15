import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Maximize2, ChevronRight, ChevronDown, Target, Palette, Plus } from 'lucide-react';
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

function getProgressColor(progress: number, hasData: boolean = true): string {
  if (!hasData || progress === 0) return 'var(--text-3)'; // Neutral for zero/no data
  if (progress >= 70) return 'hsl(var(--secondary-green))';
  if (progress >= 40) return 'hsl(var(--brand-gold))';
  return 'var(--text-2)'; // Neutral instead of destructive red for low progress
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
    const indentPx = depth * 20;

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
          className={`grid items-center py-2.5 transition-colors focus:outline-none ${
            isObjective || isTheme ? 'cursor-pointer hover:bg-[var(--surface-2)]' : ''
          }`}
          style={{
            gridTemplateColumns: '1fr 140px 60px 56px',
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
          <div className="flex items-center gap-2" style={{ paddingLeft: `${indentPx + 16}px` }}>
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
              <Badge variant="outline" className="bg-brand-gold/10 text-brand-gold border-brand-gold/30 text-[11px] py-0 h-5">
                <Palette className="h-3 w-3 mr-1" />
                Theme
              </Badge>
            )}
            {isObjective && (
              <Badge variant="outline" className="bg-secondary-green/10 text-secondary-green border-secondary-green/30 text-[11px] py-0 h-5">
                <Target className="h-3 w-3 mr-1" />
                Objective
              </Badge>
            )}
            {isKeyResult && (
              <Badge variant="secondary" className="text-[11px] py-0 h-5">
                KR
              </Badge>
            )}
            
            <span 
              className={`text-sm truncate ${isObjective ? 'text-secondary-green hover:underline font-medium' : 'font-medium'}`} 
              style={{ color: isObjective ? undefined : 'var(--text-1)' }}
            >
              {item.title}
            </span>
            
            {isObjective && item.health && (
              <Badge className={`${getHealthBgColor(item.health)} text-[11px] py-0 h-5 ml-1`}>
                {item.health}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 px-2">
            <div className="w-[80px] h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${item.progress}%`,
                  backgroundColor: getProgressColor(item.progress, item.progress > 0)
                }}
              />
            </div>
          </div>

          <div className="flex justify-center">
            <span 
              className="text-sm font-semibold"
              style={{ color: getProgressColor(item.progress, item.progress > 0) }}
            >
              {item.progress > 0 ? `${Math.round(item.progress)}%` : '—'}
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
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                Unassigned
              </span>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && item.children.map((child) => renderTreeItem(child, depth + 1))}
      </div>
    );
  };

  const headerAction = (
    <div className="flex items-center gap-2">
      <div className="relative w-44">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--text-3)' }} />
        <Input
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-sm"
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
        className="h-8 w-8"
        onClick={() => navigate('/enterprise/okr-hub')}
        title="Open OKR Hub"
      >
        <Maximize2 className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <PremiumCard>
        <PremiumCardHeader title="OKR Tree" action={headerAction} />
        <PremiumCardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard>
      <PremiumCardHeader title="OKR Tree" subtitle="Themes → Objectives → Key Results" action={headerAction} />
      <PremiumCardContent noPadding>
        {/* Column Headers - sticky, compact */}
        <div
          className="grid items-center py-2 px-4 font-semibold text-[11px] uppercase tracking-wider sticky top-0 z-10"
          style={{
            gridTemplateColumns: '1fr 120px 50px 48px',
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

        {/* Tree Content - compact rows */}
        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
          {treeData.length > 0 ? (
            treeData.map((item) => renderTreeItem(item, 0))
          ) : (
            <div className="py-10 px-6 text-center">
              <div 
                className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
                style={{ backgroundColor: 'hsl(var(--secondary-green) / 0.1)' }}
              >
                <Target className="w-5 h-5" style={{ color: 'hsl(var(--secondary-green))' }} />
              </div>
              <p 
                className="text-[15px] font-semibold mb-1"
                style={{ color: 'var(--text-1)' }}
              >
                No OKRs linked to this snapshot
              </p>
              <p 
                className="text-[13px] mb-4 max-w-xs mx-auto"
                style={{ color: 'var(--text-3)' }}
              >
                Create objectives to start tracking progress, alignment, and risk.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button 
                  size="sm" 
                  className="gap-1.5 h-8 text-[13px] px-4"
                  style={{ backgroundColor: 'hsl(var(--brand-gold))', color: 'white' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Objective
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 text-[13px] px-4"
                  onClick={() => navigate('/enterprise/okr-hub')}
                >
                  Open OKR Hub
                </Button>
              </div>
            </div>
          )}
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
