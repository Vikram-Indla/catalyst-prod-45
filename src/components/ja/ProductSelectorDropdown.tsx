import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search, Factory, Pickaxe, Building2, Star, Loader2, Lock, Plus, Settings } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useStarredItems } from '@/hooks/useStarredItems';
import { useBusinessLines } from '@/hooks/useProductSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { catalystToast } from '@/lib/catalystToast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProductSelectorDropdownProps {
  onClose: () => void;
  onCreateClick?: () => void;
}

// Feature flag for showing inactive lines to admins (can be moved to settings later)
const SHOW_INACTIVE_TO_ADMINS = true;

// Map business line keys to icons
const getIconForBusinessLine = (key: string) => {
  switch (key.toUpperCase()) {
    case 'IND':
    case 'INDUSTRY':
      return Factory;
    case 'MIN':
    case 'MINING':
      return Pickaxe;
    default:
      return Building2;
  }
};

// Map business line keys to routes - navigates to "Room" (first sidebar item)
const getPathForBusinessLine = (key: string) => {
  switch (key.toUpperCase()) {
    case 'IND':
    case 'INDUSTRY':
      return '/industry/demand-summary'; // Product Room - first sidebar item
    case 'MIN':
    case 'MINING':
      return '/mining/demand-summary';
    default:
      return `/product/${key.toLowerCase()}/demand-summary`;
  }
};

export function ProductSelectorDropdown({ onClose, onCreateClick }: ProductSelectorDropdownProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { isStarred, toggleStar } = useStarredItems({ limit: 100 });
  const { isAdmin } = useUserRole();
  
  // Fetch business lines from database
  const { data: businessLines = [], isLoading } = useBusinessLines();
  
  // Separate active and inactive business lines
  const activeBusinessLines = businessLines.filter(line => line.is_active);
  const inactiveBusinessLines = businessLines.filter(line => !line.is_active);
  
  // Show inactive to admins only if feature flag is enabled
  const showInactive = isAdmin && SHOW_INACTIVE_TO_ADMINS && inactiveBusinessLines.length > 0;

  const filteredActive = activeBusinessLines.filter(line =>
    line.name.toLowerCase().includes(search.toLowerCase()) ||
    line.key.toLowerCase().includes(search.toLowerCase())
  );

  const filteredInactive = inactiveBusinessLines.filter(line =>
    line.name.toLowerCase().includes(search.toLowerCase()) ||
    line.key.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (line: typeof activeBusinessLines[0]) => {
    const path = getPathForBusinessLine(line.key);
    navigate(path);
    onClose();
  };

  const handleInactiveClick = () => {
    catalystToast.info(
      'Business Line Inactive',
      'Activate this business line in Product Settings to use it in the Product workspace.'
    );
    navigate('/admin/product-settings');
    onClose();
  };

  const handleToggleStar = async (e: React.MouseEvent, line: typeof activeBusinessLines[0]) => {
    e.stopPropagation();
    const path = getPathForBusinessLine(line.key);
    await toggleStar({
      room_type: 'product',
      room_id: line.id,
      room_name: line.name,
      room_subtitle: 'Product',
      room_path: path,
      pi_label: null,
    });
  };

  const handleCreateClick = () => {
    onClose();
    onCreateClick?.();
  };

  const handleManageClick = () => {
    navigate('/admin/product-settings');
    onClose();
  };

  return (
    <div className="w-80 bg-popover border rounded-md shadow-lg z-[60]">
      <div className="p-3 border-b">
        <p className="text-xs font-semibold text-muted-foreground mb-2">PRODUCTS</p>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-8 h-9"
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <ScrollArea className="max-h-64">
        <div className="p-2">
          {isLoading ? (
            <div className="px-3 py-8 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filteredActive.length === 0 && filteredInactive.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No products found
            </div>
          ) : (
            <TooltipProvider>
              {/* Active business lines */}
              {filteredActive.map((line) => {
                const Icon = getIconForBusinessLine(line.key);
                const starred = isStarred('product', line.id);
                return (
                  <button
                    key={line.id}
                    onClick={() => handleSelect(line)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm group"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 font-medium">{line.name}</span>
                      {line.is_default && (
                        <span className="text-xs text-brand-gold font-medium">Default</span>
                      )}
                      <button
                        onClick={(e) => handleToggleStar(e, line)}
                        className={`p-1 rounded hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold ${
                          starred ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                        }`}
                        aria-label={starred ? "Unstar product" : "Star product"}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            starred
                              ? "text-brand-gold fill-brand-gold"
                              : "text-muted-foreground hover:text-brand-gold"
                          }`}
                        />
                      </button>
                    </div>
                  </button>
                );
              })}

              {/* Inactive business lines - admin only */}
              {showInactive && filteredInactive.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <p className="px-3 py-1 text-xs font-semibold text-muted-foreground">INACTIVE</p>
                  {filteredInactive.map((line) => {
                    const Icon = getIconForBusinessLine(line.key);
                    return (
                      <Tooltip key={line.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleInactiveClick}
                            className="w-full text-left px-3 py-2 rounded text-sm opacity-50 cursor-not-allowed hover:bg-accent/30"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="flex-1 font-medium">{line.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                                Inactive
                              </span>
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This business line is inactive. Activate it in Product Settings.</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </>
              )}
            </TooltipProvider>
          )}
        </div>
      </ScrollArea>
      
      {/* Bottom Actions */}
      <div className="border-t">
        <div className="p-2 space-y-1">
          <button
            onClick={handleCreateClick}
            className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm flex items-center gap-2 text-brand-gold font-medium"
          >
            <Plus className="h-4 w-4" />
            Create Product
          </button>
          <Separator className="my-1" />
          <button
            onClick={handleManageClick}
            className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm flex items-center gap-2 text-muted-foreground"
          >
            <Settings className="h-4 w-4" />
            Manage Products
          </button>
        </div>
      </div>
    </div>
  );
}
