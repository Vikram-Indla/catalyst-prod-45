import { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import HomeIcon from '@atlaskit/icon/glyph/home';
import FolderIcon from '@atlaskit/icon/glyph/folder';
import RoadmapIcon from '@atlaskit/icon/glyph/roadmap';
import GraphBarIcon from '@atlaskit/icon/glyph/graph-bar';
import BookIcon from '@atlaskit/icon/glyph/book';
import SettingsIcon from '@atlaskit/icon/glyph/settings';

// NavItem component with proper Atlaskit styling
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  isSelected?: boolean;
  href?: string;
  onClick?: () => void;
}

const NavItem = ({ icon, label, isCollapsed, isSelected = false, href, onClick }: NavItemProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const content = (
    <a
      href={href}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: token('space.150', '12px'),
        padding: `${token('space.100', '8px')} ${token('space.150', '12px')}`,
        background: isSelected 
          ? token('color.background.selected', '#DEEBFF')
          : isHovered 
            ? token('color.background.neutral.hovered', '#EBECF0')
            : 'transparent',
        borderRadius: '3px',
        color: isSelected 
          ? token('color.text.selected', '#0052CC')
          : token('color.text', '#172B4D'),
        fontSize: '14px',
        fontWeight: isSelected ? 600 : 400,
        cursor: 'pointer',
        textAlign: 'left' as const,
        marginBottom: token('space.050', '4px'),
        transition: 'background 150ms ease-in-out',
        textDecoration: 'none',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>
      {!isCollapsed && <span>{label}</span>}
    </a>
  );

  if (isCollapsed) {
    return <Tooltip content={label} position="right">{content}</Tooltip>;
  }

  return content;
};

interface SidebarProps {
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export const Sidebar = ({ isCollapsed: controlledCollapsed, onCollapsedChange }: SidebarProps = {}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed ?? internalCollapsed;
  
  const handleToggle = () => {
    const newValue = !isCollapsed;
    setInternalCollapsed(newValue);
    onCollapsedChange?.(newValue);
  };

  return (
    <aside style={{
      width: isCollapsed ? '48px' : '240px',
      minWidth: isCollapsed ? '48px' : '240px',
      maxWidth: isCollapsed ? '48px' : '240px',
      background: token('color.background.neutral.subtle', '#FAFBFC'),
      borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
      position: 'relative',
      zIndex: 100,
      transition: 'width 200ms ease-in-out, min-width 200ms ease-in-out, max-width 200ms ease-in-out',
    }}>
      {/* Sidebar Header */}
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
            {/* PR Badge */}
            <div style={{
              width: '32px',
              height: '32px',
              background: '#FFF4E6',
              color: '#D4A574',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '12px',
              flexShrink: 0,
            }}>
              PR
            </div>
            
            {/* Project Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
                lineHeight: '20px',
              }}>
                Product
              </div>
              <div style={{
                fontSize: '12px',
                color: token('color.text.subtlest', '#6B778C'),
                lineHeight: '16px',
              }}>
                Industry
              </div>
            </div>
          </>
        )}
        
        {/* Collapse/Expand Button */}
        <Tooltip content={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} position="right">
          <Button
            appearance="subtle"
            iconBefore={
              isCollapsed 
                ? <ChevronRightIcon label="Expand" size="small" />
                : <ChevronLeftIcon label="Collapse" size="small" />
            }
            onClick={handleToggle}
            style={{
              marginLeft: isCollapsed ? '0' : 'auto',
            }}
          />
        </Tooltip>
      </div>
      
      {/* Navigation Items */}
      <nav style={{
        flex: 1,
        padding: token('space.100', '8px'),
        overflowY: 'auto',
      }}>
        <NavItem 
          icon={<HomeIcon label="Product Room" size="small" />} 
          label="Product Room" 
          isCollapsed={isCollapsed}
          href="/product/room"
        />
        <NavItem 
          icon={<FolderIcon label="Backlog" size="small" />} 
          label="Backlog" 
          isCollapsed={isCollapsed}
          isSelected
          href="/industry"
        />
        <NavItem 
          icon={<RoadmapIcon label="Roadmap" size="small" />} 
          label="Roadmap" 
          isCollapsed={isCollapsed}
          href="/product/roadmap"
        />
        <NavItem 
          icon={<GraphBarIcon label="Capacity" size="small" />} 
          label="Capacity" 
          isCollapsed={isCollapsed}
          href="/product/capacity"
        />
        <NavItem 
          icon={<BookIcon label="Knowledge Hub" size="small" />} 
          label="Knowledge Hub" 
          isCollapsed={isCollapsed}
          href="/product/knowledge"
        />
        
        {/* Separator */}
        <div style={{
          height: '1px',
          background: token('color.border', '#DFE1E6'),
          margin: `${token('space.200', '16px')} 0`,
        }} />
        
        <NavItem 
          icon={<SettingsIcon label="Product Settings" size="small" />} 
          label="Product Settings" 
          isCollapsed={isCollapsed}
          href="/product/settings"
        />
      </nav>
    </aside>
  );
};

export default Sidebar;
