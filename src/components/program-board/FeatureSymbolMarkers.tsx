import { AlertTriangle, Flag, Star, Split } from "lucide-react";

// Use database feature type structure
interface ProgramBoardFeature {
  id: string;
  blocked?: boolean | null;
}

interface FeatureSymbolMarkersProps {
  feature: ProgramBoardFeature;
  size?: number;
}

export function FeatureSymbolMarkers({ feature, size = 14 }: FeatureSymbolMarkersProps) {
  const markers = [];

  // Dependency marker (triangle warning)
  if (feature.blocked) {
    markers.push(
      <AlertTriangle 
        key="dependency" 
        size={size} 
        className="text-orange-500" 
        fill="currentColor"
      />
    );
  }

  // Objective marker (flag)
  // Check if feature is linked to objectives (mock check for now)
  const hasObjective = Math.random() > 0.7;
  if (hasObjective) {
    markers.push(
      <Flag 
        key="objective" 
        size={size} 
        className="text-blue-500" 
        fill="currentColor"
      />
    );
  }

  // Milestone marker (star)
  // Check if feature has milestone (mock check for now)
  const hasMilestone = Math.random() > 0.8;
  if (hasMilestone) {
    markers.push(
      <Star 
        key="milestone" 
        size={size} 
        className="text-yellow-500" 
        fill="currentColor"
      />
    );
  }

  // Split feature marker
  // Check if feature is split across teams (mock check for now)
  const isSplit = Math.random() > 0.9;
  if (isSplit) {
    markers.push(
      <Split 
        key="split" 
        size={size} 
        className="text-purple-500"
      />
    );
  }

  if (markers.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5">
      {markers}
    </div>
  );
}
