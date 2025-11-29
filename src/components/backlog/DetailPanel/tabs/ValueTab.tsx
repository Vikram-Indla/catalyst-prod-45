import { ValueField } from '@/types/backlog.types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface ValueTabProps {
  fields: ValueField[];
  valueScore: number;
  valueScoreAverage?: number;
  valueScoreComparison?: number;
  onFieldChange: (fieldId: string, value: string) => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'hsl(var(--success))';
  if (score >= 50) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

export function ValueTab({ 
  fields, 
  valueScore, 
  valueScoreAverage, 
  valueScoreComparison,
  onFieldChange 
}: ValueTabProps) {
  return (
    <div className="grid grid-cols-[1fr_350px] gap-8 p-6">
      {/* Left Column */}
      <div>
        <h3 className="text-2xl font-semibold text-foreground mb-8">High Level ROI</h3>
        
        <div className="flex flex-col gap-8">
          {fields.map((field) => (
            <div key={field.id} className="grid grid-cols-[1fr_auto] gap-8 items-center">
              <div className="max-w-[280px]">
                <label className="block text-base text-foreground mb-3">
                  {field.number}. {field.label}
                </label>
                <Select value={field.value} onValueChange={(value) => onFieldChange(field.id, value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div 
                className="flex items-center justify-center w-20 h-20 rounded-full border-8" 
                style={{ borderColor: getScoreColor(field.score) }}
              >
                <span className="text-2xl font-bold text-foreground">{field.score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Right Column - Value Score Card */}
      <div className="flex flex-col items-center p-6 bg-card border border-border rounded-lg h-fit">
        <p className="text-sm text-muted-foreground mb-2">Value Score:</p>
        <div className="text-7xl font-bold text-primary leading-none mb-2">{valueScore}</div>
        {valueScoreAverage && (
          <p className="text-sm text-muted-foreground mb-3">(Average: {valueScoreAverage})</p>
        )}
        {valueScoreComparison !== undefined && (
          <p className="text-sm text-foreground text-center mb-6">
            That's <span className="font-semibold text-success">{valueScoreComparison}% Higher</span> than other associated Epics that are using this score card.
          </p>
        )}
        <Button size="lg" className="w-full">Analyze</Button>
      </div>
    </div>
  );
}