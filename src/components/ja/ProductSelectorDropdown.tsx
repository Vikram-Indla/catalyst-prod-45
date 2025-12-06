import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search, Factory, Pickaxe, Building2, Star, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStarredItems } from '@/hooks/useStarredItems';
import { useBusinessLines } from '@/hooks/useProductSettings';

interface ProductSelectorDropdownProps {
  onClose: () => void;
}

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

// Map business line keys to routes
const getPathForBusinessLine = (key: string) => {
  switch (key.toUpperCase()) {
    case 'IND':
    case 'INDUSTRY':
      return '/industry';
    case 'MIN':
    case 'MINING':
      return '/mining';
    default:
      return `/product/${key.toLowerCase()}`;
  }
};

export function ProductSelectorDropdown({ onClose }: ProductSelectorDropdownProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { isStarred, toggleStar } = useStarredItems({ limit: 100 });
  
  // Fetch business lines from database - only show active ones
  const { data: businessLines = [], isLoading } = useBusinessLines();
  const activeBusinessLines = businessLines.filter(line => line.is_active);

  const filtered = activeBusinessLines.filter(line =>
    line.name.toLowerCase().includes(search.toLowerCase()) ||
    line.key.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (line: typeof activeBusinessLines[0]) => {
    const path = getPathForBusinessLine(line.key);
    navigate(path);
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

  return (
    <div className="w-80 bg-popover border rounded-md shadow-lg">
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
      <ScrollArea className="max-h-80">
        <div className="p-2">
          {isLoading ? (
            <div className="px-3 py-8 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No products found
            </div>
          ) : (
            filtered.map((line) => {
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
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
