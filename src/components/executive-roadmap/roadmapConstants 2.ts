// roadmapConstants.ts — Shared constants, types, and translations for ExecutiveRoadmap

import { RoadmapStatus } from '@/types/roadmapTypes';

export type TimeScale = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type Language = 'en' | 'ar';
export type SortField = 'rank' | 'platform' | 'submission' | 'score' | 'target' | 'quarter' | 'owner';
export type SortOrder = 'asc' | 'desc';

export interface TimePeriodSelection {
  years: number[];
  months: number[]; // 0-11 for monthly
  quarters: number[]; // 0-3 for quarterly
  weeks: number[]; // 1-52 for weekly
  weeklyMonth: number | null; // 0-11 for weekly view month filter
}

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const QUARTER_NAMES = ['Q1', 'Q2', 'Q3', 'Q4'];
export const WEEK_NUMBERS = Array.from({ length: 52 }, (_, i) => i + 1);

export const currentYear = new Date().getFullYear();
export const currentMonth = new Date().getMonth();
export const currentQuarter = Math.floor(currentMonth / 3);
export const currentWeek = Math.ceil((new Date().getTime() - new Date(currentYear, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
export const AVAILABLE_YEARS = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

export const MIN_FIRST_COLUMN_WIDTH = 280;
export const MAX_FIRST_COLUMN_WIDTH = 420;
export const DEFAULT_FIRST_COLUMN_WIDTH = 340;
export const ROW_HEIGHT = 76;
export const HEADER_HEIGHT = 52;

export const TRANSLATIONS = {
  en: {
    executiveRoadmap: 'EXECUTIVE ROADMAP',
    industryRequests: 'Industry Requests Portfolio',
    newRequest: 'New',
    analyse: 'Analyse',
    approved: 'Approved',
    implement: 'Implement',
    closed: 'Closed',
    platform: 'PLATFORM',
    status: 'STATUS',
    owner: 'OWNER',
    sortBy: 'SORT BY',
    milestones: 'MILESTONES',
    rank: 'Rank',
    businessRequest: 'BUSINESS REQUEST',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
    viewScale: 'View Scale',
    selectYears: 'Select Years',
    selectMonths: 'Select Months',
    selectQuarters: 'Select Quarters',
    selectWeeks: 'Select Weeks',
    allMonths: 'All',
    allQuarters: 'All',
    allWeeks: 'All',
    continues: 'continues',
  },
  ar: {
    executiveRoadmap: 'خارطة الطريق التنفيذية',
    industryRequests: 'محفظة الطلبات الصناعية',
    newRequest: 'جديد',
    analyse: 'تحليل',
    approved: 'موافق',
    implement: 'تنفيذ',
    closed: 'مغلق',
    platform: 'المنصة',
    status: 'الحالة',
    owner: 'المالك',
    sortBy: 'ترتيب حسب',
    milestones: 'المراحل',
    rank: 'الترتيب',
    businessRequest: 'طلب العمل',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    quarterly: 'ربع سنوي',
    yearly: 'سنوي',
    viewScale: 'مقياس العرض',
    selectYears: 'اختر السنوات',
    selectMonths: 'اختر الأشهر',
    selectQuarters: 'اختر الأرباع',
    selectWeeks: 'اختر الأسابيع',
    allMonths: 'الكل',
    allQuarters: 'الكل',
    allWeeks: 'الكل',
    continues: 'يستمر',
  }
};

export const STATUS_BAR_GRADIENTS: Record<RoadmapStatus, string> = {
  'NEW': 'linear-gradient(90deg, hsl(var(--roadmap-status-new)), hsl(var(--roadmap-status-new) / 0.8))',
  'ANALYSE': 'linear-gradient(90deg, hsl(var(--roadmap-status-analyse)), hsl(var(--roadmap-status-analyse) / 0.8))',
  'APPROVED': 'linear-gradient(90deg, hsl(var(--roadmap-status-approved)), hsl(var(--roadmap-status-approved) / 0.8))',
  'IMPLEMENT': 'linear-gradient(90deg, hsl(var(--roadmap-status-implement)), hsl(var(--roadmap-status-implement) / 0.8))',
  'CLOSED': 'linear-gradient(90deg, hsl(var(--roadmap-status-closed)), hsl(var(--roadmap-status-closed) / 0.8))',
};
