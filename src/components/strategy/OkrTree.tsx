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
  if (progress < 30) return '#B85C5C';
  if (progress >= 70) return '#5C7C5C';
  return '#C69C6D';
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

    return (
      <div key={item.id}>
        <div
          className={`grid items-center py-3 transition-colors ${
            isObjective || isTheme ? 'cursor-pointer hover:bg-[#F6F8FA] dark:hover:bg-[#161B22]' : ''
          }`}
          style={{
            gridTemplateColumns: '1fr 200px 50px 80px',
            borderBottom: '1px solid var(--divider-subtle)',
            backgroundColor: isTheme ? 'var(--surface-2)' : 'transparent',
          }}
          onClick={() => {
            if (isTheme && onThemeClick) {
              onThemeClick({ id: item.id, name: item.title, type: 'theme' });
            } else if (isObjective) {
              onObjectiveClick({ id: item.id, title: item.title, type: 'objective_v2' });
            }
          }}
        >
          {/* Item with expand/collapse, badge, and name */}
          <div 
            className="flex items-center gap-2 min-w-0 px-4"
            style={{ paddingLeft: `${indentPx + 16}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.id);
                }}
                className="flex items-center justify-center w-5 h-5 flex-shrink-0 transition-transform rounded"
                style={{ color: 'var(--text-2)' }}
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
            
            {/* Badge with proper colors */}
            <span 
              className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase flex-shrink-0"
              style={{ 
                backgroundColor: badge.bg, 
                color: badge.color 
              }}
            >
              {badge.label}
            </span>
            
            {/* Name */}
            <span 
              className={`text-sm truncate ${isObjective || isTheme ? 'font-medium' : ''}`}
              style={{ color: 'var(--text-1)' }}
            >
              {item.title}
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 px-4">
            <div 
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--surface-3)' }}
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
              className="text-sm tabular-nums"
              style={{ color: 'var(--text-2)' }}
            >
              {item.progress > 0 ? `${Math.round(item.progress)}%` : '—'}
            </span>
          </div>

          {/* Owner */}
          <div className="flex items-center gap-2 px-4">
            {item.owner ? (
              <>
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: '#C69C6D' }}
                >
                  {item.owner.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <span 
                  className="text-sm truncate"
                  style={{ color: 'var(--text-2)' }}
                >
                  {item.owner.name.split(' ')[0]}
                </span>
              </>
            ) : (
              <span className="text-sm" style={{ color: 'var(--text-3)' }}>—</span>
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
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--divider)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div 
          className="px-6 py-4"
          style={{ borderBottom: '1px solid var(--divider-subtle)' }}
        >
          <h2 
            className="text-lg font-semibold"
            style={{ color: 'var(--text-1)' }}
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
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--divider)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div 
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--divider-subtle)' }}
      >
        <div>
          <h2 
            className="text-lg font-semibold"
            style={{ color: 'var(--text-1)' }}
          >
            OKR Tree
          </h2>
          {/* Colored breadcrumb per specification */}
          <div 
            className="flex items-center gap-2 mt-1 text-sm"
            style={{ color: 'var(--text-2)' }}
          >
            <span className="font-medium" style={{ color: '#5C7C5C' }}>Theme</span>
            <ArrowRight size={14} style={{ color: 'var(--text-3)' }} />
            <span className="font-medium" style={{ color: '#C69C6D' }}>Objective</span>
            <ArrowRight size={14} style={{ color: 'var(--text-3)' }} />
            <span className="font-medium" style={{ color: '#8B7355' }}>Key Results</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" 
              style={{ color: 'var(--text-3)' }} 
            />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
              style={{ 
                backgroundColor: 'var(--surface-1)', 
                borderColor: 'var(--divider)',
                color: 'var(--text-1)'
              }}
            />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={() => navigate('/enterprise/okr-hub')}
            title="Expand to OKR Hub"
            style={{ color: 'var(--text-2)' }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Column Headers */}
      <div
        className="grid items-center py-3"
        style={{
          gridTemplateColumns: '1fr 200px 50px 80px',
          backgroundColor: 'var(--surface-2)',
          borderBottom: '1px solid var(--divider)',
        }}
      >
        <div 
          className="text-[11px] font-semibold uppercase tracking-wider px-6"
          style={{ color: 'var(--text-2)' }}
        >
          Item
        </div>
        <div 
          className="text-[11px] font-semibold uppercase tracking-wider px-4"
          style={{ color: 'var(--text-2)' }}
        >
          Progress
        </div>
        <div 
          className="text-[11px] font-semibold uppercase tracking-wider text-center px-2"
          style={{ color: 'var(--text-2)' }}
        >
          %
        </div>
        <div 
          className="text-[11px] font-semibold uppercase tracking-wider px-4"
          style={{ color: 'var(--text-2)' }}
        >
          Owner
        </div>
      </div>

      {/* Tree Content */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {treeData.length > 0 ? (
          treeData.map((item) => renderTreeItem(item, 0))
        ) : (
          <div className="py-12 px-6 text-center">
            <div 
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--surface-2)' }}
            >
              <Target className="w-6 h-6" style={{ color: 'var(--text-3)' }} />
            </div>
            <p 
              className="text-base font-medium mb-2"
              style={{ color: 'var(--text-1)' }}
            >
              No OKRs linked to this snapshot
            </p>
            <p 
              className="text-sm max-w-[300px] mx-auto"
              style={{ color: 'var(--text-2)' }}
            >
              Create objectives to start tracking progress, alignment, and risk.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
