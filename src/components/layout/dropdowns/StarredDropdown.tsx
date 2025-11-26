import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Layers, Target, Map, Zap, LayoutDashboard, FolderKanban } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const starredPages = [
  { title: 'Product Room (Labs)', subtitle: 'Product - Check Scanning App', pi: 'PI-5', icon: LayoutDashboard },
  { title: 'Objective tree', subtitle: 'Program - Website Services', pi: 'PI.1', icon: Target },
  { title: 'Roadmaps', subtitle: 'Portfolio - Geekbooks Online Services', pi: '', icon: Map },
  { title: 'Features', subtitle: 'Program - Website Services', pi: '', icon: Zap },
  { title: 'Program Room', subtitle: 'Program - Website Services', pi: '', icon: Layers },
  { title: 'Portfolio Room', subtitle: 'Portfolio - Digital Services', pi: 'PI-5, PI-6', icon: FolderKanban },
  { title: 'Program Room', subtitle: 'Program - Mobile', pi: 'PI-5', icon: Layers },
  { title: 'Portfolio Room', subtitle: 'Portfolio - Digital Services', pi: 'PI-5, PI-6', icon: FolderKanban }
];

interface StarredDropdownProps {
  onClose: () => void;
}

export function StarredDropdown({ onClose }: StarredDropdownProps) {
  const [search, setSearch] = useState('');

  const filtered = starredPages.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="absolute top-full left-0 mt-1 w-96 bg-popover border rounded-md shadow-lg z-50">
      <div className="p-3 border-b">
        <p className="text-xs font-semibold text-muted-foreground mb-2">STARRED</p>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search by page title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-8"
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <ScrollArea className="max-h-96">
        <div className="p-2">
          {filtered.map((page, idx) => (
            <button
              key={idx}
              onClick={onClose}
              className="w-full flex items-start gap-3 px-3 py-2 rounded hover:bg-accent text-left"
            >
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                <page.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{page.title}</p>
                <p className="text-xs text-muted-foreground">{page.subtitle}</p>
              </div>
              {page.pi && (
                <span className="text-xs text-muted-foreground flex-shrink-0">{page.pi}</span>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className="p-3 border-t">
        <button className="text-sm text-primary hover:underline">
          View all starred pages
        </button>
      </div>
    </div>
  );
}
