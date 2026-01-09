/**
 * TM Top Bar - Phase 1 Spec Compliant
 * 52px height, breadcrumbs, search, notifications, user avatar
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronRight, Search, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface TMTopBarProps {
  folderName?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function TMTopBar({ folderName, searchValue = '', onSearchChange }: TMTopBarProps) {
  const location = useLocation();

  // Build breadcrumbs
  const breadcrumbs = [
    { label: 'Test Management', path: '/tm' },
  ];

  if (location.pathname.includes('/cases')) {
    breadcrumbs.push({ label: 'Test Cases', path: '/tm/cases' });
    if (folderName) {
      breadcrumbs.push({ label: folderName, path: location.pathname });
    }
  }

  return (
    <header
      className="flex items-center justify-between px-4 border-b bg-[var(--bg-0)]"
      style={{
        height: '52px',
        borderColor: 'var(--stroke-1)',
      }}
    >
      {/* Left - Breadcrumbs */}
      <nav className="flex items-center gap-1" style={{ fontSize: '14px' }}>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            {index > 0 && (
              <ChevronRight 
                className="text-[var(--text-4)]" 
                style={{ width: '16px', height: '16px' }} 
              />
            )}
            <NavLink
              to={crumb.path}
              className={cn(
                'transition-colors',
                index === breadcrumbs.length - 1
                  ? 'font-medium text-[var(--text-1)]'
                  : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
              )}
            >
              {crumb.label}
            </NavLink>
          </React.Fragment>
        ))}
      </nav>

      {/* Right - Search, Notifications, Avatar */}
      <div className="flex items-center gap-3">
        {/* Search Input - 280px width */}
        <div className="relative" style={{ width: '280px' }}>
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-4)]"
            style={{ width: '16px', height: '16px' }}
          />
          <Input
            placeholder="Search test cases..."
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-9 h-9 text-sm border-[var(--stroke-1)] bg-[var(--bg-1)] focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
            style={{ borderRadius: '6px' }}
          />
        </div>

        {/* Notification Bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-[var(--text-3)] hover:text-[var(--text-1)]"
        >
          <Bell style={{ width: '18px', height: '18px' }} />
        </Button>

        {/* User Avatar - Initials "VS" with gradient */}
        <Avatar className="h-8 w-8">
          <AvatarFallback 
            className="text-xs font-medium text-white"
            style={{ 
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' 
            }}
          >
            VS
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

export default TMTopBar;
