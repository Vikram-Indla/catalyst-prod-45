interface PIProgressBarProps {
  progress: number;
}

export function PIProgressBar({ progress }: PIProgressBarProps) {
  return (
    <div className="flex items-center gap-2 ml-4">
      <span className="text-sm text-muted-foreground">PI Progress:</span>
      <div className="w-20 h-2 bg-muted rounded overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-destructive to-brand-gold rounded"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
