import { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button';
import { Plus, Bell, Settings, Search } from 'lucide-react';

// NavButton component for top navigation
interface NavButtonProps {
  children: React.ReactNode;
  isSelected?: boolean;
  href?: string;
}

const NavButton = ({ children, isSelected = false, href = '#' }: NavButtonProps) => {
  return (
    <a
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: '56px',
        padding: `0 ${token('space.150', '12px')}`,
        color: isSelected ? token('color.text.selected', '#0052CC') : token('color.text', '#172B4D'),
        fontSize: '14px',
        fontWeight: isSelected ? 600 : 400,
        textDecoration: 'none',
        borderBottom: isSelected 
          ? `3px solid ${token('color.border.selected', '#0052CC')}` 
          : '3px solid transparent',
        boxSizing: 'border-box' as const,
        transition: 'all 150ms ease-in-out',
        cursor: 'pointer',
      }}
    >
      {children}
    </a>
  );
};

interface TopNavProps {
  isMobile?: boolean;
}

export const TopNav = ({ isMobile = false }: TopNavProps) => {
  return (
    <header style={{
      height: '56px',
      minHeight: '56px',
      maxHeight: '56px',
      backgroundColor: token('elevation.surface', '#FFFFFF'),
      borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `0 ${token('space.300', '24px')}`,
      flexShrink: 0,
      position: 'relative',
      zIndex: 200,
    }}>
      {/* Left Section - Logo + Nav */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.400', '32px'),
      }}>
        {/* Logo */}
        <div style={{
          fontSize: '20px',
          fontWeight: 600,
          color: token('color.text', '#172B4D'),
          letterSpacing: '-0.5px',
        }}>
          Catalyst
        </div>
        
        {/* Navigation Items */}
        {!isMobile && (
          <nav style={{ display: 'flex', gap: token('space.050', '4px') }}>
            <NavButton href="/home">Home</NavButton>
            <NavButton href="/enterprise">Enterprise</NavButton>
            <NavButton href="/product" isSelected>Product</NavButton>
            <NavButton href="/program">Program</NavButton>
            <NavButton href="/project">Project</NavButton>
            <NavButton href="/release">Release</NavButton>
            <NavButton href="/items">Items</NavButton>
          </nav>
        )}
      </div>
      
      {/* Right Section - Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.200', '16px'),
      }}>
        <Button appearance="primary" iconBefore={<Plus size={16} />}>
          Create
        </Button>
        <Button appearance="subtle" iconBefore={<Bell size={20} />} />
        <Button appearance="subtle" iconBefore={<Settings size={20} />} />
        <Button appearance="subtle" iconBefore={<Search size={20} />} />
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#D4A574',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '14px',
        }}>
          V
        </div>
      </div>
    </header>
  );
};

export default TopNav;
