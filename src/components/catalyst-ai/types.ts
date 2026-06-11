import type React from 'react';

export type AIWorkItemType = 'feature' | 'epic' | 'story' | 'defect' | 'incident' | 'task' | 'business-request';

export interface AIPriorityItem {
  id: string;
  key: string;
  title: string;
  type: AIWorkItemType;
  aiReason: string;
  timeLeft: string;
  updatedAt: string;
  status?: 'danger' | 'warning' | 'success';
}

export interface AINextItemData {
  id: string;
  key: string;
  title: string;
  type: AIWorkItemType;
  aiContext: string;
}

export interface AIStats {
  closed: number;
  percentChange: number;
  slaRate: number;
  personalBest: number;
  ops: number;
  del: number;
  pln: number;
}

export interface AISuggestionData {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}
