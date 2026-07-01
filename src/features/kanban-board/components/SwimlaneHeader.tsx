/**
 * SwimlaneHeader — collapsible group row spanning the board width.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
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
  /** Leading slot: between chevron and label (e.g. epic icon + swatch + key). */
  labelNode?: React.ReactNode;
  /** Trailing slot: after count (e.g. status lozenge). */
  trailingNode?: React.ReactNode;
  onToggle: () => void;
}

export const SwimlaneHeader: React.FC<Props> = ({
  label, count, collapsed, avatarName, avatarUrl, showAvatar, labelNode, trailingNode, onToggle,
}) => (
  <button
    onClick={onToggle}
    aria-expanded={!collapsed}
    style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
      height: SIZES.COLUMN_HEADER_HEIGHT, padding: `0 ${SIZES.PAGE_PADDING_X}px`,
      border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
      marginTop: 16,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered)'); }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
  >
    <span style={{ display: 'inline-flex', flexShrink: 0 }}>
      {collapsed
        ? <ChevronRightIcon label="" size="small" primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle)')} />
        : <ChevronDownIcon label="" size="small" primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle)')} />}
    </span>
    {labelNode}
    {showAvatar && <CatalystAvatar size="small" src={avatarUrl ?? undefined} name={avatarName || label} />}
    <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: token('color.text', 'var(--ds-text)'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '20px' }}>
      {label}
    </span>
    <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 400, color: token('color.text.subtlest', 'var(--ds-text-subtlest)'), flexShrink: 0, lineHeight: '20px' }}>
      ({count} work item{count === 1 ? '' : 's'})
    </span>
    {trailingNode}
  </button>
);
