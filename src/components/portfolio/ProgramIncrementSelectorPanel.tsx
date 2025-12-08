import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgramIncrement {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'selected' | 'in-progress' | 'planning' | 'done';
}

interface ProgramIncrementSelectorPanelProps {
  selectedPIs: string[];
  onPIsChange: (piIds: string[]) => void;
}

// Empty PIs - populated from database
const mockPIs: ProgramIncrement[] = [];

export function ProgramIncrementSelectorPanel({
  selectedPIs,
  onPIsChange,
}: ProgramIncrementSelectorPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>(selectedPIs);

  const filteredPIs = mockPIs.filter(pi => 
    pi.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedPIs = {
    selected: filteredPIs.filter(pi => pi.status === 'selected'),
    'in-progress': filteredPIs.filter(pi => pi.status === 'in-progress'),
    planning: filteredPIs.filter(pi => pi.status === 'planning'),
    done: filteredPIs.filter(pi => pi.status === 'done'),
  };

  const handleToggle = (piId: string) => {
    setTempSelected(prev =>
      prev.includes(piId) ? prev.filter(id => id !== piId) : [...prev, piId]
    );
  };

  const handleApply = () => {
    onPIsChange(tempSelected);
  };

  const handleClearAll = () => {
    setTempSelected([]);
  };

  const handleCancel = () => {
    setTempSelected(selectedPIs);
  };

  return (
    <div className="w-64 border-r bg-background flex flex-col h-full">
      {/* Search Box */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Program Increment"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* PI Groups */}
      <div className="flex-1 overflow-y-auto">
        {/* SELECTED */}
        {groupedPIs.selected.length > 0 && (
          <div className="p-3 border-b">
            <div className="text-xs font-semibold text-muted-foreground mb-2">SELECTED</div>
            {groupedPIs.selected.map(pi => (
              <div key={pi.id} className="flex items-center space-x-2 py-1.5">
                <Checkbox
                  id={pi.id}
                  checked={tempSelected.includes(pi.id)}
                  onCheckedChange={() => handleToggle(pi.id)}
                />
                <label
                  htmlFor={pi.id}
                  className="text-sm flex-1 cursor-pointer"
                >
                  {pi.name} ({pi.startDate} - {pi.endDate})
                </label>
              </div>
            ))}
          </div>
        )}

        {/* IN PROGRESS */}
        {groupedPIs['in-progress'].length > 0 && (
          <div className="p-3 border-b">
            <div className="text-xs font-semibold text-muted-foreground mb-2">IN PROGRESS</div>
            {groupedPIs['in-progress'].map(pi => (
              <div key={pi.id} className="flex items-center space-x-2 py-1.5">
                <Checkbox
                  id={pi.id}
                  checked={tempSelected.includes(pi.id)}
                  onCheckedChange={() => handleToggle(pi.id)}
                />
                <label
                  htmlFor={pi.id}
                  className="text-sm flex-1 cursor-pointer"
                >
                  {pi.name} ({pi.startDate} - {pi.endDate})
                </label>
              </div>
            ))}
          </div>
        )}

        {/* PLANNING */}
        {groupedPIs.planning.length > 0 && (
          <div className="p-3 border-b">
            <div className="text-xs font-semibold text-muted-foreground mb-2">PLANNING</div>
            {groupedPIs.planning.map(pi => (
              <div key={pi.id} className="flex items-center space-x-2 py-1.5">
                <Checkbox
                  id={pi.id}
                  checked={tempSelected.includes(pi.id)}
                  onCheckedChange={() => handleToggle(pi.id)}
                />
                <label
                  htmlFor={pi.id}
                  className="text-sm flex-1 cursor-pointer"
                >
                  {pi.name} ({pi.startDate} - {pi.endDate})
                </label>
              </div>
            ))}
          </div>
        )}

        {/* DONE */}
        {groupedPIs.done.length > 0 && (
          <div className="p-3 border-b">
            <div className="text-xs font-semibold text-muted-foreground mb-2">DONE</div>
            {groupedPIs.done.map(pi => (
              <div key={pi.id} className="flex items-center space-x-2 py-1.5">
                <Checkbox
                  id={pi.id}
                  checked={tempSelected.includes(pi.id)}
                  onCheckedChange={() => handleToggle(pi.id)}
                />
                <label
                  htmlFor={pi.id}
                  className="text-sm flex-1 cursor-pointer"
                >
                  {pi.name} ({pi.startDate} - {pi.endDate})
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t flex items-center gap-2">
        <Button size="sm" onClick={handleApply} className="flex-1">
          Apply
        </Button>
        <Button size="sm" variant="ghost" onClick={handleClearAll}>
          Clear all
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
      </div>

      {/* Programs Section */}
      <div className="border-t p-3">
        <button className="flex items-center justify-between w-full text-sm font-medium hover:bg-accent rounded px-2 py-1.5">
          <span>Programs</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
