import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRoadmapStore } from '@/stores/roadmapStore';

interface ProgramIncrement {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'in_progress' | 'planning' | 'done';
}

const programIncrements: ProgramIncrement[] = [
  { id: 'pi-5', name: 'PI-5', startDate: '2024-07-19', endDate: '2024-10-10', status: 'in_progress' },
  { id: 'ja-yy-1', name: 'JA yy.1', startDate: '2024-09-08', endDate: '2024-11-30', status: 'in_progress' },
  { id: 'pi-6', name: 'PI-6', startDate: '2024-10-11', endDate: '2025-01-02', status: 'planning' },
  { id: 'pi-7', name: 'PI-7', startDate: '2025-01-03', endDate: '2025-04-04', status: 'planning' },
  { id: 'pi-8', name: 'PI-8', startDate: '2025-02-13', endDate: '2025-02-28', status: 'planning' },
  { id: 'pi-2', name: 'PI 2', startDate: '2024-10-29', endDate: '2024-11-28', status: 'planning' },
  { id: 'pi-9', name: 'PI-9', startDate: '2024-10-29', endDate: '2024-11-28', status: 'planning' },
  { id: 'pi-1', name: 'PI-1', startDate: '2023-07-19', endDate: '2023-09-15', status: 'done' },
  { id: 'pi-2-old', name: 'PI-2', startDate: '2023-10-20', endDate: '2024-01-22', status: 'done' },
];

export function PISelectorPanel() {
  const { selectedPIs, togglePI, clearSelectedPIs, setSelectedPIs } = useRoadmapStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>(selectedPIs);

  const filteredPIs = programIncrements.filter(pi =>
    pi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pi.startDate.includes(searchQuery) ||
    pi.endDate.includes(searchQuery)
  );

  const inProgressPIs = filteredPIs.filter(pi => pi.status === 'in_progress');
  const planningPIs = filteredPIs.filter(pi => pi.status === 'planning');
  const donePIs = filteredPIs.filter(pi => pi.status === 'done');

  const displayedPlanningPIs = showMore ? planningPIs : planningPIs.slice(0, 3);

  const handleToggle = (piId: string) => {
    setTempSelected(prev =>
      prev.includes(piId) ? prev.filter(id => id !== piId) : [...prev, piId]
    );
  };

  const handleApply = () => {
    setSelectedPIs(tempSelected);
  };

  const handleClear = () => {
    setTempSelected([]);
  };

  const handleCancel = () => {
    setTempSelected(selectedPIs);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="w-[280px] h-full bg-[hsl(var(--sidebar-bg))] border-r border-border flex flex-col">
      {/* Header - fixed height 72px to align with sidebar */}
      <div className="h-[72px] px-4 border-b border-border flex flex-col justify-center shrink-0">
        <div className="text-[11px] font-bold text-[hsl(var(--sidebar-section-header))] uppercase tracking-wide mb-2">
          PROGRAM INCREMENT
        </div>
        <button className="w-full flex items-center justify-between px-3 py-1.5 text-sm bg-background border border-border rounded hover:bg-muted/50">
          <span>All time</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search Program Incr..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* PI List */}
      <div className="flex-1 overflow-y-auto px-4">
        {/* In Progress */}
        {inProgressPIs.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] font-bold text-[hsl(var(--sidebar-section-header))] uppercase mb-2">
              IN PROGRESS
            </div>
            {inProgressPIs.map(pi => (
              <div
                key={pi.id}
                className="flex items-center gap-2 py-2 cursor-pointer hover:bg-muted/30 -mx-4 px-4 rounded"
                onClick={() => handleToggle(pi.id)}
              >
                <div className={`w-4 h-4 flex-shrink-0 flex items-center justify-center border-2 rounded ${
                  tempSelected.includes(pi.id)
                    ? 'bg-[hsl(var(--checkbox-checked))] border-[hsl(var(--checkbox-checked))]'
                    : 'border-border'
                }`}>
                  {tempSelected.includes(pi.id) && (
                    <span className="text-white text-[10px] font-bold">✓</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{pi.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(pi.startDate)} - {formatDate(pi.endDate)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Planning */}
        {planningPIs.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] font-bold text-[hsl(var(--sidebar-section-header))] uppercase mb-2">
              PLANNING
            </div>
            {displayedPlanningPIs.map(pi => (
              <div
                key={pi.id}
                className="flex items-center gap-2 py-2 cursor-pointer hover:bg-muted/30 -mx-4 px-4 rounded"
                onClick={() => handleToggle(pi.id)}
              >
                <div className={`w-4 h-4 flex-shrink-0 flex items-center justify-center border-2 rounded ${
                  tempSelected.includes(pi.id)
                    ? 'bg-[hsl(var(--checkbox-checked))] border-[hsl(var(--checkbox-checked))]'
                    : 'border-border'
                }`}>
                  {tempSelected.includes(pi.id) && (
                    <span className="text-white text-[10px] font-bold">✓</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{pi.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(pi.startDate)} - {formatDate(pi.endDate)}
                  </div>
                </div>
              </div>
            ))}
            {planningPIs.length > 3 && !showMore && (
              <button
                onClick={() => setShowMore(true)}
                className="text-sm text-primary hover:underline py-2"
              >
                Show more
              </button>
            )}
          </div>
        )}

        {/* Done */}
        {donePIs.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] font-bold text-[hsl(var(--sidebar-section-header))] uppercase mb-2">
              DONE
            </div>
            {donePIs.map(pi => (
              <div
                key={pi.id}
                className="flex items-center gap-2 py-2 cursor-pointer hover:bg-muted/30 -mx-4 px-4 rounded"
                onClick={() => handleToggle(pi.id)}
              >
                <div className={`w-4 h-4 flex-shrink-0 flex items-center justify-center border-2 rounded ${
                  tempSelected.includes(pi.id)
                    ? 'bg-[hsl(var(--checkbox-checked))] border-[hsl(var(--checkbox-checked))]'
                    : 'border-border'
                }`}>
                  {tempSelected.includes(pi.id) && (
                    <span className="text-white text-[10px] font-bold">✓</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{pi.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(pi.startDate)} - {formatDate(pi.endDate)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border flex gap-2">
        <Button onClick={handleApply} className="flex-1">
          Apply
        </Button>
        <Button onClick={handleClear} variant="ghost" className="flex-1">
          Clear all
        </Button>
        <Button onClick={handleCancel} variant="ghost">
          Cancel
        </Button>
      </div>
    </div>
  );
}
