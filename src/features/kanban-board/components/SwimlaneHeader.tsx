/**
 * SwimlaneHeader — collapsible group row spanning the board width.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { SIZES } from '../constants';

interface Props {
  label: string;
  count: number;
  collapsed: boolean;
  avatarName?: string | null;
  avatarUrl?: string | null;
  showAvatar?: boolean;
  onToggle: () => void;
}

export const SwimlaneHeader: React.FC<Props> = ({ label, count, collapsed, avatarName, avatarUrl, showAvatar, onToggle }) => (
  <button
    onClick={onToggle}
    aria-expanded={!collapsed}
    style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
      height: SIZES.COLUMN_HEADER_HEIGHT, padding: `0 ${SIZES.PAGE_PADDING_X}px`,
      border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
      borderTop: `1px solid ${token('color.border', '#091E4224')}`, marginTop: 4,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#091E420F'); }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
  >
    <span style={{ display: 'inline-flex', flexShrink: 0 }}>
      {collapsed
        ? <ChevronRightIcon label="" size="medium" primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle)')} />
        : <ChevronDownIcon label="" size="medium" primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle)')} />}
    </span>
    {showAvatar && <Avatar size="small" src={avatarUrl ?? undefined} name={avatarName || label} />}
    <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: token('color.text', 'var(--ds-text)'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {label}
    </span>
    <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 400, color: token('color.text.subtlest', 'var(--ds-icon-subtle)'), flexShrink: 0 }}>
      ({count} work item{count === 1 ? '' : 's'})
    </span>
  </button>
);
