// Use database feature type structure
interface ProgramBoardFeature {
  id: string;
  display_id?: string | null;
  name: string;
  status?: string | null;
  blocked?: boolean | null;
  team_id?: string | null;
  team_target_completion_sprint_id?: string | null;
}

interface FeatureCardTooltipProps {
  feature: ProgramBoardFeature;
}

export function FeatureCardTooltip({ feature }: FeatureCardTooltipProps) {
  const planningIssues = [];
  
  if (feature.blocked) {
    planningIssues.push("Feature is blocked");
  }
  if (!feature.team_id) {
    planningIssues.push("No team assigned");
  }
  if (!feature.team_target_completion_sprint_id) {
    planningIssues.push("No sprint assigned");
  }

  return (
    <div className="w-[280px] p-3 space-y-2 text-sm">
      <div className="font-semibold text-foreground">
        Feature #{feature.display_id || feature.id?.slice(0, 8)}
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">State:</span>
        <span className="font-medium text-foreground">{feature.status || 'Not Started'}</span>
      </div>

      {planningIssues.length > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="font-semibold text-destructive mb-1">PLANNING ISSUES</div>
          <div className="space-y-1">
            {planningIssues.map((issue, idx) => (
              <div key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                <span className="text-destructive">•</span>
                <span>{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
