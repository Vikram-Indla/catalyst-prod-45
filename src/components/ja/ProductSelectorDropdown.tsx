/**
 * Product Selector Dropdown - Revamped for Catalyst Menu
 * Shows: Create Business Request, Manage Business Requests (admin only)
 * Non-admin users can still see Product spaces if they have access
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

interface ProductSelectorDropdownProps {
  onClose: () => void;
  onCreateClick?: () => void;
}

export function ProductSelectorDropdown({ onClose, onCreateClick }: ProductSelectorDropdownProps) {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();

  const handleCreateBusinessRequest = useCallback(() => {
    // Navigate to Product Backlog with create dialog open
    navigate('/industry?create=true');
    onClose();
  }, [navigate, onClose]);

  const handleManageBusinessRequests = useCallback(() => {
    navigate('/industry');
    onClose();
  }, [navigate, onClose]);

  return (
    <div className="w-64 bg-popover border border-border rounded-md shadow-md overflow-hidden z-[60]">
      <div className="px-3 py-2 border-b border-border">
        <p className="text-sm font-medium text-foreground">Product</p>
      </div>
      
      <div className="divide-y divide-border/50">
        {isAdmin && (
          <button
            onClick={handleCreateBusinessRequest}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            Create Business Request
          </button>
        )}
        {isAdmin && (
          <button
            onClick={handleManageBusinessRequests}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Manage Business Requests
          </button>
        )}
        {!isAdmin && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            No actions available
          </div>
        )}
      </div>
    </div>
  );
}
