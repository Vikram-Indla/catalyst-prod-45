import React from "react";
import type { WorkItemIconType } from "@/types/notifications";

export const BugIcon = () => (
  <span style={{width:14,height:14,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="3" fill="#E5493A"/>
      <circle cx="8" cy="8" r="3.5" fill="white" fillOpacity="0.3"/>
      <circle cx="8" cy="8" r="1.5" fill="white"/>
      <line x1="8" y1="4" x2="8" y2="5.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
      <line x1="8" y1="10.5" x2="8" y2="12" stroke="white" strokeWidth="1" strokeLinecap="round"/>
      <line x1="4.5" y1="6.5" x2="5.8" y2="7.2" stroke="white" strokeWidth="1" strokeLinecap="round"/>
      <line x1="10.2" y1="7.2" x2="11.5" y2="6.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
      <line x1="4.5" y1="9.5" x2="5.8" y2="8.8" stroke="white" strokeWidth="1" strokeLinecap="round"/>
      <line x1="10.2" y1="8.8" x2="11.5" y2="9.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  </span>
);

export const StoryIcon = () => (
  <span style={{width:12,height:12,borderRadius:2,background:'#DCFCE7',display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
      <path d="M2 1.5H6C6.28 1.5 6.5 1.72 6.5 2V7L5.5 6.5L4.5 7L3.5 6.5L2.5 7L1.5 7V2C1.5 1.72 1.72 1.5 2 1.5Z" fill="#16A34A"/>
    </svg>
  </span>
);

export const TaskIcon = () => (
  <span style={{width:12,height:12,borderRadius:2,background:'#DBEAFE',display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
      <rect x="1.5" y="1.5" width="5" height="5" rx="0.5" fill="#2563EB"/>
      <path d="M2.5 4L3.5 5L5.5 3" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </span>
);

export const EpicIcon = () => (
  <span style={{width:12,height:12,borderRadius:2,background:'#EDE9FE',display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
      <path d="M4 1L5.5 3.5H6.5L4.5 5L5.5 7L4 5.5L2.5 7L3.5 5L1.5 3.5H2.5L4 1Z" fill="#7C3AED"/>
    </svg>
  </span>
);

export const WORK_ITEM_ICONS: Record<WorkItemIconType, React.FC> = {
  bug: BugIcon, story: StoryIcon, task: TaskIcon, epic: EpicIcon,
  subtask: TaskIcon, new_feature: StoryIcon, improvement: TaskIcon,
  incident: BugIcon, question: TaskIcon,
};

export function WorkItemIcon({ type }: { type: WorkItemIconType }) {
  const Icon = WORK_ITEM_ICONS[type] || TaskIcon;
  return <Icon />;
}
