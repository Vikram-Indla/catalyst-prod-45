// ============================================================
// TRIAGE PANEL - AI-Powered Classification
// ============================================================

import { ClipboardCheck, Sparkles, Zap, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface TriagePanelProps {
  ideaId: string;
  aiRecommendation?: {
    type: 'quick_win' | 'strategic';
    confidence: number;
    reason: string;
  };
  onClassify?: (type: 'quick_win' | 'strategic', notes: string) => Promise<void>;
  className?: string;
}

export function TriagePanel({
  ideaId,
  aiRecommendation,
  onClassify,
  className,
}: TriagePanelProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClassify = async (type: 'quick_win' | 'strategic') => {
    if (!onClassify) return;
    setIsSubmitting(true);
    try {
      await onClassify(type, notes);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn(
      "bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-6",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center">
          <ClipboardCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Triage This Idea</h3>
          <p className="text-sm text-slate-600">Classify as Quick Win or Strategic to proceed</p>
        </div>
      </div>

      {/* AI Recommendation */}
      {aiRecommendation && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-violet-600 uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            AI Recommendation
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold",
              aiRecommendation.type === 'quick_win' 
                ? "bg-emerald-100 text-emerald-700"
                : "bg-blue-100 text-blue-700"
            )}>
              {aiRecommendation.type === 'quick_win' ? (
                <Zap className="w-4 h-4" />
              ) : (
                <Package className="w-4 h-4" />
              )}
              {aiRecommendation.type === 'quick_win' ? 'Quick Win' : 'Strategic'}
            </div>
            <p className="text-sm text-slate-600">
              <strong className="text-slate-900">{aiRecommendation.confidence}% confidence</strong> — {aiRecommendation.reason}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          onClick={() => handleClassify('quick_win')}
          disabled={isSubmitting}
          variant="outline"
          className="h-14 text-base font-semibold border-2 border-emerald-500 text-emerald-700 bg-white hover:bg-emerald-500 hover:text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
        >
          <Zap className="w-5 h-5 mr-2" />
          Mark as Quick Win
        </Button>
        <Button
          onClick={() => handleClassify('strategic')}
          disabled={isSubmitting}
          variant="outline"
          className="h-14 text-base font-semibold border-2 border-blue-500 text-blue-700 bg-white hover:bg-blue-500 hover:text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30 transition-all"
        >
          <Package className="w-5 h-5 mr-2" />
          Mark as Strategic
        </Button>
      </div>

      {/* Notes */}
      <Textarea
        placeholder="Add classification notes (optional)..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="bg-white border-slate-200 resize-none focus:border-blue-500 focus:ring-blue-500/20"
        rows={2}
      />
    </div>
  );
}
