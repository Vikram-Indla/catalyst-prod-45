import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const portfolios = [
  'Digital Services',
  'Expium Portfolio (Training)',
  'Geekbooks Location Services',
  'Geekbooks Online Services',
  'Jira Align Training Portfolio',
  'Legacy Apps'
];

interface PortfolioDropdownProps {
  onClose: () => void;
}

export function PortfolioDropdown({ onClose }: PortfolioDropdownProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = portfolios.filter(p =>
    p.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (portfolio: string) => {
    navigate(`/portfolio-room?portfolio=${encodeURIComponent(portfolio)}`);
    onClose();
  };

  return (
    <div className="absolute top-full left-0 mt-1 w-80 bg-popover border rounded-md shadow-lg z-50">
      <div className="p-3 border-b">
        <p className="text-xs font-semibold text-muted-foreground mb-2">PORTFOLIOS</p>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search to filter portfolios"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-8"
          />
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <ScrollArea className="max-h-80">
        <div className="p-2">
          {filtered.map((portfolio) => (
            <button
              key={portfolio}
              onClick={() => handleSelect(portfolio)}
              className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm"
            >
              {portfolio}
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className="p-3 border-t">
        <button className="text-sm text-primary hover:underline">
          View all portfolio teams
        </button>
      </div>
    </div>
  );
}
