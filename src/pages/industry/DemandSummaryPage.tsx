import React from "react";
import POBAWidget from "@/components/industry/POBAWidget";

const DemandSummaryPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - align header pattern */}
      <div className="h-[72px] border-b border-border bg-card px-6 flex items-center flex-shrink-0">
        <h1 className="text-lg font-semibold">Demand Summary</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl">
          <POBAWidget quarter="Q4 2025" />
        </div>
      </div>
    </div>
  );
};

export default DemandSummaryPage;
