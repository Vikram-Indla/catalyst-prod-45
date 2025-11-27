import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AcceptedStory } from '@/types/backlog.types';
import { SpendDrilldown } from './SpendDrilldown';

interface SpendTabProps {
  budget: number | null;
  acceptedSpend: number;
  forecastedSpend: number;
  estimatedSpend: number;
  remaining: number;
  acceptedStories?: AcceptedStory[];
}

function DonutChart({ budget, acceptedSpend }: { budget: number; acceptedSpend: number }) {
  const percentage = budget > 0 ? (acceptedSpend / budget) * 100 : 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-40 h-40">
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="20"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#36B37E"
          strokeWidth="20"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xs text-muted-foreground">${acceptedSpend.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">of ${budget?.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">spent</div>
      </div>
    </div>
  );
}

export function SpendTab({ 
  budget, 
  acceptedSpend, 
  forecastedSpend, 
  estimatedSpend, 
  remaining,
  acceptedStories 
}: SpendTabProps) {
  const [drilldownView, setDrilldownView] = useState<'accepted' | null>(null);

  if (drilldownView === 'accepted') {
    return (
      <SpendDrilldown
        acceptedSpend={acceptedSpend}
        stories={acceptedStories || []}
        onBack={() => setDrilldownView(null)}
      />
    );
  }

  return (
    <div className="p-6">
      {/* Overview Section */}
      <div className="grid grid-cols-[1fr_200px] gap-8 mb-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-muted-foreground" />
            <span className="text-sm text-muted-foreground">Budget</span>
            <span className="text-sm font-semibold text-foreground">${budget?.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#36B37E]" />
            <span className="text-sm text-muted-foreground">Accepted Spend</span>
            <span className="text-sm font-semibold text-foreground">${acceptedSpend.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-3 ml-8">
            <span className="text-sm text-muted-foreground">Remaining</span>
            <span className="text-sm font-semibold text-foreground">${remaining.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <DonutChart budget={budget || 0} acceptedSpend={acceptedSpend} />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border my-6" />

      {/* Progression Section */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">Progression of spend</h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Once the epic has program Program Increment forecasts, its child features are
          estimated and teams start to accept child stories, you can begin to see how
          your initial forecast measures against more detailed feature estimates and
          accepted work.
        </p>

        {/* Spend Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border border-border rounded-lg hover:border-primary hover:shadow-md transition-all cursor-pointer">
            <div className="text-sm font-medium text-muted-foreground mb-1">Forecasted Spend</div>
            <div className="text-xs text-muted-foreground mb-2">by forecasts</div>
            <div className="text-xl font-semibold text-foreground">${forecastedSpend.toLocaleString()}</div>
          </div>
          
          <div className="p-4 border border-border rounded-lg hover:border-primary hover:shadow-md transition-all cursor-pointer">
            <div className="text-sm font-medium text-muted-foreground mb-1">Estimated Spend</div>
            <div className="text-xs text-muted-foreground mb-2">by features</div>
            <div className="flex items-center gap-2">
              <div className="text-xl font-semibold text-foreground">${estimatedSpend.toLocaleString()}</div>
              {estimatedSpend > (budget || 0) && (
                <AlertTriangle className="w-5 h-5 text-[#FFAB00]" />
              )}
            </div>
          </div>
          
          <div
            onClick={() => setDrilldownView('accepted')}
            className="p-4 border border-border rounded-lg hover:border-primary hover:shadow-md transition-all cursor-pointer"
          >
            <div className="text-sm font-medium text-muted-foreground mb-1">Accepted Spend</div>
            <div className="text-xs text-muted-foreground mb-2">by stories</div>
            <div className="text-xl font-semibold text-foreground">${acceptedSpend.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}