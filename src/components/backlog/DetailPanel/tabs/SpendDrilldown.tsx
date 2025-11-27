import { useState } from 'react';
import { ChevronLeft, Info, TrendingUp } from 'lucide-react';
import { AcceptedStory } from '@/types/backlog.types';

interface SpendDrilldownProps {
  acceptedSpend: number;
  stories: AcceptedStory[];
  onBack: () => void;
}

export function SpendDrilldown({ acceptedSpend, stories, onBack }: SpendDrilldownProps) {
  const [selectedPIFilter, setSelectedPIFilter] = useState('All');
  const [hoveredStoryId, setHoveredStoryId] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const acceptedCount = stories.filter(s => s.spend > 0).length;
  const notAcceptedCount = stories.length - acceptedCount;

  const handleSpendClick = (e: React.MouseEvent, story: AcceptedStory) => {
    if (story.spend > 0 && story.teamSprintName) {
      setHoveredStoryId(story.id);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setPopupPosition({ x: rect.left, y: rect.bottom + 8 });
    }
  };

  return (
    <div className="relative">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80">
          <ChevronLeft className="w-4 h-4" />
          AI for Improved Call Ce...
        </button>
        <span className="text-sm text-muted-foreground">/ Accepted Spend</span>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="grid grid-cols-[1fr_280px] gap-6 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Accepted Spend</h2>
            <p className="text-sm text-muted-foreground">
              Accepted Spend is calculated by adding together the spend of stories related to this epic.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-[#36B37E] text-white rounded-lg">
            <div className="text-2xl font-bold">${acceptedSpend.toLocaleString()}</div>
            <div className="text-xs mt-1">based on {acceptedCount} accepted stories</div>
            <div className="text-xs mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              ${(acceptedSpend / 5).toFixed(0)} in PI-5
            </div>
          </div>
        </div>

        {/* Story Count Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 border border-border rounded-lg text-center">
            <div className="text-sm text-muted-foreground mb-1">Total</div>
            <div className="text-2xl font-semibold text-primary">{stories.length} stories</div>
          </div>
          <div className="p-4 border border-border rounded-lg text-center">
            <div className="text-sm text-muted-foreground mb-1">Accepted</div>
            <div className="text-2xl font-semibold text-primary">{acceptedCount} stories</div>
          </div>
          <div className="p-4 border border-border rounded-lg text-center">
            <div className="text-sm text-muted-foreground mb-1">Not accepted</div>
            <div className="text-2xl font-semibold text-primary">{notAcceptedCount} stories</div>
          </div>
        </div>

        {/* Info Alert */}
        {notAcceptedCount > 0 && (
          <div className="flex gap-3 p-4 mb-6 bg-[#DEEBFF] rounded-lg">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-foreground mb-2">
                {notAcceptedCount} stories tied to this epic have not been accepted
              </p>
              <button className="text-sm text-primary hover:underline">
                View stories not accepted
              </button>
            </div>
          </div>
        )}

        {/* Accepted Stories Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Accepted stories</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">PI:</label>
              <select
                value={selectedPIFilter}
                onChange={(e) => setSelectedPIFilter(e.target.value)}
                className="px-3 py-1.5 text-sm bg-background border border-border rounded"
              >
                <option>All</option>
                <option>PI-5</option>
                <option>PI-6</option>
                <option>PI-7</option>
              </select>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Story</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Title</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Team</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Spend</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((story) => (
                  <tr key={story.id} className="border-t border-border hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm text-foreground">{story.numericId}</td>
                    <td className="px-4 py-3 text-sm text-primary hover:underline cursor-pointer">{story.title}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{story.team || 'None'}</td>
                    <td
                      className="px-4 py-3 text-sm text-right font-semibold cursor-pointer"
                      style={{ color: story.spend > 0 ? '#36B37E' : '#6B778C' }}
                      onClick={(e) => handleSpendClick(e, story)}
                    >
                      ${story.spend.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Spend Calculation Popup */}
      {hoveredStoryId && (() => {
        const story = stories.find(s => s.id === hoveredStoryId);
        return story?.teamSprintName && (
          <div
            className="fixed w-[280px] p-4 bg-[#172B4D] text-white rounded-lg shadow-lg z-[1100]"
            style={{ left: popupPosition.x, top: popupPosition.y }}
            onMouseLeave={() => setHoveredStoryId(null)}
          >
            <div className="text-sm font-semibold mb-3">Story Accepted Spend</div>
            <div className="text-xs text-white/70 mb-1">TEAM SPRINT</div>
            <div className="text-sm mb-4">{story.teamSprintName}</div>
            <div className="text-xs text-white/70 mb-2">CALCULATION BREAKDOWN</div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">Team Spend per Point</span>
              <span className="text-sm">${story.teamSpendPerPoint || 0}</span>
            </div>
            <div className="text-center text-white/50 my-1">×</div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">Story estimate</span>
              <div className="text-right">
                <div className="text-sm">{story.storyEstimate || 0}</div>
                <div className="text-xs text-white/70">story points</div>
              </div>
            </div>
            <div className="border-t border-white/20 my-2" />
            <div className="text-xl font-bold text-right">${story.spend.toLocaleString()}</div>
            <button className="w-full mt-3 py-2 text-sm text-white border border-white/30 rounded hover:bg-white/10">
              View Spend per Point 📊
            </button>
          </div>
        );
      })()}
    </div>
  );
}