import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search, Factory, Pickaxe, Star } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStarredItems } from '@/hooks/useStarredItems';

interface ProductSelectorDropdownProps {
  onClose: () => void;
}

// Use deterministic UUIDs for products (generated from product names)
const productItems = [
  { id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', slug: 'industry', name: 'Industry', path: '/industry', icon: Factory },
  { id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', slug: 'mining', name: 'Mining', path: '/mining', icon: Pickaxe },
];

export function ProductSelectorDropdown({ onClose }: ProductSelectorDropdownProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { isStarred, toggleStar } = useStarredItems({ limit: 100 });

  const filtered = productItems.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleToggleStar = async (e: React.MouseEvent, item: typeof productItems[0]) => {
    e.stopPropagation();
    await toggleStar({
      room_type: 'product',
      room_id: item.id,
      room_name: item.name,
      room_subtitle: 'Product',
      room_path: item.path,
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
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No products found
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              const starred = isStarred('product', item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.path)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm group"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 font-medium">{item.name}</span>
                    <button
                      onClick={(e) => handleToggleStar(e, item)}
                      className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-gold"
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