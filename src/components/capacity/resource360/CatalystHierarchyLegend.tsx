/**
 * Catalyst Work Item Hierarchy Legend
 * Shows the hierarchy: Enterprise → Program → Project + Product
 */

export function CatalystHierarchyLegend() {
  return (
    <div className="px-6 py-4 border-b border-border/40">
      <div className="bg-muted/30 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-muted-foreground text-center mb-4 uppercase tracking-wide">
          Catalyst Work Item Hierarchy
        </h4>
        <div className="flex justify-between items-start gap-2 overflow-x-auto pb-1">
          {/* Enterprise */}
          <div className="flex-1 min-w-[100px] border-l-4 border-[#4d8b4d] pl-3 bg-background rounded-r-md py-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Enterprise</p>
            <div className="flex flex-wrap gap-1">
              <span className="px-2 py-0.5 text-[10px] rounded border border-border bg-background text-[#4d8b4d] font-medium">Theme</span>
              <span className="px-2 py-0.5 text-[10px] rounded border border-border bg-background text-muted-foreground font-medium">Objective</span>
              <span className="px-2 py-0.5 text-[10px] rounded border border-border bg-background text-[#d4b896] font-medium">Key Result</span>
            </div>
          </div>
          
          <span className="text-muted-foreground/40 mt-4 px-1">→</span>
          
          {/* Program */}
          <div className="flex-1 min-w-[90px] border-l-4 border-[#2563eb] pl-3 bg-background rounded-r-md py-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Program</p>
            <div className="flex flex-wrap gap-1">
              <span className="px-2 py-0.5 text-[10px] rounded border border-[#2563eb]/30 bg-[#2563eb]/5 text-[#2563eb] font-medium">Epic</span>
              <span className="px-2 py-0.5 text-[10px] rounded border border-[#0d9488]/30 bg-[#0d9488]/5 text-[#0d9488] font-medium">Feature</span>
            </div>
          </div>
          
          <span className="text-muted-foreground/40 mt-4 px-1">→</span>
          
          {/* Project */}
          <div className="flex-1 min-w-[90px] border-l-4 border-[#0d9488] pl-3 bg-background rounded-r-md py-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Project</p>
            <div className="flex flex-wrap gap-1">
              <span className="px-2 py-0.5 text-[10px] rounded border border-border bg-background text-[#8b7355] font-medium">Story</span>
              <span className="px-2 py-0.5 text-[10px] rounded border border-[#dc2626]/30 bg-[#dc2626]/5 text-[#dc2626] font-medium">Defect</span>
              <span className="px-2 py-0.5 text-[10px] rounded border border-[#d97706]/30 bg-[#d97706]/5 text-[#d97706] font-medium">Incident</span>
            </div>
          </div>
          
          {/* Product */}
          <div className="flex-1 min-w-[100px] border-l-4 border-dashed border-muted-foreground/30 pl-3 bg-background rounded-r-md py-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Product</p>
            <div className="flex flex-wrap gap-1">
              <span className="px-2 py-0.5 text-[10px] rounded border border-[#22c55e]/30 bg-[#22c55e]/5 text-[#22c55e] font-medium">Business Request</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
