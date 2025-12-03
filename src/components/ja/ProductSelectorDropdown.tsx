import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search, Factory, Pickaxe } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProductSelectorDropdownProps {
  onClose: () => void;
}

const productItems = [
  { id: 'industry', name: 'Industry', path: '/industry', icon: Factory },
  { id: 'mining', name: 'Mining', path: '/mining', icon: Pickaxe },
];

export function ProductSelectorDropdown({ onClose }: ProductSelectorDropdownProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = productItems.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
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
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.path)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm flex items-center gap-2"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {item.name}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
