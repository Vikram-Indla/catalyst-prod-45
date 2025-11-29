export function ColumnHeaders() {
  return (
    <div className="grid grid-cols-[40px_50px_70px_1fr_auto_70px_50px_100px] items-center px-4 py-2 bg-background border-b border-border text-xs font-semibold text-muted-foreground">
      {/* Empty for expand arrow */}
      <div />
      
      {/* Empty for rank */}
      <div />
      
      {/* Empty for status */}
      <div />
      
      {/* Epic */}
      <div className="px-2">Epic</div>
      
      {/* Empty for labels */}
      <div />
      
      {/* Points */}
      <div className="text-right">Points</div>
      
      {/* MVP */}
      <div className="text-center">MVP</div>
      
      {/* Process */}
      <div>Process Step</div>
    </div>
  );
}
