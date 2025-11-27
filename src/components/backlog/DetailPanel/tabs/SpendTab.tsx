import { useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
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
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-sm font-semibold" style={{ color: '#36B37E' }}>${acceptedSpend.toLocaleString()}</div>
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
  const [drilldownView, setDrilldownView] = useState<'accepted' | 'forecasted' | 'estimated' | null>(null);

  if (drilldownView) {
    return (
      <SpendDrilldown
        type={drilldownView}
        acceptedSpend={acceptedSpend}
        forecastedSpend={forecastedSpend}
        estimatedSpend={estimatedSpend}
        stories={acceptedStories || []}
        onBack={() => setDrilldownView(null)}
      />
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Spend</h2>
      
      {/* Overview Section */}
      <div className="grid grid-cols-[1fr_260px] gap-8 mb-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-muted-foreground" />
              <span className="text-base text-muted-foreground">Budget</span>
            </div>
            <input
              type="text"
              value={`$${budget?.toLocaleString()}`}
              className="text-lg font-semibold text-foreground bg-background border border-border rounded px-4 py-2 w-40 text-right"
              readOnly
            />
          </div>
          <div className="h-px bg-border"></div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#36B37E]" />
              <span className="text-base text-muted-foreground">Accepted Spend</span>
            </div>
            <span className="text-lg font-semibold" style={{ color: '#36B37E' }}>
              ${acceptedSpend.toLocaleString()}
            </span>
          </div>
          <div className="h-px bg-border"></div>
          <div className="flex items-center justify-between py-3">
            <span className="text-base font-semibold text-foreground">Remaining</span>
            <span className="text-lg font-semibold text-muted-foreground">
              ${remaining.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <DonutChart budget={budget || 0} acceptedSpend={acceptedSpend} />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border my-8" />

      {/* Progression Section */}
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-4">Progression of spend</h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-3xl">
          Once the epic has program Program Increment forecasts, its child features are
          estimated and teams start to accept child stories, you can begin to see how
          your initial forecast measures against more detailed feature estimates and
          accepted work.
        </p>

        {/* Spend Cards */}
        <div className="grid grid-cols-3 gap-6">
          <button
            onClick={() => setDrilldownView('forecasted')}
            className="p-6 border-2 border-border rounded-lg hover:border-primary hover:shadow-lg transition-all cursor-pointer text-left group"
          >
            <div className="text-base font-semibold text-foreground mb-1">Forecasted Spend</div>
            <div className="text-sm text-muted-foreground mb-4">by forecasts</div>
            <div className="text-3xl font-bold" style={{ color: '#36B37E' }}>
              ${forecastedSpend.toLocaleString()}
            </div>
          </button>
          
          <button
            onClick={() => setDrilldownView('estimated')}
            className="p-6 border-2 border-border rounded-lg hover:border-primary hover:shadow-lg transition-all cursor-pointer text-left group"
          >
            <div className="text-base font-semibold text-foreground mb-1">Estimated Spend</div>
            <div className="text-sm text-muted-foreground mb-4">by features</div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold" style={{ color: '#FF991F' }}>
                ${estimatedSpend.toLocaleString()}
              </div>
              {estimatedSpend > (budget || 0) && (
                <AlertTriangle className="w-6 h-6" style={{ color: '#FFAB00' }} />
              )}
            </div>
          </button>
          
          <button
            onClick={() => setDrilldownView('accepted')}
            className="p-6 border-2 border-border rounded-lg hover:border-primary hover:shadow-lg transition-all cursor-pointer text-left group"
          >
            <div className="text-base font-semibold text-primary mb-1 flex items-center gap-2 group-hover:underline">
              Accepted Spend
              <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-sm text-muted-foreground mb-4">by stories</div>
            <div className="text-3xl font-bold" style={{ color: '#36B37E' }}>
              ${acceptedSpend.toLocaleString()}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}