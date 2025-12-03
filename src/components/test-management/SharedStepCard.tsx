import React from 'react';
import { FileText, Edit, Trash2, Eye, Users } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SharedTestStep } from '@/types/sharedSteps.types';

interface SharedStepCardProps {
  step: SharedTestStep;
  onEdit: (step: SharedTestStep) => void;
  onViewUsage: (step: SharedTestStep) => void;
  onDelete: (step: SharedTestStep) => void;
}

export const SharedStepCard: React.FC<SharedStepCardProps> = ({
  step,
  onEdit,
  onViewUsage,
  onDelete,
}) => {
  const getUsageBadge = () => {
    if (step.usage_count === 0) {
      return <Badge variant="secondary" className="text-xs">Unused</Badge>;
    }
    if (step.usage_count >= 10) {
      return <Badge className="bg-brand-gold text-white text-xs">High Usage</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{step.usage_count} test cases</Badge>;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <FileText className="h-5 w-5 text-brand-gold mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-foreground line-clamp-2">
                {step.title}
              </CardTitle>
            </div>
          </div>
          {getUsageBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {step.description}
        </p>
        {step.expected_result && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Expected:</span> {step.expected_result}
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 pt-3 border-t border-border">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{step.usage_count} linked</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewUsage(step)}
            className="h-8 px-2"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(step)}
            className="h-8 px-2"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(step)}
            disabled={step.usage_count > 0}
            className="h-8 px-2 text-destructive hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
