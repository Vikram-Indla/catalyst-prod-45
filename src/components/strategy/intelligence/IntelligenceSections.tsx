/**
 * IntelligenceSections.tsx — Legacy exports kept for backward compatibility.
 * The redesigned panel now renders everything inline via PanelBody in
 * AIStrategyIntelligencePanel.tsx. These are no-op stubs so existing imports
 * don't break.
 */

import React from "react";
import { ChainMetrics } from "@/utils/computeChainMetrics";

export function VerdictSection(_props: { metrics: ChainMetrics; aiVerdict: string; isAILoading: boolean }) {
  return null;
}

export function ExecutionSection(_props: { metrics: ChainMetrics }) {
  return null;
}

export function RiskRadarSection(_props: { metrics: ChainMetrics; defects: any[]; riskSignals: string[]; isAILoading: boolean }) {
  return null;
}

export function ChainOfCommandSection(_props: { metrics: ChainMetrics }) {
  return null;
}
