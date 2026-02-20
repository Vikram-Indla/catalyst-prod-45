import { supabase } from "@/integrations/supabase/client";
import type { ChainMetrics } from './computeChainMetrics';

export interface AIResult {
  verdict: string;
  riskSignals: string[];
}

/**
 * Generate AI intelligence verdict via Lovable AI edge function.
 * Uses the strategy-intelligence edge function which calls Lovable AI Gateway.
 */
export async function generateIntelligence(
  _chainRow: any,
  metrics: ChainMetrics
): Promise<AIResult> {
  try {
    const { data, error } = await supabase.functions.invoke('strategy-intelligence', {
      body: { metrics },
    });

    if (error) {
      console.error('Strategy intelligence error:', error);
      return {
        verdict: 'AI analysis could not be generated. Viewing data-driven metrics only.',
        riskSignals: [],
      };
    }

    return {
      verdict: data?.verdict || 'No verdict generated.',
      riskSignals: data?.riskSignals || [],
    };
  } catch (err) {
    console.error('Intelligence generation error:', err);
    return {
      verdict: 'AI analysis could not be generated. Viewing data-driven metrics only.',
      riskSignals: [],
    };
  }
}
