/**
 * Progress Panel - Shows job progress
 */

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface ProgressPanelProps {
  progress: number;
  currentStep: string;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Loader2 }> = {
  generating: { label: 'Generating', variant: 'default', icon: Loader2 },
  loading: { label: 'Loading', variant: 'default', icon: Loader2 },
  cleaning: { label: 'Cleaning', variant: 'default', icon: Loader2 },
  parsing: { label: 'Parsing', variant: 'default', icon: Loader2 },
  previewing: { label: 'Preview Ready', variant: 'secondary', icon: CheckCircle2 },
  loaded: { label: 'Loaded', variant: 'secondary', icon: CheckCircle2 },
  cleaned: { label: 'Cleaned', variant: 'secondary', icon: CheckCircle2 },
  error: { label: 'Error', variant: 'destructive', icon: AlertCircle },
  draft: { label: 'Draft', variant: 'outline', icon: Clock },
  configuring: { label: 'Configuring', variant: 'outline', icon: Clock },
};

export function ProgressPanel({ progress, currentStep, status }: ProgressPanelProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;
  const isAnimating = ['generating', 'loading', 'cleaning', 'parsing'].includes(status);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-full ${isAnimating ? 'bg-primary/20' : 'bg-muted'}`}>
            <Icon className={`h-5 w-5 ${isAnimating ? 'text-primary animate-spin' : 'text-muted-foreground'}`} />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{currentStep || 'Initializing...'}</span>
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>
              <span className="text-sm font-medium text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
