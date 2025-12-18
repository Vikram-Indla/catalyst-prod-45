import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Maximize2, ChevronRight, ChevronDown, Target, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useOKRTreeV2, OKRTreeV2Item } from '@/hooks/useOKRTreeV2';

interface OkrTreeProps {
  selectedSnapshot: string;
  onObjectiveClick: (objective: any) => void;
  onThemeClick?: (theme: any) => void;
}

function getProgressBarColor(progress: number): string {
  if (progress < 30) return 'hsl(var(--destructive))';
  if (progress >= 70) return 'hsl(var(--secondary-green))';
  return 'hsl(var(--brand-primary))';
}

export function OkrTree({ selectedSnapshot, onObjectiveClick, onThemeClick }: OkrTreeProps) {
  const navigate = useNavigate();
  const { data: treeData = [], isLoading } = useOKRTreeV2(selectedSnapshot);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

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

    // Badge colors per specification
    const getBadgeStyle = () => {
      if (isTheme) return { bg: 'rgba(92, 124, 92, 0.1)', color: '#5C7C5C', label: 'Theme' };
      if (isObjective) return { bg: 'rgba(198, 156, 109, 0.1)', color: '#C69C6D', label: 'Objective' };
      if (isKeyResult) return { bg: 'rgba(139, 115, 85, 0.1)', color: '#8B7355', label: 'Key Result' };
      return { bg: 'var(--surface-3)', color: 'var(--text-2)', label: '' };
    };

    const badge = getBadgeStyle();

    const handleActivate = () => {
      if (isTheme && onThemeClick) {
        onThemeClick({ id: item.id, name: item.title, type: 'theme' });
      } else if (isObjective) {
        onObjectiveClick({ id: item.id, title: item.title, type: 'objective_v2' });
      }
    };

    const isClickable = isObjective || (isTheme && !!onThemeClick);

    return (
      <div key={item.id}>
        <div
          className={`grid items-center py-2.5 transition-colors ${isClickable ? 'cursor-pointer' : ''}`}
          role={isClickable ? 'button' : undefined}
          tabIndex={isClickable ? 0 : -1}
          style={{
            gridTemplateColumns: '1fr 180px 50px 120px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: isTheme ? 'var(--surface-subtle)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (isClickable) {
              e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isTheme ? 'var(--surface-subtle)' : 'transparent';
          }}
          onClick={() => {
            if (isClickable) handleActivate();
          }}
          onPointerUp={(e) => {
            // Mobile/touch: make activation reliable even inside scroll containers
            if (!isClickable) return;
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
              handleActivate();
            }
          }}
          onKeyDown={(e) => {
            if (!isClickable) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleActivate();
            }
          }}
        >
          {/* Item with expand/collapse, badge, and name */}
          <div 
            className="flex items-center gap-1.5 min-w-0 px-3"
            style={{ paddingLeft: `${indentPx + 12}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.id);
                }}
                className="flex items-center justify-center w-4 h-4 flex-shrink-0 transition-transform rounded"
                style={{ color: 'var(--text-muted)' }}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="w-4 flex-shrink-0" />
            )}
            
            {/* Badge with proper colors */}
            <span 
              className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase flex-shrink-0"
              style={{ 
                backgroundColor: badge.bg, 
                color: badge.color 
              }}
            >
              {badge.label}
            </span>
            
            {/* Name */}
            <span 
              className={`text-[13px] truncate ${isObjective || isTheme ? 'font-medium' : ''}`}
              style={{ color: 'var(--text-primary)' }}
            >
              {item.title}
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 px-3">
            <div 
              className="flex-1 h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--progress-bg)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${item.progress}%`,
                  backgroundColor: getProgressBarColor(item.progress)
                }}
              />
            </div>
          </div>

          {/* Percentage */}
          <div className="text-center px-2">
            <span 
              className="text-[12px] tabular-nums"
              style={{ color: 'var(--text-muted)' }}
            >
              {item.progress > 0 ? `${Math.round(item.progress)}%` : '—'}
            </span>
          </div>

          {/* Owner */}
          <div className="flex items-center gap-1.5 px-3">
            {item.owner ? (
              <>
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  {item.owner.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <span 
                  className="text-[12px] truncate"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {item.owner.name.split(' ')[0]}
                </span>
              </>
            ) : (
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>—</span>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && item.children.map((child) => renderTreeItem(child, depth + 1))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <section 
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-bg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div 
          className="px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2 
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            OKR Tree
          </h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div 
            className="animate-spin rounded-full h-6 w-6 border-b-2" 
            style={{ borderColor: '#C69C6D' }}
          />
        </div>
      </section>
    );
  }

  return (
    <section 
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-bg)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header with section title pattern */}
      <div 
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div>
          <h2 
            className="text-[15px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            OKR Tree
          </h2>
          {/* Colored breadcrumb per specification */}
          <div 
            className="flex items-center gap-1.5 mt-0.5 text-[11px]"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="font-medium" style={{ color: 'var(--secondary-green)' }}>Theme</span>
            <ArrowRight size={10} style={{ color: 'var(--text-muted)' }} />
            <span className="font-medium" style={{ color: 'var(--brand-gold)' }}>Objective</span>
            <ArrowRight size={10} style={{ color: 'var(--text-muted)' }} />
            <span className="font-medium" style={{ color: 'var(--secondary-bronze)' }}>Key Results</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-52">
            <Search 
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" 
              style={{ color: 'var(--text-muted)' }} 
            />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-[12px]"
              style={{ 
                backgroundColor: 'var(--surface-bg)', 
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => navigate('/enterprise/okr-hub')}
            title="Expand to OKR Hub"
            style={{ color: 'var(--text-muted)' }}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Column Headers */}
      <div
        className="grid items-center py-2.5"
        style={{
          gridTemplateColumns: '1fr 180px 50px 120px',
          backgroundColor: 'var(--surface-subtle)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div 
          className="text-[10px] font-semibold uppercase tracking-wider px-5"
          style={{ color: 'var(--text-muted)' }}
        >
          Item
        </div>
        <div 
          className="text-[10px] font-semibold uppercase tracking-wider px-3"
          style={{ color: 'var(--text-muted)' }}
        >
          Progress
        </div>
        <div 
          className="text-[10px] font-semibold uppercase tracking-wider text-center px-2"
          style={{ color: 'var(--text-muted)' }}
        >
          %
        </div>
        <div 
          className="text-[10px] font-semibold uppercase tracking-wider px-3"
          style={{ color: 'var(--text-muted)' }}
        >
          Owner
        </div>
      </div>

      {/* Tree Content */}
      <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
        {treeData.length > 0 ? (
          treeData.map((item) => renderTreeItem(item, 0))
        ) : (
          <div className="py-10 px-5 text-center">
            <div 
              className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-3"
              style={{ backgroundColor: 'var(--surface-subtle)' }}
            >
              <Target className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p 
              className="text-[14px] font-medium mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              No OKRs linked to this snapshot
            </p>
            <p 
              className="text-[12px] max-w-[280px] mx-auto"
              style={{ color: 'var(--text-muted)' }}
            >
              Create objectives to start tracking progress, alignment, and risk.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
