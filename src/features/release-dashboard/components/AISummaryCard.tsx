/**
 * AI Summary Card with purple gradient
 * Powered by Lovable AI (Gemini) for real release analysis
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SparklesIcon from '@atlaskit/icon/core/atlassian-intelligence';
import ArrowRightIcon from '@atlaskit/icon/core/arrow-right';
import Spinner from '@atlaskit/spinner';
import CloseIcon from '@atlaskit/icon/core/close';
import ErrorIcon from '@atlaskit/icon/core/error';
import WarningIcon from '@atlaskit/icon/core/warning';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AIInsight } from '../types';

interface AISummaryCardProps {
  insights: AIInsight[];
  releaseData?: Record<string, unknown>;
}

const INSIGHT_ICONS: Record<string, React.ReactNode> = {
  critical: <ErrorIcon label="" size="small" primaryColor="currentColor" />,
  warning: <WarningIcon label="" size="small" primaryColor="currentColor" />,
  positive: <CheckCircleIcon label="" size="small" primaryColor="currentColor" />,
};

export function AISummaryCard({ insights: staticInsights, releaseData }: AISummaryCardProps) {
  const [aiInsights, setAiInsights] = useState<AIInsight[] | null>(null);
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [showRecs, setShowRecs] = useState(false);

  const insights = aiInsights || staticInsights;

  const fetchAIInsights = async () => {
    if (!releaseData) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('release-ai-summary', {
        body: { releaseData, mode: 'insights' },
      });
      if (error) throw error;
      if (data?.insights) {
        setAiInsights(data.insights.map((i: any) => ({
          type: i.type || 'positive',
          icon: i.type === 'critical' ? '🔴' : i.type === 'warning' ? '⚠' : '✅',
          message: i.message,
          action: i.action,
        })));
      }
    } catch (err: any) {
      console.error('AI insights error:', err);
      toast.error(err?.message || 'Failed to generate AI insights');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    if (!releaseData) {
      toast.info('Select a release to get AI recommendations');
      return;
    }
    setLoadingRecs(true);
    setShowRecs(true);
    try {
      const { data, error } = await supabase.functions.invoke('release-ai-summary', {
        body: { releaseData, mode: 'recommendations' },
      });
      if (error) throw error;
      setRecommendations(data?.recommendations || 'No recommendations available.');
      // Also update insights if returned
      if (data?.insights) {
        setAiInsights(data.insights.map((i: any) => ({
          type: i.type || 'positive',
          icon: i.type === 'critical' ? '🔴' : i.type === 'warning' ? '⚠' : '✅',
          message: i.message,
          action: i.action,
        })));
      }
    } catch (err: any) {
      console.error('AI recommendations error:', err);
      toast.error(err?.message || 'Failed to get recommendations');
      setShowRecs(false);
    } finally {
      setLoadingRecs(false);
    }
  };

  // Auto-fetch on mount if releaseData is available
  const hasFetched = useRef(false);
  useEffect(() => {
    if (releaseData && !hasFetched.current) {
      hasFetched.current = true;
      fetchAIInsights();
    }
  }, [releaseData]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-4 text-white relative"
        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon label="" size="small" primaryColor="currentColor" />
          <h3 className="font-semibold">AI Summary</h3>
          {aiInsights && (
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
              Powered by Gemini
            </span>
          )}
          {loading && <Spinner size="small" label="Loading" />}
        </div>

        <div className="space-y-3">
          {loading && !aiInsights ? (
            <div className="flex items-center gap-2 text-sm opacity-80">
              <Spinner size="small" label="Analyzing" />
              <span>Analyzing release data...</span>
            </div>
          ) : (
            insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {INSIGHT_ICONS[insight.type] || <span>{insight.icon}</span>}
                <div>
                  <p className="opacity-95">{insight.message}</p>
                  {insight.action && (
                    <p className="text-xs opacity-70 mt-0.5">→ {insight.action}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-3 text-white hover:bg-white/20 w-full justify-center"
          onClick={fetchRecommendations}
          disabled={loadingRecs}
        >
          {loadingRecs ? (
            <>
              <Spinner size="small" label="Generating" /> Generating...
            </>
          ) : (
            <>
              Get Recommendations <ArrowRightIcon label="" size="small" primaryColor="currentColor" />
            </>
          )}
        </Button>
      </motion.div>

      {/* Recommendations Overlay */}
      <AnimatePresence>
        {showRecs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[600] flex items-center justify-center p-6"
            onClick={() => setShowRecs(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] rounded-xl shadow-2xl max-w-2xl w-full max-h-[70vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-[var(--ds-border,var(--cp-ink-1, #2E2E2E))]"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
              >
                <div className="flex items-center gap-2 text-white">
                  <SparklesIcon label="" size="small" primaryColor="currentColor" />
                  <h3 className="font-semibold text-sm">AI Recommendations</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowRecs(false)} className="h-7 w-7 p-0 text-white hover:bg-white/20">
                  <CloseIcon label="" size="small" primaryColor="currentColor" />
                </Button>
              </div>
              <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 52px)' }}>
                {loadingRecs ? (
                  <div className="flex items-center gap-3 justify-center py-12 text-slate-500">
                    <Spinner size="medium" label="Generating recommendations" />
                    <span className="text-sm">Generating strategic recommendations...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                    {recommendations}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
