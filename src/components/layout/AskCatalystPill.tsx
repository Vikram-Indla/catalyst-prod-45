import { useNavigate } from 'react-router-dom';
import { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import { token } from '@atlaskit/tokens';

// Ask Catalyst — mirrors Jira's "Ask Rovo" pill styling exactly.
// White surface, subtle border, multi-stop colorful sparkle, medium label.
function AskCatalystIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 1.5l1.2 3.3 3.3 1.2-3.3 1.2L8 10.5 6.8 7.2 3.5 6l3.3-1.2L8 1.5zM12 9l.7 1.8 1.8.7-1.8.7L12 14l-.7-1.8-1.8-.7 1.8-.7L12 9z"
        fill="#2563EB"
      />
    </svg>
  );
}

interface AskCatalystPillProps {
  iconOnly?: boolean;
}

export function AskCatalystPill({ iconOnly = false }: AskCatalystPillProps) {
  const navigate = useNavigate();
  const handleClick = () => navigate('/wiki');

  if (iconOnly) {
    return (
      <Tooltip content="Ask Catalyst" position="bottom">
        <IconButton
          label="Ask Catalyst"
          appearance="subtle"
          icon={AskCatalystIcon}
          onClick={handleClick}
        />
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '32px',
        paddingInline: '12px',
        background: token('elevation.surface', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: '20px',
        cursor: 'pointer',
        color: token('color.text', '#172B4D'),
        font: token('font.body', '14px Inter, sans-serif'),
        fontWeight: 500,
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7');
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = token('elevation.surface', '#FFFFFF');
      }}
    >
      <AskCatalystIcon />
      <span>Ask Catalyst</span>
    </button>
  );
}

