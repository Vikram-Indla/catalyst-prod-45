// ROAM Column Component - Single column in ROAM board
// Source: Screenshot-RiskROAMReport, Implementation Spec Section 5.3

import { Draggable } from "@hello-pangea/dnd";
import { Risk } from "@/types/risks";
import { RiskCard } from "./RiskCard";

interface RoamColumnProps {
  status: string;
  risks: Risk[];
  onRiskMove: (riskId: string, newStatus: string) => void;
}

export function RoamColumn({ status, risks, onRiskMove }: RoamColumnProps) {
  return (
    <div className="bg-card border rounded-lg">
      {/* Column Header */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            {status}
          </h3>
          <span className="text-xs font-medium text-text-muted bg-muted px-2 py-0.5 rounded">
            {risks.length}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div className="p-3 space-y-3 min-h-[200px]">
        {risks.map((risk, index) => (
          <Draggable key={risk.id} draggableId={risk.id} index={index}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                style={{
                  ...provided.draggableProps.style,
                  opacity: snapshot.isDragging ? 0.8 : 1,
                }}
              >
                <RiskCard risk={risk} />
              </div>
            )}
          </Draggable>
        ))}
      </div>
    </div>
  );
}
