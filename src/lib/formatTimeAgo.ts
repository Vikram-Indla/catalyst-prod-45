// src/lib/formatTimeAgo.ts
// Abbreviated time format for Catalyst V5 - prevents text wrapping in tables
// Examples: "23h ago", "2d ago", "1w ago", "3mo ago"

import { differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears } from 'date-fns';

/**
 * Format a date as abbreviated relative time
 * @param date - The date to format
 * @param addSuffix - Whether to add "ago" suffix (default: true)
 * @returns Abbreviated time string like "23h" or "23h ago"
 */
export function formatTimeAbbreviated(date: Date | string, addSuffix = true): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  const minutes = differenceInMinutes(now, targetDate);
  const hours = differenceInHours(now, targetDate);
  const days = differenceInDays(now, targetDate);
  const weeks = differenceInWeeks(now, targetDate);
  const months = differenceInMonths(now, targetDate);
  const years = differenceInYears(now, targetDate);
  
  let result: string;
  
  if (minutes < 1) {
    result = 'now';
    return result; // "now" doesn't need "ago"
  } else if (minutes < 60) {
    result = `${minutes}m`;
  } else if (hours < 24) {
    result = `${hours}h`;
  } else if (days < 7) {
    result = `${days}d`;
  } else if (weeks < 4) {
    result = `${weeks}w`;
  } else if (months < 12) {
    result = `${months}mo`;
  } else {
    result = `${years}y`;
  }
  
  return addSuffix ? `${result} ago` : result;
}
