import { toast } from 'sonner';
import { CheckCircle, Info, AlertTriangle } from 'lucide-react';

export const showSuccess = (message: string) =>
  toast.success(message, {
    duration: 3000,
    className: 'flex items-center gap-3 w-[356px] rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg shadow-black/5',
    icon: <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />,
  });

export const showInfo = (message: string) =>
  toast(message, {
    duration: 3000,
    className: 'flex items-center gap-3 w-[356px] rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-lg shadow-black/5',
    icon: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
  });

export const showError = (message: string) =>
  toast.error(message, {
    duration: 4000,
    className: 'flex items-center gap-3 w-[356px] rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-lg shadow-black/5',
    icon: <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />,
  });
