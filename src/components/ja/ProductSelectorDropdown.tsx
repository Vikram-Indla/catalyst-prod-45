/**
 * Product Selector Dropdown - Product Line Selector
 * Shows: Create Product Line, Manage Product Lines (admin only)
 * Dynamic Product Lines from Admin → Product Settings → Business Lines
 * Industry (active) routes to /industry
 */
import React, { useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Settings, Package, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useUserRole } from '@/hooks/useUserRole';
import { useBusinessLines } from '@/hooks/useProductSettings';
import { cn } from '@/lib/utils';

interface ProductSelectorDropdownProps {
  onClose: () => void;
  onCreateClick?: () => void;
}

// Route mapping for product lines
const PRODUCT_LINE_ROUTES: Record<string, string> = {
  'Industry': '/industry',
  // Future product lines can be added here
};

export function ProductSelectorDropdown({ onClose, onCreateClick }: ProductSelectorDropdownProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserRole();
  const { data: businessLines = [], isLoading } = useBusinessLines();
  const [search, setSearch] = useState('');

  // Filter product lines by search
  const filteredLines = businessLines
    .filter(line => 
      line.name.toLowerCase().includes(search.toLowerCase()) ||
      (line.key && line.key.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Get route for a product line
  const getProductLineRoute = (name: string): string | null => {
    return PRODUCT_LINE_ROUTES[name] || null;
  };

  // Check if current route matches a product line
  const isActiveRoute = (name: string): boolean => {
    const route = getProductLineRoute(name);
    return route ? location.pathname.startsWith(route) : false;
  };

  const handleSelectProductLine = useCallback((line: typeof businessLines[0]) => {
    if (!line.is_active) return;
    
    const route = getProductLineRoute(line.name);
    if (route) {
      navigate(route);
      onClose();
    }
  }, [navigate, onClose]);

  const handleCreateProductLine = useCallback(() => {
    navigate('/admin/product-settings?action=create');
    onClose();
  }, [navigate, onClose]);

  const handleManageProductLines = useCallback(() => {
    navigate('/admin/product-settings');
    onClose();
  }, [navigate, onClose]);

  return (
    <div className="w-72 bg-popover border border-border rounded-md shadow-md overflow-hidden z-[60]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <p className="text-sm font-medium text-foreground mb-2">Product Lines</p>
        <div className="relative">
          <Input
            placeholder="Search product lines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm pr-8"
            autoFocus
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Product Lines List */}
      <div className="max-h-[280px] overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : filteredLines.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            {search ? 'No product lines found' : 'No product lines available'}
          </div>
        ) : (
          filteredLines.map((line) => {
            const isActive = line.is_active;
            const hasRoute = !!getProductLineRoute(line.name);
            const isCurrentRoute = isActiveRoute(line.name);
            
            return (
              <button
                key={line.id}
                onClick={() => handleSelectProductLine(line)}
                disabled={!isActive || !hasRoute}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2.5 text-left transition-colors",
                  isActive && hasRoute
                    ? "hover:bg-muted cursor-pointer" 
                    : "opacity-50 cursor-not-allowed",
                  isCurrentRoute && "bg-muted"
                )}
              >
                <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className={cn(
                    "text-sm truncate",
                    isCurrentRoute ? "text-brand-gold font-medium" : "text-foreground"
                  )}>
                    {line.name}
                  </span>
                  {!isActive && (
                    <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                {line.key && (
                  <span className="text-xs text-muted-foreground flex-shrink-0 font-mono uppercase">
                    ({line.key})
                  </span>
                )}
                {!isActive && (
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    Inactive
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="border-t border-border divide-y divide-border/50">
          <button
            onClick={handleCreateProductLine}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            Create Product Line
          </button>
          <button
            onClick={handleManageProductLines}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Manage Product Lines
          </button>
        </div>
      )}
    </div>
  );
}
