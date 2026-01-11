import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
  action?: string;
  onAction?: () => void;
  variant?: 'default' | 'compact';
}

export function EmptyState({ icon, message, action, onAction, variant = 'default' }: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div className="bg-muted/50 rounded-lg p-4 text-center border border-dashed border-border min-h-[80px] flex flex-col items-center justify-center">
        <div className="text-muted-foreground mb-1">{icon}</div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }
  
  return (
    <div className="bg-muted/50 rounded-lg p-6 text-center border border-dashed border-border">
      <div className="text-muted-foreground mb-2">{icon}</div>
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {action && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}
