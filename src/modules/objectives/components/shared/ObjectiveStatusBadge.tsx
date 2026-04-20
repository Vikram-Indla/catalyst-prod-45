import { Lozenge, type LozengeAppearance } from "@/components/ads";
import type { ObjectiveStatus } from "../../types/objective.types";

// §5 StatusLozenge + §L38 Atlaskit Lozenge appearances replace bespoke rgba/hsl overrides.
// Mapping follows the StatusLozenge 3-colour guardrail plus moved (yellow) and removed (red)
// only where the domain semantics require risk signalling (at-risk / off-track / missed).
const STATUS_CONFIG: Record<string, { label: string; appearance: LozengeAppearance }> = {
  pending:       { label: "Pending",     appearance: "default" },    // grey
  "in-progress": { label: "In Progress", appearance: "inprogress" }, // blue
  in_progress:   { label: "In Progress", appearance: "inprogress" }, // blue
  "on-track":    { label: "On Track",    appearance: "success" },    // green
  on_track:      { label: "On Track",    appearance: "success" },    // green
  "at-risk":     { label: "At Risk",     appearance: "moved" },      // yellow
  at_risk:       { label: "At Risk",     appearance: "moved" },      // yellow
  "off-track":   { label: "Off Track",   appearance: "removed" },    // red
  off_track:     { label: "Off Track",   appearance: "removed" },    // red
  paused:        { label: "Paused",      appearance: "default" },    // grey
  completed:     { label: "Completed",   appearance: "success" },    // green
  canceled:      { label: "Canceled",    appearance: "default" },    // grey
  missed:        { label: "Missed",      appearance: "removed" },    // red
};

interface ObjectiveStatusBadgeProps {
  status: ObjectiveStatus;
  size?: "sm" | "default";
  className?: string;
}

export function ObjectiveStatusBadge({ status }: ObjectiveStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['pending'];

  return (
    <Lozenge appearance={config.appearance}>
      {config.label}
    </Lozenge>
  );
}
