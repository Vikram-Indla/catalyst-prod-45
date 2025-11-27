import { useState } from 'react';
import { ChevronLeft, Info, TrendingUp, ExternalLink } from 'lucide-react';
import { AcceptedStory } from '@/types/backlog.types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SpendDrilldownProps {
  type: 'accepted' | 'forecasted' | 'estimated';
  acceptedSpend: number;
  forecastedSpend: number;
  estimatedSpend: number;
  stories: AcceptedStory[];
  onBack: () => void;
}

export function SpendDrilldown({ type, acceptedSpend, forecastedSpend, estimatedSpend, stories, onBack }: SpendDrilldownProps) {
  const [selectedPIFilter, setSelectedPIFilter] = useState('All');
  const [hoveredStoryId, setHoveredStoryId] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const acceptedCount = stories.filter(s => s.spend > 0).length;
  const notAcceptedCount = stories.length - acceptedCount;
  const totalStories = stories.length;
  
  const amount = type === 'accepted' ? acceptedSpend : type === 'forecasted' ? forecastedSpend : estimatedSpend;
  const titleText = type === 'accepted' ? 'Accepted Spend' : type === 'forecasted' ? 'Forecasted Spend' : 'Estimated Spend';
  const description = type === 'accepted' 
    ? 'Accepted Spend is calculated by adding together the spend of stories related to this epic.'
    : type === 'forecasted'
    ? 'Forecasted Spend is calculated based on program increment forecasts for this epic.'
    : 'Estimated Spend is calculated based on feature estimates for this epic.';

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
        <span className="text-sm text-muted-foreground">/ {titleText}</span>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground mb-2">{titleText}</h2>
          <p className="text-sm text-muted-foreground mb-6">{description}</p>

          {/* Stats Row */}
          <div className="grid grid-cols-[repeat(3,200px)_1fr] gap-4">
            <div className="p-4 border border-border rounded-lg text-center">
              <div className="text-sm text-muted-foreground mb-1">Total</div>
              <div className="text-2xl font-semibold text-primary">{totalStories} <span className="text-base font-normal">stories</span></div>
            </div>
            <div className="p-4 border border-border rounded-lg text-center">
              <div className="text-sm text-muted-foreground mb-1 flex items-center justify-center gap-1">
                Accepted <ExternalLink className="w-3 h-3" />
              </div>
              <div className="text-2xl font-semibold text-primary">{acceptedCount} <span className="text-base font-normal">stories</span></div>
            </div>
            <div className="p-4 border border-border rounded-lg text-center">
              <div className="text-sm text-muted-foreground mb-1">Not accepted</div>
              <div className="text-2xl font-semibold text-primary">{notAcceptedCount} <span className="text-base font-normal">stories</span></div>
            </div>
            
            {/* Summary Card */}
            <div className="flex flex-col items-center justify-center p-4 rounded-lg" style={{ backgroundColor: '#36B37E' }}>
              <div className="text-3xl font-bold text-white">${amount.toLocaleString()}</div>
              <div className="text-sm text-white mt-1">based on {acceptedCount} accepted stories</div>
              <div className="text-sm text-white mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                ${amount.toLocaleString()} in PI-5
              </div>
            </div>
          </div>
        </div>

        {/* Info Alert */}
        {notAcceptedCount > 0 && (
          <div className="flex gap-3 p-4 mb-6 rounded-lg" style={{ backgroundColor: '#DEEBFF' }}>
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">
                {notAcceptedCount} stories tied to this epic have not been accepted
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                Unaccepted stories are not included when calculating Accepted Spend. To refine this calculation, the team or product owner should accept completed and verified work from a story's Details panel.
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
              <Select value={selectedPIFilter} onValueChange={setSelectedPIFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="PI-5">PI-5</SelectItem>
                  <SelectItem value="PI-6">PI-6</SelectItem>
                  <SelectItem value="PI-7">PI-7</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">Story  {acceptedCount}</div>
            <table className="w-full">
              <thead className="bg-muted border-y border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Story</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Team</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Spend</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((story) => (
                  <tr key={story.id} className="border-t border-border hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm text-primary hover:underline cursor-pointer">{story.numericId}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{story.title}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{story.team || 'None'}</td>
                    <td
                      className="px-4 py-3 text-sm text-right font-semibold cursor-pointer relative"
                      style={{ color: story.spend > 0 ? '#36B37E' : '#6B778C' }}
                      onMouseEnter={(e) => handleSpendClick(e, story)}
                      onMouseLeave={() => setHoveredStoryId(null)}
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
            className="fixed w-[320px] p-5 rounded-lg shadow-2xl z-[1100]"
            style={{ left: popupPosition.x, top: popupPosition.y, backgroundColor: '#172B4D', color: 'white' }}
            onMouseEnter={() => setHoveredStoryId(story.id)}
            onMouseLeave={() => setHoveredStoryId(null)}
          >
            <button 
              onClick={() => setHoveredStoryId(null)}
              className="absolute top-3 right-3 text-white/70 hover:text-white"
            >
              ×
            </button>
            <div className="text-base font-semibold mb-4">Story Accepted Spend</div>
            <div className="text-xs text-white/70 mb-1">TEAM SPRINT</div>
            <div className="text-sm mb-4">{story.teamSprintName}</div>
            <div className="text-xs text-white/70 mb-3">CALCULATION BREAKDOWN</div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm flex items-center gap-1">
                Team Spend per Point <Info className="w-3 h-3" />
              </span>
              <span className="text-sm font-semibold">${story.teamSpendPerPoint || 302}</span>
            </div>
            <div className="text-center text-white/40 my-2">×</div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm flex items-center gap-1">
                Story estimate <Info className="w-3 h-3" />
              </span>
              <div className="text-right">
                <div className="text-sm font-semibold">{story.storyEstimate || 4}</div>
                <div className="text-xs text-white/70">story points</div>
              </div>
            </div>
            <div className="border-t border-white/20 my-3" />
            <div className="text-2xl font-bold text-right mb-4">${story.spend.toLocaleString()}</div>
            <button className="w-full py-2.5 text-sm text-white border border-white/30 rounded hover:bg-white/10 flex items-center justify-center gap-2">
              View Spend per Point <TrendingUp className="w-4 h-4" />
            </button>
          </div>
        );
      })()}
    </div>
  );
}
