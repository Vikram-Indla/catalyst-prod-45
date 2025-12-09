import { useState, useRef, useEffect } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';

interface CollapsibleSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItemProps {
  icon: string;
  label: string;
  isCollapsed: boolean;
  isSelected?: boolean;
  href: string;
}

function NavItem({ icon, label, isCollapsed, isSelected = false, href }: NavItemProps) {
  const content = (
    <a
      href={href}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: token('space.150', '12px'),
        padding: `${token('space.100', '8px')} ${token('space.150', '12px')}`,
        background: isSelected ? token('color.background.selected', '#DEEBFF') : 'transparent',
        border: 'none',
        borderRadius: '3px',
        color: isSelected ? token('color.text.selected', '#0052CC') : token('color.text', '#172B4D'),
        fontSize: '14px',
        fontWeight: isSelected ? 600 : 400,
        cursor: 'pointer',
        textAlign: 'left',
        marginBottom: token('space.050', '4px'),
        transition: 'background 150ms',
        textDecoration: 'none',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = token('color.background.neutral.hovered', '#EBECF0');
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <span style={{ fontSize: '16px', flexShrink: 0 }}>{icon}</span>
      {!isCollapsed && <span>{label}</span>}
    </a>
  );

  if (isCollapsed) {
    return <Tooltip content={label}>{content}</Tooltip>;
  }

  return content;
}

export function CollapsibleSidebar({ isCollapsed, onToggle }: CollapsibleSidebarProps) {
  return (
    <aside style={{
      width: isCollapsed ? '48px' : '240px',
      background: token('color.background.neutral.subtle', '#FAFBFC'),
      borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
      transition: 'width 200ms ease-in-out',
    }}>
      {/* Header */}
      <div style={{
        padding: token('space.200', '16px'),
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        display: 'flex',
        alignItems: 'center',
        gap: token('space.150', '12px'),
        minHeight: '64px',
      }}>
        {!isCollapsed && (
          <>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#1A1A1A',
              color: '#D4A574',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '14px',
              flexShrink: 0,
            }}>
              PR
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
              }}>
                Product
              </div>
              <div style={{
                fontSize: '12px',
                color: token('color.text.subtlest', '#6B778C'),
              }}>
                Industry
              </div>
            </div>
          </>
        )}
        <Tooltip content={isCollapsed ? 'Expand sidebar (])' : 'Collapse sidebar ([)'}>
          <Button
            appearance="subtle"
            iconBefore={
              isCollapsed 
                ? <ChevronRightIcon label="Expand" size="small" />
                : <ChevronLeftIcon label="Collapse" size="small" />
            }
            onClick={onToggle}
            style={{
              marginLeft: isCollapsed ? '0' : 'auto',
            }}
          />
        </Tooltip>
      </div>
      
      {/* Navigation Items */}
      <nav style={{ padding: token('space.200', '16px'), flex: 1 }}>
        <NavItem 
          icon="🏠" 
          label="Product Room" 
          isCollapsed={isCollapsed}
          href="/product/room"
        />
        <NavItem 
          icon="📋" 
          label="Backlog" 
          isCollapsed={isCollapsed}
          isSelected
          href="/industry"
        />
        <NavItem 
          icon="🗺️" 
          label="Roadmap" 
          isCollapsed={isCollapsed}
          href="/product/roadmap"
        />
        <NavItem 
          icon="📊" 
          label="Capacity" 
          isCollapsed={isCollapsed}
          href="/product/capacity"
        />
        <NavItem 
          icon="📚" 
          label="Knowledge Hub" 
          isCollapsed={isCollapsed}
          href="/product/knowledge"
        />
        
        <div style={{
          height: '1px',
          background: token('color.border', '#DFE1E6'),
          margin: `${token('space.300', '24px')} 0`,
        }} />
        
        <NavItem 
          icon="⚙️" 
          label="Product Settings" 
          isCollapsed={isCollapsed}
          href="/product/settings"
        />
      </nav>
    </aside>
  );
}

export default CollapsibleSidebar;
