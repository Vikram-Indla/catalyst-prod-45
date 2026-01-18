/**
 * AI Summary Card with purple gradient
 */

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AIInsight } from '../types';

interface AISummaryCardProps {
  insights: AIInsight[];
}

export function AISummaryCard({ insights }: AISummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 text-white"
      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5" />
        <h3 className="font-semibold">AI Summary</h3>
      </div>

      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span>{insight.icon}</span>
            <div>
              <p className="opacity-95">{insight.message}</p>
              {insight.action && (
                <p className="text-xs opacity-70 mt-0.5">→ {insight.action}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-3 text-white hover:bg-white/20 w-full justify-center"
        onClick={() => {
          const toast = (window as any).toast || console.log;
          if (typeof toast === 'function') toast('AI recommendations panel coming soon');
        }}
      >
        Get Recommendations <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </motion.div>
  );
}
