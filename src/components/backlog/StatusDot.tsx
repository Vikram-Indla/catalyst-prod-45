import { EpicStatus } from '@/types/backlog.types';

interface StatusDotProps {
  status: EpicStatus;
}

export function StatusDot({ status }: StatusDotProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'in_progress':
        return 'bg-brand-gold';
      case 'done':
      case 'accepted':
        return 'bg-primary';
      case 'not_started':
        return 'bg-muted';
      case 'blocked':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
    </div>
  );
}
