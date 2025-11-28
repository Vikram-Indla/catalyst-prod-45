import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface EpicValueTabProps {
  epic: any;
}

export function EpicValueTab({ epic }: EpicValueTabProps) {
  const businessValue = epic.business_value || 0;
  const timeCriticality = epic.time_criticality || 0;
  const riskReduction = epic.risk_reduction || 0;
  const jobSize = epic.job_size || 1;
  
  const wsjfScore = jobSize > 0 
    ? ((businessValue + timeCriticality + riskReduction) / jobSize).toFixed(2)
    : 0;

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        WSJF (Weighted Shortest Job First) value scoring
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <Label>Business Value (1-20)</Label>
          <Input
            type="number"
            min="1"
            max="20"
            defaultValue={businessValue}
            className="mt-2"
          />
          <Progress value={(businessValue / 20) * 100} className="mt-2" />
        </div>

        <div>
          <Label>Time Criticality (1-20)</Label>
          <Input
            type="number"
            min="1"
            max="20"
            defaultValue={timeCriticality}
            className="mt-2"
          />
          <Progress value={(timeCriticality / 20) * 100} className="mt-2" />
        </div>

        <div>
          <Label>Risk Reduction / Opportunity Enablement (1-20)</Label>
          <Input
            type="number"
            min="1"
            max="20"
            defaultValue={riskReduction}
            className="mt-2"
          />
          <Progress value={(riskReduction / 20) * 100} className="mt-2" />
        </div>

        <div>
          <Label>Job Size (1-20)</Label>
          <Input
            type="number"
            min="1"
            max="20"
            defaultValue={jobSize}
            className="mt-2"
          />
          <Progress value={(jobSize / 20) * 100} className="mt-2" />
        </div>
      </div>

      <div className="border rounded-lg p-6 bg-muted/30">
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            WSJF Score
          </div>
          <div className="text-4xl font-bold">{wsjfScore}</div>
          <div className="text-sm text-muted-foreground mt-2">
            ({businessValue} + {timeCriticality} + {riskReduction}) / {jobSize}
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Higher WSJF scores indicate higher priority for implementation
      </div>
    </div>
  );
}
