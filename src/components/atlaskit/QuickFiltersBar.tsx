import Button from '@atlaskit/button';
import { token } from '@atlaskit/tokens';

interface QuickFilter {
  key: string;
  label: string;
  count?: number;
}

interface QuickFiltersBarProps {
  filters: QuickFilter[];
  activeFilter: string | null;
  onFilterChange: (filterKey: string | null) => void;
}

export function QuickFiltersBar({ filters, activeFilter, onFilterChange }: QuickFiltersBarProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: token('space.100', '8px'),
      padding: `${token('space.100', '8px')} 0`,
      borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
      marginBottom: token('space.200', '16px'),
      overflowX: 'auto',
    }}>
      <span style={{ 
        fontSize: '12px', 
        color: token('color.text.subtle', '#6B778C'),
        whiteSpace: 'nowrap',
        marginRight: token('space.050', '4px'),
      }}>
        Quick filters:
      </span>
      
      <Button
        appearance={activeFilter === null ? 'primary' : 'subtle'}
        spacing="compact"
        onClick={() => onFilterChange(null)}
      >
        All
      </Button>
      
      {filters.map((filter) => (
        <Button
          key={filter.key}
          appearance={activeFilter === filter.key ? 'primary' : 'subtle'}
          spacing="compact"
          onClick={() => onFilterChange(filter.key)}
        >
          {filter.label}
          {filter.count !== undefined && (
            <span style={{
              marginLeft: token('space.050', '4px'),
              padding: `0 ${token('space.050', '4px')}`,
              background: activeFilter === filter.key 
                ? 'rgba(255,255,255,0.2)' 
                : token('color.background.neutral', '#DFE1E6'),
              borderRadius: '10px',
              fontSize: '11px',
            }}>
              {filter.count}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}

export default QuickFiltersBar;
