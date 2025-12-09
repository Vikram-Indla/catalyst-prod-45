import { useState } from 'react';
import Drawer from '@atlaskit/drawer';
import Button from '@atlaskit/button';
import { token } from '@atlaskit/tokens';

interface SavedFilter {
  id: string;
  name: string;
  count?: number;
}

interface SavedFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedFilters?: SavedFilter[];
  onSelectFilter?: (filter: SavedFilter) => void;
  onCreateFilter?: () => void;
}

export function SavedFiltersDrawer({ 
  isOpen, 
  onClose, 
  savedFilters = [],
  onSelectFilter,
  onCreateFilter,
}: SavedFiltersDrawerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Default filters for demo
  const filters: SavedFilter[] = savedFilters.length > 0 ? savedFilters : [
    { id: '1', name: 'My Open Requests', count: 23 },
    { id: '2', name: 'High Priority', count: 8 },
    { id: '3', name: 'This Quarter', count: 45 },
    { id: '4', name: 'Unassigned', count: 12 },
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width="medium"
      label="Saved Filters"
    >
      <div style={{ padding: token('space.400', '32px') }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 500,
          color: token('color.text', '#172B4D'),
          margin: `0 0 ${token('space.300', '24px')} 0`,
        }}>
          Saved Filters
        </h2>
        
        {filters.map(filter => (
          <button
            key={filter.id}
            onClick={() => {
              onSelectFilter?.(filter);
              onClose();
            }}
            onMouseEnter={() => setHoveredId(filter.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: token('space.200', '16px'),
              background: hoveredId === filter.id 
                ? token('color.background.neutral.hovered', '#EBECF0') 
                : 'transparent',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              marginBottom: token('space.100', '8px'),
              transition: 'background 150ms ease-in-out',
              textAlign: 'left',
            }}
          >
            <span style={{
              fontSize: '14px',
              color: token('color.text', '#172B4D'),
            }}>
              {filter.name}
            </span>
            {filter.count !== undefined && (
              <span style={{
                fontSize: '12px',
                color: token('color.text.subtlest', '#6B778C'),
              }}>
                {filter.count}
              </span>
            )}
          </button>
        ))}
        
        <Button 
          appearance="primary" 
          onClick={onCreateFilter}
          style={{ marginTop: token('space.300', '24px') }}
        >
          Create New Filter
        </Button>
      </div>
    </Drawer>
  );
}

export default SavedFiltersDrawer;
