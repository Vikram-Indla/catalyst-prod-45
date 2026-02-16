import { Sparkles, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import styles from '@/styles/release-hub.module.css';

function useReleaseAIInsights(enabled: boolean) {
  return useQuery({
    queryKey: ['release-ai-insights'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('release-ai-insights', { method: 'POST', body: {} });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function InsightSection({ title, emoji, color, items }: { title: string; emoji: string; color: string; items: any[] }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color, marginBottom: 8 }}>
        {emoji} {title}
      </div>
      {items.map((item: any, i: number) => (
        <div key={i} className={`${styles.aiInsightCard} ${
          color === 'var(--rh-danger)' ? styles.aiInsightCardCritical
          : color === 'var(--rh-warning)' ? styles.aiInsightCardWarning
          : styles.aiInsightCardPositive
        }`}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
          <div style={{ fontSize: 12, color: 'var(--rh-text-secondary)', marginBottom: item.recommendation ? 4 : 0 }}>{item.description}</div>
          {item.recommendation && (
            <div style={{ fontSize: 11, color: 'var(--rh-primary)', fontWeight: 500 }}>💡 {item.recommendation}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ReleaseAIInsights({ isOpen, onClose }: Props) {
  const { data: insights, isLoading, error } = useReleaseAIInsights(isOpen);

  if (!isOpen) return null;

  return (
    <div className={styles.aiPanel}>
      <div className={styles.aiPanelHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} style={{ color: 'var(--rh-ai-primary)' }} />
          <div>
            <div style={{ fontFamily: 'var(--rh-font-heading)', fontSize: 16, fontWeight: 700 }}>AI Release Intelligence</div>
            <div style={{ fontSize: 11, color: 'var(--rh-text-tertiary)' }}>
              Powered by Gemini · Real-time analysis
            </div>
          </div>
        </div>
        <button onClick={onClose} className={styles.btnOutlineSm}>✕ Close</button>
      </div>
      <div className={styles.aiPanelBody}>
        {isLoading ? (
          <div className={styles.loadingCenter}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Analyzing releases with AI...</span>
          </div>
        ) : error ? (
          <div style={{ padding: 16, color: 'var(--rh-danger)', fontSize: 13 }}>
            Failed to load insights. {(error as Error).message}
          </div>
        ) : insights ? (
          <>
            <InsightSection title="Action Required" emoji="🔴" color="var(--rh-danger)" items={insights.action_required} />
            <InsightSection title="Items to Watch" emoji="🟡" color="var(--rh-warning)" items={insights.items_to_watch} />
            <InsightSection title="Positive Signals" emoji="🟢" color="var(--rh-success)" items={insights.positive_signals} />
          </>
        ) : null}
      </div>
      <div className={styles.aiPanelFooter}>
        <span style={{ fontSize: 11, color: 'var(--rh-text-muted)' }}>
          Last updated {insights?.generated_at ? new Date(insights.generated_at).toLocaleTimeString() : '—'}
        </span>
      </div>
    </div>
  );
}
