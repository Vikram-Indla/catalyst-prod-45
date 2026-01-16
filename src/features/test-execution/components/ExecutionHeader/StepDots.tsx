/**
 * StepDots - Progress indicators showing all step states
 */

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StepDotsProps {
  steps: Array<{ status: string }>;
  currentIndex: number;
  onStepClick: (index: number) => void;
}

export function StepDots({ steps, currentIndex, onStepClick }: StepDotsProps) {
  const getStatusColor = (status: string, isCurrent: boolean) => {
    if (isCurrent && status === 'pending') {
      return 'bg-primary';
    }
    
    switch (status) {
      case 'passed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'blocked':
        return 'bg-amber-500';
      case 'skipped':
        return 'bg-slate-400';
      default:
        return 'bg-slate-200';
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex;
        const statusColor = getStatusColor(step.status, isCurrent);
        
        return (
          <motion.button
            key={index}
            onClick={() => onStepClick(index)}
            className={cn(
              'rounded-full transition-all duration-300 cursor-pointer',
              statusColor,
              isCurrent ? 'w-3 h-3 ring-4 ring-primary/20' : 'w-2.5 h-2.5 hover:scale-110'
            )}
            animate={{
              scale: isCurrent ? 1.3 : 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
            }}
            title={`Step ${index + 1}: ${step.status}`}
          />
        );
      })}
    </div>
  );
}
