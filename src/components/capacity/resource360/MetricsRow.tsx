interface MetricsRowProps {
  totalItems: number;
  completed: number;
  inProgress: number;
  upcoming: number;
}

export function MetricsRow({ totalItems, completed, inProgress, upcoming }: MetricsRowProps) {
  return (
    <div className="px-6 py-4 grid grid-cols-4 gap-3">
      <div className="text-center py-3 px-2 border border-border rounded-lg bg-background">
        <p className="text-2xl font-bold text-foreground">{totalItems}</p>
        <p className="text-xs text-muted-foreground">Total Items</p>
      </div>
      <div className="text-center py-3 px-2 border border-border rounded-lg bg-background">
        <p className="text-2xl font-bold text-foreground">{completed}</p>
        <p className="text-xs text-muted-foreground">Completed</p>
      </div>
      <div className="text-center py-3 px-2 border border-border rounded-lg bg-background">
        <p className="text-2xl font-bold text-foreground">{inProgress}</p>
        <p className="text-xs text-muted-foreground">In Progress</p>
      </div>
      <div className="text-center py-3 px-2 border border-border rounded-lg bg-background">
        <p className="text-2xl font-bold text-foreground">{upcoming}</p>
        <p className="text-xs text-muted-foreground">Upcoming</p>
      </div>
    </div>
  );
}
