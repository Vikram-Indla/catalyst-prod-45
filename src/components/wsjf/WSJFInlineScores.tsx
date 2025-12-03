import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp } from 'lucide-react';
import { WSJFScoringModal } from './WSJFScoringModal';

/**
 * WSJFInlineScores - Displays PI-specific WSJF scores inline on Epic Details
 * Reference: EpicWSJFFields-2.png
 * 
 * Shows format: "PI-6 WSJF Prioritization: 0.18"
 * Clickable badge opens WSJFScoringModal
 */

interface WSJFInlineScoresProps {
  epicId: string;
  epicTitle: string;
  epicKey?: string;
}

export function WSJFInlineScores({ epicId, epicTitle, epicKey }: WSJFInlineScoresProps) {
  const [selectedPiId, setSelectedPiId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch all WSJF scores for this epic across PIs
  const { data: wsjfScores, isLoading } = useQuery({
    queryKey: ['epic-wsjf-inline', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_wsjf')
        .select(`
          *,
          program_increments(id, name)
        `)
        .eq('epic_id', epicId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!epicId,
  });

  const handleScoreClick = (piId: string) => {
    setSelectedPiId(piId);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-5 w-40 bg-muted animate-pulse rounded" />
        <div className="h-5 w-40 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!wsjfScores || wsjfScores.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No WSJF scores configured
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {wsjfScores.map((score: any) => {
          const piName = score.program_increments?.name || 'PI';
          const wsjfValue = score.wsjf_score || 0;
          
          return (
            <div 
              key={score.id}
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => handleScoreClick(score.pi_id)}
            >
              <span className="text-sm text-foreground font-medium">
                {piName} WSJF Prioritization:
              </span>
              <div className="flex items-center gap-1 text-brand-gold group-hover:text-brand-gold-hover transition-colors">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-semibold">{wsjfValue.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* WSJF Modal */}
      <WSJFScoringModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        workItemId={epicId}
        workItemType="epic"
        workItemTitle={epicTitle}
        workItemKey={epicKey}
        piId={selectedPiId || undefined}
        onSuccess={() => setModalOpen(false)}
      />
    </>
  );
}
