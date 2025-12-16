import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Maximize2, ChevronRight, ChevronDown, Target, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOKRTreeV2, OKRTreeV2Item } from '@/hooks/useOKRTreeV2';

interface OkrTreeProps {
  selectedSnapshot: string;
  onObjectiveClick: (objective: any) => void;
  onThemeClick?: (theme: any) => void;
}

function getProgressColor(progress: number): string {
  if (progress === 0) return 'var(--text-3)';
  if (progress < 30) return 'var(--destructive)';
  if (progress >= 70) return 'var(--secondary-green)';
  return 'var(--brand-gold)';
}

function getProgressBarColor(progress: number): string {
  if (progress < 30) return 'var(--destructive)';
  if (progress >= 70) return 'var(--secondary-green)';
  return 'var(--brand-gold)';
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

    return (
      <div key={item.id}>
        <div
          className={`grid items-center py-3 transition-colors ${
            isObjective || isTheme ? 'cursor-pointer hover:bg-[var(--surface-2)]' : ''
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
            
            {/* Badge */}
            {isTheme && (
              <span 
                className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase flex-shrink-0"
                style={{ 
                  backgroundColor: 'rgba(92, 124, 92, 0.15)', 
                  color: 'var(--secondary-green)' 
                }}
              >
                THEME
              </span>
            )}
            {isObjective && (
              <span 
                className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase flex-shrink-0"
                style={{ 
                  backgroundColor: 'rgba(198, 156, 109, 0.15)', 
                  color: 'var(--brand-gold)' 
                }}
              >
                OBJ
              </span>
            )}
            {isKeyResult && (
              <span 
                className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase flex-shrink-0"
                style={{ 
                  backgroundColor: 'rgba(139, 115, 85, 0.15)', 
                  color: 'var(--secondary-bronze)' 
                }}
              >
                KR
              </span>
            )}
            
            {/* Name */}
            <span 
              className={`text-[14px] truncate ${isObjective ? 'font-medium' : ''}`}
              style={{ color: 'var(--text-1)' }}
            >
              {item.title}
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 px-4">
            <div 
              className="flex-1 h-[6px] rounded-full overflow-hidden"
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
              className="text-[13px] font-medium tabular-nums"
              style={{ color: 'var(--text-1)' }}
            >
              {item.progress > 0 ? `${Math.round(item.progress)}%` : '—'}
            </span>
          </div>

          {/* Owner */}
          <div className="flex justify-center px-4">
            {item.owner ? (
              <span 
                className="text-[13px]"
                style={{ color: 'var(--text-2)' }}
              >
                {item.owner.name.split(' ')[0]} {item.owner.name.split(' ')[1]?.[0]}.
              </span>
            ) : (
              <span className="text-[13px]" style={{ color: 'var(--text-3)' }}>—</span>
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
        className="rounded-[10px] overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--divider)',
          borderLeft: '3px solid var(--secondary-champagne)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div 
          className="px-5 py-4"
          style={{ borderBottom: '1px solid var(--divider-subtle)' }}
        >
          <h2 
            className="text-[15px] font-semibold"
            style={{ color: 'var(--text-1)' }}
          >
            OKR Tree
          </h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div 
            className="animate-spin rounded-full h-6 w-6 border-b-2" 
            style={{ borderColor: 'var(--brand-gold)' }}
          />
        </div>
      </section>
    );
  }

  return (
      <section 
        className="rounded-[10px] overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--divider)',
          borderLeft: '3px solid var(--secondary-champagne)',
          boxShadow: 'var(--shadow-sm)',
        }}
    >
      {/* Header */}
      <div 
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--divider-subtle)' }}
      >
        <div>
          <h2 
            className="text-[15px] font-semibold"
            style={{ color: 'var(--text-1)' }}
          >
            OKR Tree
          </h2>
          <p 
            className="text-[12px] mt-0.5 flex items-center gap-1.5"
            style={{ color: 'var(--text-2)' }}
          >
            <span style={{ color: 'var(--secondary-green)' }}>Theme</span>
            <span>→</span>
            <span style={{ color: 'var(--secondary-green)' }}>Objective</span>
            <span>→</span>
            <span style={{ color: 'var(--secondary-green)' }}>Key Results</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" 
              style={{ color: 'var(--text-3)' }} 
            />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-[13px]"
              style={{ 
                backgroundColor: 'var(--surface-2)', 
                borderColor: 'var(--divider)',
                color: 'var(--text-1)'
              }}
            />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
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
          className="text-[11px] font-semibold uppercase tracking-wide px-4"
          style={{ color: 'var(--text-2)' }}
        >
          Item
        </div>
        <div 
          className="text-[11px] font-semibold uppercase tracking-wide px-4"
          style={{ color: 'var(--text-2)' }}
        >
          Progress
        </div>
        <div 
          className="text-[11px] font-semibold uppercase tracking-wide text-center px-2"
          style={{ color: 'var(--text-2)' }}
        >
          %
        </div>
        <div 
          className="text-[11px] font-semibold uppercase tracking-wide text-center px-4"
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
              className="text-[15px] font-medium mb-2"
              style={{ color: 'var(--text-1)' }}
            >
              No OKRs linked to this snapshot
            </p>
            <p 
              className="text-[13px] max-w-[300px] mx-auto"
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
