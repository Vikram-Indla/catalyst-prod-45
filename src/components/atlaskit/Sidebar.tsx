import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Tooltip from '@atlaskit/tooltip';
import { 
  Home,
  Folder,
  Map,
  BarChart3,
  BookOpen,
  Settings,
  ChevronLeft
} from 'lucide-react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  isSelected?: boolean;
  href?: string;
  onClick?: () => void;
}

const NavItem = ({ icon, label, isCollapsed, isSelected = false, href, onClick }: NavItemProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      navigate(href);
    }
  };

  const content = (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        background: isSelected 
          ? 'rgba(0, 82, 204, 0.08)'
          : isHovered 
            ? token('color.background.neutral.hovered', '#F4F5F7')
            : 'transparent',
        borderRadius: '4px',
        color: isSelected 
          ? token('color.text.selected', '#0052CC')
          : token('color.text', '#172B4D'),
        fontSize: '14px',
        fontWeight: isSelected ? 500 : 400,
        cursor: 'pointer',
        textAlign: 'left',
        marginBottom: '2px',
        transition: 'background 150ms ease-in-out',
        border: 'none',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
      }}
    >
      <span style={{ 
        flexShrink: 0, 
        display: 'flex', 
        alignItems: 'center',
        color: isSelected ? '#0052CC' : '#6B778C',
      }}>
        {icon}
      </span>
      {!isCollapsed && <span>{label}</span>}
    </button>
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
  const location = useLocation();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed ?? internalCollapsed;
  
  const handleToggle = () => {
    const newValue = !isCollapsed;
    setInternalCollapsed(newValue);
    onCollapsedChange?.(newValue);
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  return (
    <aside style={{
      width: isCollapsed ? '56px' : '240px',
      minWidth: isCollapsed ? '56px' : '240px',
      maxWidth: isCollapsed ? '56px' : '240px',
      background: token('elevation.surface', '#FFFFFF'),
      borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
      position: 'relative',
      zIndex: 100,
      transition: 'width 200ms ease-in-out, min-width 200ms ease-in-out, max-width 200ms ease-in-out',
      height: '100%',
    }}>
      {/* Sidebar Header */}
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minHeight: '72px',
      }}>
        {!isCollapsed && (
          <>
            {/* Badge */}
            <div style={{
              width: '40px',
              height: '40px',
              background: '#FFF4E6',
              color: '#C69C6D',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '14px',
              flexShrink: 0,
            }}>
              PR
            </div>
            
            {/* Product Info */}
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
        
        {/* Collapse Button */}
        <button
          type="button"
          onClick={handleToggle}
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: isCollapsed ? 0 : 'auto',
            color: token('color.text.subtlest', '#6B778C'),
            transition: 'all 150ms',
          }}
        >
          <ChevronLeft 
            size={16} 
            style={{ 
              transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 150ms',
            }} 
          />
        </button>
      </div>
      
      {/* Navigation Items */}
      <nav style={{
        flex: 1,
        padding: '8px',
        overflowY: 'auto',
      }}>
        <NavItem 
          icon={<Home size={18} />} 
          label="Product Room" 
          isCollapsed={isCollapsed}
          href="/product/room"
          isSelected={isActive('/product/room')}
        />
        <NavItem 
          icon={<Folder size={18} />} 
          label="Backlog" 
          isCollapsed={isCollapsed}
          isSelected={isActive('/industry')}
          href="/industry"
        />
        <NavItem 
          icon={<Map size={18} />} 
          label="Roadmap" 
          isCollapsed={isCollapsed}
          href="/industry/roadmaps"
          isSelected={isActive('/industry/roadmaps')}
        />
        <NavItem 
          icon={<BarChart3 size={18} />} 
          label="Capacity" 
          isCollapsed={isCollapsed}
          href="/product/capacity"
          isSelected={isActive('/product/capacity')}
        />
        <NavItem 
          icon={<BookOpen size={18} />} 
          label="Knowledge Hub" 
          isCollapsed={isCollapsed}
          href="/product/knowledge"
          isSelected={isActive('/product/knowledge')}
        />
        
        {/* Separator */}
        <div style={{
          height: '1px',
          background: token('color.border', '#DFE1E6'),
          margin: '16px 0',
        }} />
        
        <NavItem 
          icon={<Settings size={18} />} 
          label="Product Settings" 
          isCollapsed={isCollapsed}
          href="/admin/product-settings"
          isSelected={isActive('/admin/product-settings')}
        />
      </nav>
    </aside>
  );
};

export default Sidebar;
