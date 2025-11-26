import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target } from 'lucide-react';
import { WSJFBadge } from '@/components/shared/WSJFBadge';
import { HealthBadge } from '@/components/shared/HealthBadge';
import FeaturePIObjectiveLinkDialog from '@/components/forms/FeaturePIObjectiveLinkDialog';
import { usePermission } from '@/hooks/usePermission';

interface FeatureCardProps {
  feature: any;
  onClick?: () => void;
  showPIObjectiveLink?: boolean;
}

export function FeatureCard({ feature, onClick, showPIObjectiveLink = false }: FeatureCardProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const canEdit = usePermission('features', 'edit');

  return (
    <>
      <Card 
        className="p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={onClick}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm line-clamp-2 flex-1">{feature.name}</h4>
            <HealthBadge health={feature.health} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {feature.wsjf_score > 0 && <WSJFBadge score={feature.wsjf_score} />}
            <Badge variant="outline" className="capitalize text-xs">
              {feature.status?.replace('_', ' ')}
            </Badge>
            {feature.blocked && (
              <Badge variant="destructive" className="text-xs">Blocked</Badge>
            )}
          </div>

          {feature.estimate_points && (
            <div className="text-xs text-muted-foreground">
              {feature.estimate_points} points
            </div>
          )}

          {showPIObjectiveLink && canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={(e) => {
                e.stopPropagation();
                setLinkDialogOpen(true);
              }}
            >
              <Target className="h-3 w-3 mr-2" />
              Link to PI Objectives
            </Button>
          )}
        </div>
      </Card>

      {showPIObjectiveLink && feature.program_id && feature.pi_id && (
        <FeaturePIObjectiveLinkDialog
          featureId={feature.id}
          programId={feature.program_id}
          piId={feature.pi_id}
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
        />
      )}
    </>
  );
}