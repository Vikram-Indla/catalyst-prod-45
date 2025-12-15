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

function getHealthBadgeStyle(health: string | null): { bg: string; text: string } {
  switch (health?.toLowerCase()) {
    case 'good': 
      return { bg: 'hsl(var(--secondary-green) / 0.1)', text: 'hsl(var(--secondary-green))' };
    case 'fair': 
    case 'at_risk':
      return { bg: 'hsl(var(--brand-gold) / 0.1)', text: 'hsl(var(--brand-gold))' };
    case 'poor': 
      return { bg: 'hsl(var(--destructive) / 0.1)', text: 'hsl(var(--destructive))' };
    default: 
      return { bg: 'var(--surface-3)', text: 'var(--text-3)' };
  }
}

function getProgressColor(progress: number): string {
  if (progress === 0) return 'var(--text-3)';
  if (progress >= 70) return 'hsl(var(--secondary-green))';
  if (progress >= 40) return 'hsl(var(--brand-gold))';
  return 'var(--text-2)';
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
          className={`grid items-center py-2 transition-colors focus:outline-none ${
            isObjective || isTheme ? 'cursor-pointer hover:bg-[var(--surface-2)]' : ''
          }`}
          style={{
            gridTemplateColumns: '1fr 120px 48px 48px',
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
          <div className="flex items-center gap-1.5 min-w-0" style={{ paddingLeft: `${indentPx + 12}px` }}>
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.id);
                }}
                className="flex items-center justify-center w-5 h-5 flex-shrink-0 transition-transform"
                style={{ color: 'var(--text-3)' }}
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
              <span 
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase flex-shrink-0"
                style={{ 
                  backgroundColor: 'hsl(var(--brand-gold) / 0.1)', 
                  color: 'hsl(var(--brand-gold))' 
                }}
              >
                <Palette className="h-3 w-3" />
                Theme
              </span>
            )}
            {isObjective && (
              <span 
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase flex-shrink-0"
                style={{ 
                  backgroundColor: 'hsl(var(--secondary-green) / 0.1)', 
                  color: 'hsl(var(--secondary-green))' 
                }}
              >
                <Target className="h-3 w-3" />
                Obj
              </span>
            )}
            {isKeyResult && (
              <span 
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase flex-shrink-0"
                style={{ 
                  backgroundColor: 'var(--surface-3)', 
                  color: 'var(--text-2)' 
                }}
              >
                KR
              </span>
            )}
            
            <span 
              className={`text-[13px] truncate ${isObjective ? 'font-medium' : ''}`}
              style={{ color: isObjective ? 'hsl(var(--secondary-green))' : 'var(--text-1)' }}
            >
              {item.title}
            </span>
            
            {isObjective && item.health && (
              <span 
                className="px-1.5 py-0.5 rounded text-[10px] font-medium capitalize flex-shrink-0 ml-1"
                style={{ 
                  backgroundColor: getHealthBadgeStyle(item.health).bg,
                  color: getHealthBadgeStyle(item.health).text,
                }}
              >
                {item.health}
              </span>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 px-2">
            <div 
              className="w-[72px] h-[5px] rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--surface-3)' }}
            >
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
            <span 
              className="text-[13px] font-semibold tabular-nums"
              style={{ color: getProgressColor(item.progress) }}
            >
              {item.progress > 0 ? `${Math.round(item.progress)}%` : '—'}
            </span>
          </div>

          <div className="flex justify-center">
            {item.owner ? (
              <Avatar className="h-6 w-6" style={{ border: '1px solid var(--divider)' }}>
                <AvatarImage src={item.owner.avatar} alt={item.owner.name} />
                <AvatarFallback 
                  className="text-[10px] font-bold"
                  style={{ backgroundColor: 'hsl(var(--brand-dark))', color: 'white' }}
                >
                  {item.owner.initials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>—</span>
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
          className="pl-8 h-7 text-[12px]"
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
      <PremiumCard accent="champagne">
        <PremiumCardHeader title="OKR Tree" action={headerAction} />
        <PremiumCardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'hsl(var(--brand-gold))' }}></div>
        </PremiumCardContent>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard accent="champagne">
      <PremiumCardHeader 
        title="OKR Tree" 
        subtitle="Theme → Objective → Key Results"
        action={headerAction} 
      />
      <PremiumCardContent noPadding>
        {/* Column Headers - sticky */}
        <div
          className="grid items-center py-2 px-0 font-semibold text-[11px] uppercase tracking-wider sticky top-0 z-10"
          style={{
            gridTemplateColumns: '1fr 120px 48px 48px',
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--divider)',
            color: 'var(--text-2)',
          }}
        >
          <div style={{ paddingLeft: '12px' }}>Item</div>
          <div className="text-center">Progress</div>
          <div className="text-center">%</div>
          <div className="text-center">Owner</div>
        </div>

        {/* Tree Content */}
        <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
          {treeData.length > 0 ? (
            treeData.map((item) => renderTreeItem(item, 0))
          ) : (
            <div className="py-12 px-6 text-center">
              <div 
                className="w-11 h-11 rounded-full mx-auto flex items-center justify-center mb-3"
                style={{ backgroundColor: 'hsl(var(--secondary-green) / 0.1)' }}
              >
                <Target className="w-5 h-5" style={{ color: 'hsl(var(--secondary-green))' }} />
              </div>
              <p 
                className="text-[14px] font-semibold mb-1"
                style={{ color: 'var(--text-1)' }}
              >
                No OKRs linked to this snapshot
              </p>
              <p 
                className="text-[13px] mb-4 max-w-[280px] mx-auto"
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
