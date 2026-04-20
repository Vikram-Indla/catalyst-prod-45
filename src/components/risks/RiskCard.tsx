// Risk Card Component - Individual risk card in ROAM board
// Source: Screenshot-RiskROAMReport, Implementation Spec Section 5.4

import { Risk } from "@/types/risks";
import { MoreVertical } from "lucide-react";
import { Avatar } from "@/components/ads";

interface RiskCardProps {
  risk: Risk;
}

export function RiskCard({ risk }: RiskCardProps) {
  // Owner name (would be from joined data)
  const ownerName = "Owner"; // TODO: Get from owner data

  return (
    <div className="bg-background border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start gap-2">
        <Avatar name={ownerName} size="xsmall" />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary font-medium line-clamp-2">
            {risk.risk_number} : {risk.title}
          </p>
        </div>

        <button className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-4 h-4 text-text-muted" />
        </button>
      </div>
    </div>
  );
}
