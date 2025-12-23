import React from 'react';
import { CatalystToast, CatalystToastProps } from './CatalystToast';
import { cn } from '@/lib/utils';

// The container accepts props without onClose, then adds onClose when rendering
export type CatalystToastItemForContainer = Omit<CatalystToastProps, 'onClose'> & { onClose?: (id: string) => void };

export interface CatalystToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  toasts: (CatalystToastProps | CatalystToastItemForContainer)[];
  isRTL?: boolean;
  onDismiss?: (id: string) => void;
}

const positionClasses: Record<string, string> = {
  'top-right': 'top-6 right-6',
  'top-left': 'top-6 left-6',
  'bottom-right': 'bottom-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'top-center': 'top-6 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
};

export const CatalystToastContainer: React.FC<CatalystToastContainerProps> = ({
  position = 'top-right',
  toasts,
  isRTL = false,
  onDismiss,
}) => {
  // Auto-detect RTL position for corner positions
  const effectivePosition = isRTL && (position.includes('right') || position.includes('left'))
    ? position.replace('right', 'temp').replace('left', 'right').replace('temp', 'left') as typeof position
    : position;

  if (toasts.length === 0) return null;

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
          <CatalystToast 
            {...toast} 
            onClose={toast.onClose || onDismiss || (() => {})} 
            isRTL={isRTL} 
          />
        </div>
      ))}
    </div>
  );
};

export default CatalystToastContainer;
