import { supabase } from '@/integrations/supabase/client';
import type {
  BrdDocument,
  BrdEpic,
  BrdQueueItem,
  PipelineStage,
  PipelineFilterState,
  StageStats,
} from '@/types/reqAssist';

// ─── FETCH ALL DOCUMENTS (with filters) ───────────────────────────
export async function fetchBrdDocuments(
  filters: Partial<PipelineFilterState> = {}
): Promise<BrdDocument[]> {
  let query = supabase
    .from('brd_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.stage && filters.stage !== 'all') {
    query = query.eq('pipeline_stage', filters.stage);
  }
  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }
  if (filters.domainTag) {
    query = query.eq('domain_tag', filters.domainTag);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as BrdDocument[];
}

// ─── FETCH SINGLE DOCUMENT ────────────────────────────────────────
export async function fetchBrdDocument(id: string): Promise<BrdDocument> {
  const { data, error } = await supabase
    .from('brd_documents')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as BrdDocument;
}

// ─── FETCH EPICS FOR A DOCUMENT ───────────────────────────────────
export async function fetchEpicsForDocument(brdId: string): Promise<BrdEpic[]> {
  const { data, error } = await supabase
    .from('brd_epics')
    .select('*')
    .eq('brd_id', brdId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as unknown as BrdEpic[];
}

// ─── FETCH QUEUE STATUS FOR A DOCUMENT ───────────────────────────
export async function fetchQueueStatus(brdId: string): Promise<BrdQueueItem | null> {
  const { data, error } = await supabase
    .from('brd_processing_queue')
    .select('*')
    .eq('brd_id', brdId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as BrdQueueItem | null;
}

// ─── FETCH ALL QUEUE ITEMS FOR A DOCUMENT (history) ──────────────
export async function fetchQueueItems(brdId: string): Promise<BrdQueueItem[]> {
  const { data, error } = await supabase
    .from('brd_processing_queue')
    .select('*')
    .eq('brd_id', brdId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as unknown as BrdQueueItem[];
}

// ─── FETCH EPIC COUNT FOR STATS ──────────────────────────────────
export async function fetchEpicCount(): Promise<number> {
  const { count, error } = await supabase
    .from('brd_epics')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

// ─── FETCH AVG QUALITY SCORE ─────────────────────────────────────
export async function fetchAvgQuality(): Promise<number | null> {
  const { data, error } = await supabase
    .from('brd_documents')
    .select('quality_score')
    .not('quality_score', 'is', null);
  if (error) throw error;
  const scores = (data as unknown as { quality_score: number }[]).map(d => d.quality_score);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// ─── FETCH AVG PROCESSING TIME (seconds) ─────────────────────────
export async function fetchAvgProcessingTime(): Promise<number | null> {
  const { data, error } = await supabase
    .from('brd_processing_queue')
    .select('started_at, completed_at')
    .not('started_at', 'is', null)
    .not('completed_at', 'is', null);
  if (error) throw error;
  const rows = data as unknown as { started_at: string; completed_at: string }[];
  if (rows.length === 0) return null;
  const totalSec = rows.reduce((sum, r) => {
    return sum + (new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 1000;
  }, 0);
  return totalSec / rows.length;
}

// ─── FETCH EPIC COUNTS PER DOCUMENT ──────────────────────────────
export async function fetchEpicCountsByDoc(docIds: string[]): Promise<Record<string, number>> {
  if (docIds.length === 0) return {};
  const { data, error } = await supabase
    .from('brd_epics')
    .select('brd_id')
    .in('brd_id', docIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data as unknown as { brd_id: string }[]).forEach(r => {
    counts[r.brd_id] = (counts[r.brd_id] || 0) + 1;
  });
  return counts;
}

// ─── GET STAGE STATS (for stat cards) ────────────────────────────
export async function fetchStageStats(): Promise<StageStats[]> {
  const { data, error } = await supabase
    .from('brd_documents')
    .select('pipeline_stage');
  if (error) throw error;

  const counts: Record<string, number> = {};
  (data as unknown as { pipeline_stage: PipelineStage }[]).forEach(({ pipeline_stage }) => {
    counts[pipeline_stage] = (counts[pipeline_stage] || 0) + 1;
  });

  const stageOrder: PipelineStage[] = [
    'intake', 'extract', 'process', 'validate', 'distribute', 'complete',
  ];
  const labels: Record<PipelineStage, string> = {
    intake: 'Intake', extract: 'Extract', process: 'Process',
    validate: 'Validate', distribute: 'Distribute', complete: 'Complete',
    failed: 'Failed',
  };

  return stageOrder.map((stage) => ({
    stage,
    count: counts[stage] || 0,
    label: labels[stage],
  }));
}

// ─── CREATE DOCUMENT (manual upload / generate from text) ────────
export async function createBrdDocument(
  payload: Omit<BrdDocument, 'id' | 'created_at' | 'updated_at'>
): Promise<BrdDocument> {
  const { data, error } = await supabase
    .from('brd_documents')
    .insert(payload as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as BrdDocument;
}

// ─── UPDATE STAGE (manual stage promotion) ───────────────────────
export async function updateDocumentStage(
  id: string,
  stage: PipelineStage
): Promise<void> {
  const { error } = await supabase
    .from('brd_documents')
    .update({ pipeline_stage: stage } as any)
    .eq('id', id);
  if (error) throw error;
}

// ─── ENQUEUE DOCUMENT FOR PROCESSING ─────────────────────────────
export async function enqueueDocument(brdId: string): Promise<void> {
  const { error } = await supabase
    .from('brd_processing_queue')
    .insert({ brd_id: brdId, status: 'pending' } as any);
  if (error) throw error;
}

// ─── FETCH DISTINCT DOMAIN TAGS (for filter dropdown) ────────────
export async function fetchDomainTags(): Promise<string[]> {
  const { data, error } = await supabase
    .from('brd_documents')
    .select('domain_tag')
    .not('domain_tag', 'is', null);
  if (error) throw error;
  const tags = [...new Set((data as unknown as { domain_tag: string }[]).map((d) => d.domain_tag))];
  return tags.sort();
}
