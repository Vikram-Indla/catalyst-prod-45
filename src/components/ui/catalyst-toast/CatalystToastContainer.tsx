import React from 'react';
import { CatalystToast, CatalystToastProps } from './CatalystToast';
import { cn } from '@/lib/utils';

export interface CatalystToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  toasts: CatalystToastProps[];
  isRTL?: boolean;
}

const positionClasses: Record<string, string> = {
  'top-right': 'top-6 right-6',
  'top-left': 'top-6 left-6',
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
};

export const CatalystToastContainer: React.FC<CatalystToastContainerProps> = ({
  position = 'top-right',
  toasts,
  isRTL = false,
}) => {
  // Auto-detect RTL position
  const effectivePosition = isRTL 
    ? position.replace('right', 'temp').replace('left', 'right').replace('temp', 'left') as typeof position
    : position;

  return (
    <div
      className={cn(
        'fixed z-[9999] flex flex-col gap-3 pointer-events-none',
        positionClasses[effectivePosition]
      )}
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <CatalystToast {...toast} isRTL={isRTL} />
        </div>
      ))}
    </div>
  );
};

export default CatalystToastContainer;
