import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';

export default function StrategyComingSoon() {
  const location = useLocation();
  const segment = location.pathname.split('/').pop() || '';
  const title = segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
        <Construction className="w-7 h-7 text-blue-600" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        This module is under construction and will be available soon as part of Strategy Hub.
      </p>
    </div>
  );
}
