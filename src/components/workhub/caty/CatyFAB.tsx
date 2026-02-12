/**
 * CatyFAB — Floating Action Button for Caty AI
 * Always visible, toggles panel open/close
 */

import { Sparkles } from 'lucide-react';
import { useCatyInsights } from '@/hooks/workhub/useCatyAI';

interface CatyFABProps {
  isOpen: boolean;
  onClick: () => void;
}

export function CatyFAB({ isOpen, onClick }: CatyFABProps) {
  const { insights } = useCatyInsights();

  // Show red dot if there are high-severity action items
  const hasAlerts =
    insights?.actionItems?.some((item: any) => item.severity === 'high') ?? false;

  if (isOpen) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform animate-in fade-in-0 duration-300"
      style={{
        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
        zIndex: 'calc(var(--wh-z-caty) - 1)',
        boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
      }}
      title="Open Caty AI"
    >
      <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white" />

      {/* Alert Badge */}
      {hasAlerts && (
        <div
          className="absolute top-0 right-0 w-3 h-3 rounded-full"
          style={{ backgroundColor: '#dc2626' }}
        />
      )}
    </button>
  );
}
