// Executive Roadmap v9 Types
// Per specification: Saudi Ministry of Industry & Mineral Resources

export type TimeScale = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type ProcessStage = 1 | 2 | 3 | 4 | 5;

export type Language = 'en' | 'ar';

export type SortField = 'rank' | 'platform' | 'submission' | 'score' | 'target' | 'quarter' | 'owner';

export type SortOrder = 'asc' | 'desc';

export interface RoadmapRequest {
  id: string;
  title: string;
  titleAr?: string;
  owner: string;
  ownerAr?: string;
  platform: string;
  platformName: string;
  platformNameAr?: string;
  rank: number;
  locked: boolean;
  submission: string;
  score: number;
  target: string;
  quarter: string;
  stage: ProcessStage;
  start: string;
  end: string;
  progress: number;
  risks: RoadmapRisk[];
  dependencies: RoadmapDependency[];
}

export interface RoadmapRisk {
  sno: number;
  title: string;
  status: 'open' | 'mitigated' | 'resolved';
}

export interface RoadmapDependency {
  sno: number;
  title: string;
  status: 'pending' | 'complete' | 'blocked';
}

export interface PlatformInfo {
  name: string;
  nameAr: string;
  icon: string;
}

export interface KPICard {
  stage: ProcessStage;
  count: number;
  label: string;
  sublabel: string;
}

export interface TimelineConfig {
  units: number;
  startDate: Date;
  format: 'week' | 'month' | 'quarter' | 'year';
}

export const PLATFORM_INFO: Record<string, PlatformInfo> = {
  senaei: { name: 'Senaei Platform', nameAr: 'منصة صناعي', icon: 'SP' },
  innovation: { name: 'Innovation Platform', nameAr: 'منصة الابتكار', icon: 'IP' },
  compass: { name: 'Compass', nameAr: 'البوصلة', icon: 'CP' },
  tahommena: { name: 'Tahommena', nameAr: 'تحومينا', icon: 'TH' },
  miniapps: { name: 'Mini Apps', nameAr: 'التطبيقات المصغرة', icon: 'MA' },
  website: { name: 'Website', nameAr: 'الموقع الإلكتروني', icon: 'WB' },
};

export const STAGE_NAMES: Record<ProcessStage, string> = {
  1: 'New Request',
  2: 'Analyse',
  3: 'Approved',
  4: 'Implement',
  5: 'Closed',
};

export const STAGE_NAMES_AR: Record<ProcessStage, string> = {
  1: 'طلب جديد',
  2: 'التحليل',
  3: 'الموافقة عليها',
  4: 'التنفيذ',
  5: 'مغلق',
};

export const STAGE_DESCRIPTIONS: Record<ProcessStage, { en: string; ar: string }> = {
  1: { en: 'Awaiting review', ar: 'في انتظار المراجعة' },
  2: { en: 'Under analysis', ar: 'قيد التحليل' },
  3: { en: 'Ready to start', ar: 'جاهز للبدء' },
  4: { en: 'In progress', ar: 'قيد التنفيذ' },
  5: { en: 'Completed', ar: 'مكتمل' },
};

export const STAGE_COLORS: Record<ProcessStage, string> = {
  1: 'hsl(35 46% 60%)',       // Gold - New Request
  2: 'hsl(210 55% 55%)',      // Blue - Analyse
  3: 'hsl(35 46% 45%)',       // Dark Gold - Approved
  4: 'hsl(142 50% 40%)',      // Forest - Implement
  5: 'hsl(0 0% 35%)',         // Graphite - Closed
};

export const TRANSLATIONS = {
  en: {
    allPlatforms: 'All Platforms',
    allStatuses: 'All Statuses',
    allOwners: 'All Owners',
    rank: 'Rank',
    platform: 'Delivery Platform',
    submission: 'Submission Date',
    score: 'Business Score',
    target: 'Target Date',
    quarter: 'Quarter',
    owner: 'Business Owner',
    today: 'TODAY',
    noRisks: 'No risks identified',
    noDeps: 'No dependencies',
    requests: 'requests',
    implementing: 'implementing',
    milestones: 'Milestones',
    showMilestones: 'Show Milestones',
    hideMilestones: 'Hide Milestones',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    exportPdf: 'Export PDF',
    sortBy: 'Sort By',
    businessRequest: 'Business Request',
    workflow: 'Workflow',
    complete: 'Complete',
    current: 'Current',
    pending: 'Pending',
    stages: 'Stages',
    risks: 'Risks',
    dependencies: 'Dependencies',
    filterAndSettings: 'Filters & Settings',
    language: 'Language',
    timeScale: 'Time Scale',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  },
  ar: {
    allPlatforms: 'جميع المنصات',
    allStatuses: 'جميع الحالات',
    allOwners: 'جميع المالكين',
    rank: 'الترتيب',
    platform: 'منصة التسليم',
    submission: 'تاريخ التقديم',
    score: 'الدرجة التجارية',
    target: 'التاريخ المستهدف',
    quarter: 'الربع',
    owner: 'مالك الأعمال',
    today: 'اليوم',
    noRisks: 'لا توجد مخاطر',
    noDeps: 'لا توجد تبعيات',
    requests: 'طلبات',
    implementing: 'قيد التنفيذ',
    milestones: 'المعالم',
    showMilestones: 'إظهار المعالم',
    hideMilestones: 'إخفاء المعالم',
    fullscreen: 'ملء الشاشة',
    exitFullscreen: 'الخروج من ملء الشاشة',
    exportPdf: 'تصدير PDF',
    sortBy: 'ترتيب حسب',
    businessRequest: 'طلب الأعمال',
    workflow: 'سير العمل',
    complete: 'مكتمل',
    current: 'الحالي',
    pending: 'معلق',
    stages: 'المراحل',
    risks: 'المخاطر',
    dependencies: 'التبعيات',
    filterAndSettings: 'الفلاتر والإعدادات',
    language: 'اللغة',
    timeScale: 'مقياس الوقت',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    quarterly: 'ربع سنوي',
    yearly: 'سنوي',
  },
};
