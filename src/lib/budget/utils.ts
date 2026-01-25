/**
 * Budget Governance Module - Utility Functions
 */

import type { DateStatus, BudgetPeriod } from './types';

// Format currency with K/M notation
export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(0) + 'K';
  }
  return value.toLocaleString();
}

// Format full currency for display (no abbreviation)
export function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// Format with SAR prefix
export function formatSAR(value: number): string {
  return `ج.س ${formatFullCurrency(value)}`;
}

// Get date status for contract end dates
export function getDateStatus(dateStr: string | null | undefined): DateStatus {
  if (!dateStr) return 'normal';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'expired';
  if (diffDays <= 90) return 'ending-soon';
  return 'normal';
}

// Format date for display
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  
  return `${day} ${month} ${year}`;
}

// Calculate percentage safely
export function safePercent(value: number, total: number): string {
  if (total === 0) return '0.0';
  return ((value / total) * 100).toFixed(1);
}

// Map assignment_type to display type
export function getDisplayType(type: string): string {
  if (type === 'BAU') return 'Insourced';
  return type;
}

// Map status to display
export function getDisplayStatus(status: string): string {
  const map: Record<string, string> = {
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'yet_to_start': 'Yet to Start',
    'on_hold': 'On Hold'
  };
  return map[status] || status;
}

// Map payment status to display
export function getDisplayPayment(payment: string): string {
  const map: Record<string, string> = {
    'not_applicable': 'N/A',
    'on_track': 'On Track',
    'unpaid': 'Unpaid',
    'paid': 'Paid'
  };
  return map[payment] || payment;
}

// Period constants
export function getPeriodMonths(period: BudgetPeriod): number {
  switch (period) {
    case 'Q1': return 3;
    case 'H1': return 6;
    case 'Full': return 12;
  }
}

export function getPeriodLabel(period: BudgetPeriod): string {
  switch (period) {
    case 'Q1': return 'Jan–Mar 2026';
    case 'H1': return 'Jan–Jun 2026';
    case 'Full': return 'Full Year 2026';
  }
}

export function getPeriodEndDate(period: BudgetPeriod): Date {
  switch (period) {
    case 'Q1': return new Date('2026-03-31');
    case 'H1': return new Date('2026-06-30');
    case 'Full': return new Date('2026-12-31');
  }
}

// Constants for budget calculations
export const YEAR_START = new Date('2026-01-01');
export const TODAY = new Date();
export const MONTHS_YTD = Math.max(1, TODAY.getMonth() + 1 - (YEAR_START.getMonth())); // Months elapsed in current year
