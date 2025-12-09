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
      background: token('color.background.brand.boldest', '#0747A6'),
      color: token('color.text.inverse', '#FFFFFF'),
      padding: token('space.200', '16px'),
      borderRadius: token('border.radius', '3px'),
      boxShadow: token('elevation.shadow.overlay', '0 4px 8px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)'),
      display: 'flex',
      alignItems: 'center',
      gap: token('space.200', '16px'),
      zIndex: 500,
      minWidth: '600px',
    }}>
      {/* Selected Count */}
      <span style={{ 
        fontWeight: 600, 
        fontSize: '14px',
        whiteSpace: 'nowrap',
        color: token('color.text.inverse', '#FFFFFF'),
      }}>
        {selectedCount} selected
      </span>
      
      {/* Clear Button */}
      <Button 
        appearance="subtle" 
        onClick={onClear}
        style={{ color: token('color.text.inverse', '#FFFFFF') }}
      >
        Clear
      </Button>
      
      {/* Divider */}
      <div style={{
        width: '1px',
        height: '24px',
        background: 'rgba(255, 255, 255, 0.3)',
      }} />
      
      {/* Update Status Button */}
      {onUpdateStatus && (
        <Button 
          appearance="subtle" 
          onClick={onUpdateStatus}
          style={{ color: token('color.text.inverse', '#FFFFFF') }}
        >
          Update Status
        </Button>
      )}
      
      {/* Assign Button */}
      {onAssign && (
        <Button 
          appearance="subtle" 
          onClick={onAssign}
          style={{ color: token('color.text.inverse', '#FFFFFF') }}
        >
          Assign
        </Button>
      )}
      
      {/* Delete Button - Warning appearance for destructive action */}
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
