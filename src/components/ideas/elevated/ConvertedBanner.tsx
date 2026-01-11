// ============================================================
// CONVERTED BANNER - Success State
// ============================================================

import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ConvertedBannerProps {
  businessRequestCode: string;
  businessRequestTitle: string;
  convertedAt: Date;
  convertedBy?: string;
  onViewBR?: () => void;
  className?: string;
}

export function ConvertedBanner({
  businessRequestCode,
  businessRequestTitle,
  convertedAt,
  convertedBy,
  onViewBR,
  className,
}: ConvertedBannerProps) {
  return (
    <div className={cn(
      "bg-gradient-to-r from-emerald-100 to-green-100 border-2 border-emerald-400 rounded-2xl p-6",
      "flex items-center justify-between",
      className
    )}>
      <div className="flex items-center gap-4">
        <div className="w-[52px] h-[52px] rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <CheckCircle className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-emerald-800 mb-0.5">
            Converted to Business Request
          </h3>
          <p className="text-sm text-emerald-700">
            <span className="font-semibold">{businessRequestCode}</span> — {businessRequestTitle}
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            {format(convertedAt, 'MMM d, yyyy at h:mm a')}
            {convertedBy && ` by ${convertedBy}`}
          </p>
        </div>
      </div>

      {onViewBR && (
        <Button
          onClick={onViewBR}
          variant="outline"
          className="bg-white border-2 border-emerald-500 text-emerald-700 font-semibold hover:bg-emerald-500 hover:text-white transition-all"
        >
          View Business Request
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
