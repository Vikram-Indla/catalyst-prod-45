import { supabase } from "@/integrations/supabase/client";
import type { ChainMetrics } from './computeChainMetrics';

export interface AIResult {
  strategyInsight: string;
  initiativeInsight: string;
  epicInsight: string;
  operationsInsight: string;
  riskSignals: string[];
}

export async function generateIntelligence(
  _chainRow: any,
  metrics: ChainMetrics
): Promise<AIResult> {
  const empty: AIResult = {
    strategyInsight: 'AI analysis could not be generated. Viewing data-driven metrics only.',
    initiativeInsight: 'AI analysis could not be generated.',
    epicInsight: 'AI analysis could not be generated.',
    operationsInsight: 'AI analysis could not be generated.',
    riskSignals: [],
  };

  try {
    const { data, error } = await supabase.functions.invoke('strategy-intelligence', {
      body: { metrics },
    });

    if (error) {
      console.error('Strategy intelligence error:', error);
      return empty;
    }

    return {
      strategyInsight: data?.strategyInsight || empty.strategyInsight,
      initiativeInsight: data?.initiativeInsight || empty.initiativeInsight,
      epicInsight: data?.epicInsight || empty.epicInsight,
      operationsInsight: data?.operationsInsight || empty.operationsInsight,
      riskSignals: data?.riskSignals || [],
    };
  } catch (err) {
    console.error('Intelligence generation error:', err);
    return empty;
  }
}
