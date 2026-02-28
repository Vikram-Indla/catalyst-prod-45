import { useState, useCallback } from "react";
import {
  queryKnowledgeBase,
  submitFeedback,
  getTrainingStatus,
  embedTrainingBatch,
  runCleanup,
  type KBQueryRequest,
  type KBQueryResponse,
  type KBTrainStatus,
  type KBTrainEmbedResult,
} from "@/services/knowledgeBase";
import { toast } from "sonner";

// ═══ useKBQuery — Main Q&A hook ═══

export function useKBQuery() {
  const [response, setResponse] = useState<KBQueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askQuestion = useCallback(async (request: KBQueryRequest) => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await queryKnowledgeBase(request);
      setResponse(result);
      return result;
    } catch (err: any) {
      const msg = err.message || "Failed to query knowledge base";
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendFeedback = useCallback(async (logId: string, wasHelpful: boolean) => {
    try {
      await submitFeedback(logId, wasHelpful);
      toast.success(wasHelpful ? "Thanks for the positive feedback!" : "Feedback noted — we'll improve.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback");
    }
  }, []);

  const reset = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  return { response, isLoading, error, askQuestion, sendFeedback, reset };
}

// ═══ useKBAdmin — Admin training & management ═══

export function useKBAdmin() {
  const [status, setStatus] = useState<KBTrainStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [embedProgress, setEmbedProgress] = useState<KBTrainEmbedResult | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const result = await getTrainingStatus();
      setStatus(result);
      return result;
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch training status");
      return null;
    }
  }, []);

  const embedBatch = useCallback(async (batchSize = 50) => {
    setIsProcessing(true);
    try {
      const result = await embedTrainingBatch(batchSize);
      setEmbedProgress(result);
      toast.success(result.message);
      // Refresh status
      await fetchStatus();
      return result;
    } catch (err: any) {
      toast.error(err.message || "Embedding batch failed");
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchStatus]);

  const embedAll = useCallback(async (batchSize = 50) => {
    setIsProcessing(true);
    let totalEmbedded = 0;

    try {
      while (true) {
        const result = await embedTrainingBatch(batchSize);
        totalEmbedded += result.embedded;
        setEmbedProgress(result);

        if (result.remaining === 0 || result.embedded === 0) {
          toast.success(`All done! ${totalEmbedded} questions embedded.`);
          break;
        }

        toast.info(`Progress: ${totalEmbedded} embedded, ${result.remaining} remaining...`);
        // Brief pause to avoid rate limits
        await new Promise((r) => setTimeout(r, 1000));
      }

      await fetchStatus();
    } catch (err: any) {
      toast.error(`Embedding stopped after ${totalEmbedded}: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [fetchStatus]);

  const cleanup = useCallback(async (action: "all" | "purge_logs" | "clear_cache" = "all") => {
    setIsProcessing(true);
    try {
      const result = await runCleanup(action);
      toast.success("Cleanup completed");
      return result;
    } catch (err: any) {
      toast.error(err.message || "Cleanup failed");
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { status, isProcessing, embedProgress, fetchStatus, embedBatch, embedAll, cleanup };
}
