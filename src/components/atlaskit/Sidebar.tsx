import { useState } from 'react';
import { token } from '@atlaskit/tokens';
import { ChevronLeft, Home, Briefcase, Layers, Box, Folder, Settings } from 'lucide-react';

// SidebarItem component with blue selected state
interface SidebarItemProps {
  children: React.ReactNode;
  icon: React.ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ children, icon, isSelected = false, onClick }: SidebarItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
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
        border: 'none',
        marginBottom: token('space.050', '4px'),
        transition: 'all 150ms ease-in-out',
      }}
    >
      {icon}
      {children}
    </button>
  );
};

export const Sidebar = () => {
  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      maxWidth: '240px',
      background: token('color.background.neutral.subtle', '#FAFBFC'),
      borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'auto',
      position: 'relative',
      zIndex: 100,
    }}>
      {/* Sidebar Header */}
      <div style={{
        padding: token('space.300', '24px'),
        paddingTop: token('space.200', '16px'),
        paddingBottom: token('space.200', '16px'),
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        display: 'flex',
        alignItems: 'center',
        gap: token('space.150', '12px'),
      }}>
        {/* PR Badge - Warm tan color */}
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
        
        {/* Collapse Button */}
        <button style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: token('space.050', '4px'),
          color: token('color.text.subtle', '#6B778C'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ChevronLeft size={16} />
        </button>
      </div>
      
      {/* Navigation Items */}
      <nav style={{
        flex: 1,
        padding: token('space.100', '8px'),
      }}>
        <SidebarItem icon={<Home size={16} />}>Product Room</SidebarItem>
        <SidebarItem icon={<Briefcase size={16} />} isSelected>Backlog</SidebarItem>
        <SidebarItem icon={<Layers size={16} />}>Roadmap</SidebarItem>
        <SidebarItem icon={<Box size={16} />}>Capacity</SidebarItem>
        <SidebarItem icon={<Folder size={16} />}>Knowledge Hub</SidebarItem>
        
        {/* Separator */}
        <div style={{
          height: '1px',
          background: token('color.border', '#DFE1E6'),
          margin: `${token('space.200', '16px')} 0`,
        }} />
        
        <SidebarItem icon={<Settings size={16} />}>Product Settings</SidebarItem>
      </nav>
    </aside>
  );
};

export default Sidebar;
