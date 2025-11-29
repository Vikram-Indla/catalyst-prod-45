import { AlertTriangle, Flag, Star, AlertCircle, Link2, Diamond, Hexagon } from "lucide-react";

// Use database feature type structure
interface ProgramBoardFeature {
  id: string;
  blocked?: boolean | null;
  is_orphan_on_board?: boolean | null;
  orphan_board_teams?: string[] | null;
}

interface FeatureSymbolMarkersProps {
  feature: ProgramBoardFeature;
  size?: number;
  hasMilestone?: boolean;
  hasObjective?: boolean;
  hasOutsideDependency?: boolean;
  hasWorkItemLink?: boolean;
  hasPlanningError?: boolean;
}

export function FeatureSymbolMarkers({ 
  feature, 
  size = 14,
  hasMilestone,
  hasObjective,
  hasOutsideDependency,
  hasWorkItemLink,
  hasPlanningError,
}: FeatureSymbolMarkersProps) {
  const markers = [];
  
  // Planning Error Warning (highest priority)
  if (hasPlanningError) {
    markers.push(
      <div key="planning-error" title="Planning Error: Invalid dates or configuration">
        <AlertCircle 
          size={size} 
          className="text-destructive" 
          fill="currentColor"
        />
      </div>
    );
  }

  // Blocked/Dependency marker
  if (feature.blocked) {
    markers.push(
      <div key="blocked" title="Feature is blocked">
        <AlertTriangle 
          size={size} 
          className="text-orange-500" 
          fill="currentColor"
        />
      </div>
    );
  }
  
  // Outside Dependency Arrow
  if (hasOutsideDependency) {
    markers.push(
      <div key="outside-dep" title="Outside Dependency">
        <svg 
          width={size}
          height={size}
          viewBox="0 0 24 24" 
          className="text-brand-gold"
          fill="currentColor"
        >
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
        </svg>
      </div>
    );
  }

  // Milestone Diamond
  if (hasMilestone) {
    markers.push(
      <div key="milestone" title="Has Milestone">
        <Diamond 
          size={size} 
          className="text-warning" 
          fill="currentColor"
        />
      </div>
    );
  }

  // Objective Hexagon
  if (hasObjective) {
    markers.push(
      <div key="objective" title="Linked to PI Objective">
        <Hexagon 
          size={size} 
          className="text-primary" 
          fill="currentColor"
        />
      </div>
    );
  }
  
  // Work Item Link
  if (hasWorkItemLink) {
    markers.push(
      <div key="work-link" title="Has Work Item Links">
        <Link2 
          size={size} 
          className="text-workitem-theme"
        />
      </div>
    );
  }

  // Split Feature Indicator (orphan on board)
  if (feature.is_orphan_on_board && feature.orphan_board_teams && feature.orphan_board_teams.length > 1) {
    markers.push(
      <div 
        key="split"
        className="flex items-center gap-0.5"
        title={`Split across ${feature.orphan_board_teams.length} teams`}
      >
        <div className="h-3 w-1 bg-workitem-feature rounded-full" />
        <div className="h-3 w-1 bg-workitem-story rounded-full" />
      </div>
    );
  }

  if (markers.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {markers}
    </div>
  );
}
