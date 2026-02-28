import { supabase } from "@/integrations/supabase/client";

// ═══ Types ═══

export interface KBQueryRequest {
  query: string;
  language?: "en" | "ar";
  input_method?: "keyboard" | "voice";
  user_id?: string;
  user_name?: string;
  user_role?: string;
}

export interface KBQueryResponse {
  type: "editorial" | "fallback";
  title: string;
  answer: string;
  matched_question?: string;
  category: string | null;
  confidence: number;
  references: KBReference[];
  _meta: {
    source: "cache" | "training" | "vector_search" | "fallback";
    response_time_ms: number;
    cache_hit: boolean;
    similarity?: number;
    chunks_matched?: number;
  };
}

export interface KBReference {
  source_type: string;
  source_url?: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface KBTrainStatus {
  training_questions: { total: number; embedded: number };
  kb_embeddings: number;
  sources: number;
}

export interface KBTrainEmbedResult {
  embedded: number;
  batch_processed: number;
  remaining: number;
  message: string;
}

export interface KBSource {
  id: string;
  label: string;
  url: string;
  description: string | null;
  source_type: string;
  priority: number;
  is_active: boolean;
  scrape_depth: number | null;
  scrape_frequency: string | null;
  last_scraped_at: string | null;
  pages_indexed: number | null;
  content_size_bytes: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface KBQueryLogEntry {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  query_text: string;
  language: string | null;
  input_method: string | null;
  was_answered: boolean | null;
  was_helpful: boolean | null;
  response_time_ms: number | null;
  cache_hit: boolean | null;
  matched_category: string | null;
  confidence_score: number | null;
  created_at: string | null;
}

// ═══ KB Query Service ═══

export async function queryKnowledgeBase(request: KBQueryRequest): Promise<KBQueryResponse> {
  const { data, error } = await supabase.functions.invoke("kb-query", {
    body: request,
  });

  if (error) throw new Error(error.message || "KB query failed");
  if (data?.error) throw new Error(data.error);
  return data as KBQueryResponse;
}

// ═══ KB Feedback Service ═══

export async function submitFeedback(logId: string, wasHelpful: boolean): Promise<void> {
  const { data, error } = await supabase.functions.invoke("kb-feedback", {
    body: { log_id: logId, was_helpful: wasHelpful },
  });

  if (error) throw new Error(error.message || "Feedback submission failed");
  if (data?.error) throw new Error(data.error);
}

// ═══ KB Training Service ═══

export async function getTrainingStatus(): Promise<KBTrainStatus> {
  const { data, error } = await supabase.functions.invoke("kb-train", {
    body: { action: "status" },
  });

  if (error) throw new Error(error.message || "Training status fetch failed");
  return data as KBTrainStatus;
}

export async function embedTrainingBatch(batchSize = 50, offset = 0): Promise<KBTrainEmbedResult> {
  const { data, error } = await supabase.functions.invoke("kb-train", {
    body: { action: "embed_training", batch_size: batchSize, offset },
  });

  if (error) throw new Error(error.message || "Embedding batch failed");
  return data as KBTrainEmbedResult;
}

export async function addKBContent(
  content: string | string[],
  sourceType: string,
  sourceUrl?: string,
  metadata?: Record<string, unknown>
): Promise<{ added: number; skipped: number; total_chunks: number }> {
  const { data, error } = await supabase.functions.invoke("kb-train", {
    body: { action: "add_content", content, source_type: sourceType, source_url: sourceUrl, metadata },
  });

  if (error) throw new Error(error.message || "Add content failed");
  return data;
}

// ═══ KB Cleanup Service ═══

export async function runCleanup(action: "all" | "purge_logs" | "clear_cache" = "all") {
  const { data, error } = await supabase.functions.invoke("kb-cleanup", {
    body: { action },
  });

  if (error) throw new Error(error.message || "Cleanup failed");
  return data;
}

// ═══ Direct DB Queries (for admin panels) ═══

export async function fetchSources(): Promise<KBSource[]> {
  const { data, error } = await supabase
    .from("kb_sources")
    .select("*")
    .order("priority", { ascending: true });

  if (error) throw error;
  return (data || []) as KBSource[];
}

export async function fetchQueryLogs(limit = 100): Promise<KBQueryLogEntry[]> {
  const { data, error } = await supabase
    .from("kb_query_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as KBQueryLogEntry[];
}

export async function fetchAccessMatrix() {
  const { data, error } = await supabase
    .from("kb_access_matrix")
    .select("*")
    .order("role_name")
    .order("module_name");

  if (error) throw error;
  return data || [];
}

export async function fetchCacheStats() {
  const { data, error } = await supabase
    .from("kb_cache")
    .select("id, query_text, language, hit_count, last_hit_at, ttl_hours, created_at")
    .order("hit_count", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}
