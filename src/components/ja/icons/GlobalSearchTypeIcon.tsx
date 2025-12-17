import React from 'react';
import { GlobalSearchWorkItemType } from '@/data/globalSearchData';

interface GlobalSearchTypeIconProps {
  type: GlobalSearchWorkItemType;
  size?: number;
}

// Colors using semantic meaning
const ICON_COLORS: Record<GlobalSearchWorkItemType, string> = {
  'business-request': '#C69C6D', // Brand Gold
  'epic': '#8b7355',             // Bronze
  'feature': '#6554C0',          // Purple
  'story': '#36B37E',            // Green
  'incident': '#FF5630',         // Red
  'task': '#0065FF',             // Blue
  'defect': '#FF5630',           // Red
};

export function GlobalSearchTypeIcon({ type, size = 16 }: GlobalSearchTypeIconProps) {
  const color = ICON_COLORS[type];
  
  switch (type) {
    case 'business-request':
      // Document with lines icon
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="1" width="12" height="14" rx="2" fill={color} />
          <path d="M5 5H11M5 8H11M5 11H8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'epic':
      // Lightning bolt in rounded square
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="16" height="16" rx="3" fill={color} />
          <path d="M9 2L5 9H8L7 14L11 7H8L9 2Z" fill="white" />
        </svg>
      );
    case 'feature':
      // Star/diamond shape
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="16" height="16" rx="2" fill={color} />
          <path d="M8 3L10 6.5L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6.5L8 3Z" fill="white" />
        </svg>
      );
    case 'story':
      // Bookmark/document icon
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="1" width="12" height="14" rx="1" fill={color} />
          <path d="M5 4H11M5 7H11M5 10H9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'incident':
      // Alert triangle
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1L15 14H1L8 1Z" fill={color} />
          <path d="M8 6V9M8 11V12" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'task':
      // Checkbox
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="16" height="16" rx="2" fill={color} />
          <path d="M4 8L7 11L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'defect':
      // Bug/circle icon
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" fill={color} />
          <circle cx="8" cy="8" r="4" fill="white" />
          <circle cx="8" cy="8" r="2" fill={color} />
        </svg>
      );
    default:
      return null;
  }
}
