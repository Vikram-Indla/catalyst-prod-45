import Button from '@atlaskit/button';
import { token } from '@atlaskit/tokens';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onUpdateStatus?: () => void;
  onAssign?: () => void;
  onDelete?: () => void;
}

export function BulkActionsBar({ 
  selectedCount, 
  onClear, 
  onUpdateStatus, 
  onAssign, 
  onDelete 
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: token('space.300', '24px'),
      left: '50%',
      transform: 'translateX(-50%)',
      background: token('color.background.brand.bold', '#0052CC'),
      color: '#fff',
      padding: token('space.200', '16px'),
      borderRadius: '3px',
      boxShadow: token('elevation.shadow.overlay', '0 4px 8px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'),
      display: 'flex',
      alignItems: 'center',
      gap: token('space.200', '16px'),
      zIndex: 500,
    }}>
      <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
        {selectedCount} selected
      </span>
      
      <Button 
        appearance="subtle" 
        onClick={onClear}
        style={{ color: '#fff' }}
      >
        Clear
      </Button>
      
      <div style={{
        width: '1px',
        height: '24px',
        background: 'rgba(255,255,255,0.3)',
      }} />
      
      {onUpdateStatus && (
        <Button 
          appearance="subtle" 
          onClick={onUpdateStatus}
          style={{ color: '#fff' }}
        >
          Update Status
        </Button>
      )}
      
      {onAssign && (
        <Button 
          appearance="subtle" 
          onClick={onAssign}
          style={{ color: '#fff' }}
        >
          Assign
        </Button>
      )}
      
      {onDelete && (
        <Button 
          appearance="warning" 
          onClick={onDelete}
        >
          Delete
        </Button>
      )}
    </div>
  );
}

export default BulkActionsBar;
