import { ValueField } from '@/types/backlog.types';

interface ValueTabProps {
  fields: ValueField[];
  valueScore: number;
  valueScoreAverage?: number;
  valueScoreComparison?: number;
  onFieldChange: (fieldId: string, value: string) => void;
}

function getGaugeColor(score: number): string {
  if (score >= 100) return '#36B37E';
  if (score >= 66) return '#00B8D9';
  if (score >= 33) return '#FFAB00';
  return '#DE350B';
}

function CircularGauge({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getGaugeColor(score);

  return (
    <div className="relative w-16 h-16">
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-base font-semibold text-foreground">
        {score}
      </div>
    </div>
  );
}

export function ValueTab({ 
  fields, 
  valueScore, 
  valueScoreAverage, 
  valueScoreComparison,
  onFieldChange 
}: ValueTabProps) {
  return (
    <div className="grid grid-cols-[1fr_280px] gap-6 p-6">
      {/* Left Column */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-6">High Level ROI</h3>
        
        <div className="flex flex-col gap-6">
          {fields.map((field) => (
            <div key={field.id} className="flex items-center gap-4">
              <div className="flex-1 max-w-[200px]">
                <label className="block text-sm text-muted-foreground mb-2">
                  {field.number}. {field.label}
                </label>
                <select
                  value={field.value}
                  onChange={(e) => onFieldChange(field.id, e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded cursor-pointer focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {field.options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <CircularGauge score={field.score} />
            </div>
          ))}
        </div>
        
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">Value Engineering</p>
        </div>
      </div>
      
      {/* Right Column - Value Score Card */}
      <div className="flex flex-col items-center p-6 bg-card border border-border rounded-lg">
        <p className="text-xs text-muted-foreground mb-2">Value Score:</p>
        <div className="text-5xl font-bold text-foreground leading-none mb-1">{valueScore}</div>
        {valueScoreAverage && (
          <p className="text-xs text-muted-foreground mb-1">(Average: {valueScoreAverage})</p>
        )}
        {valueScoreComparison && (
          <p className="text-xs text-[#36B37E] font-semibold mb-4">
            That's {valueScoreComparison}% Higher than other Epics
          </p>
        )}
        <button className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90">
          Analyze
        </button>
      </div>
    </div>
  );
}