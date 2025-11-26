import { EpicStatus } from '@/types/backlog.types';

interface StatusDotProps {
  status: EpicStatus;
}

export function StatusDot({ status }: StatusDotProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'in_progress':
        return 'bg-[#FF8B00]';
      case 'done':
      case 'accepted':
        return 'bg-[#0052CC]';
      case 'not_started':
        return 'bg-[#C1C7D0]';
      case 'blocked':
        return 'bg-[#DE350B]';
      default:
        return 'bg-[#C1C7D0]';
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
    </div>
  );
}
