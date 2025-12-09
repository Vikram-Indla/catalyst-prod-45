import { useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import { Factory } from 'lucide-react';

interface DemandSelectorDropdownProps {
  onClose: () => void;
}

export function DemandSelectorDropdown({ onClose }: DemandSelectorDropdownProps) {
  const navigate = useNavigate();

  const handleSelect = () => {
    navigate('/industry');
    onClose();
  };

  return (
    <div style={{
      width: '256px',
      background: token('elevation.surface', '#FFFFFF'),
      borderRadius: '3px',
      boxShadow: '0 4px 8px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}>
        <p style={{
          fontSize: '11px',
          fontWeight: 600,
          color: token('color.text.subtlest', '#6B778C'),
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          DEMAND
        </p>
      </div>
      <div style={{ padding: '8px' }}>
        <button
          onClick={handleSelect}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '8px 12px',
            borderRadius: '3px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = token('color.background.neutral.hovered', '#F4F5F7');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Factory style={{ 
            width: '16px', 
            height: '16px', 
            color: token('color.icon', '#6B778C'),
            flexShrink: 0,
          }} />
          <span style={{
            flex: 1,
            fontSize: '14px',
            fontWeight: 500,
            color: token('color.text', '#172B4D'),
          }}>
            Industry
          </span>
        </button>
      </div>
    </div>
  );
}
