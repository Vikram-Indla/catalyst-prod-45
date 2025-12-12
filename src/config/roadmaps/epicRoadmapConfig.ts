// Epic Roadmap Configuration
// Program Epics roadmap for Program context

import { RoadmapConfig, StatusConfig, RoadmapTranslations, FiltersConfig } from './types';

// Status configurations - maps epic_status enum to colors
const EPIC_STATUS_COLORS: Record<string, StatusConfig> = {
  'proposed': {
    key: 'proposed',
    label: 'Proposed',
    labelAr: 'مقترح',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-new)), hsl(var(--roadmap-status-new) / 0.8))',
  },
  'analyzing': {
    key: 'analyzing',
    label: 'Analyzing',
    labelAr: 'تحليل',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-analyse)), hsl(var(--roadmap-status-analyse) / 0.8))',
  },
  'approved': {
    key: 'approved',
    label: 'Approved',
    labelAr: 'موافق عليه',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-approved)), hsl(var(--roadmap-status-approved) / 0.8))',
  },
  'in_progress': {
    key: 'in_progress',
    label: 'In Progress',
    labelAr: 'قيد التنفيذ',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-implement)), hsl(var(--roadmap-status-implement) / 0.8))',
  },
  'done': {
    key: 'done',
    label: 'Done',
    labelAr: 'مكتمل',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-closed)), hsl(var(--roadmap-status-closed) / 0.8))',
  },
  'cancelled': {
    key: 'cancelled',
    label: 'Cancelled',
    labelAr: 'ملغي',
    gradient: 'linear-gradient(90deg, hsl(var(--muted)), hsl(var(--muted) / 0.8))',
  },
};

// Translations for epic roadmap
const EPIC_TRANSLATIONS: RoadmapTranslations = {
  en: {
    roadmapTitle: 'EPIC ROADMAP',
    roadmapSubtitle: 'Program Epics Portfolio',
    businessRequest: 'EPIC',
    rank: 'Rank',
    proposed: 'Proposed',
    analyzing: 'Analyzing',
    approved: 'Approved',
    in_progress: 'In Progress',
    done: 'Done',
    cancelled: 'Cancelled',
    platform: 'THEME',
    status: 'STATUS',
    owner: 'OWNER',
    sortBy: 'SORT BY',
    milestones: 'CHILD FEATURES',
    childFeatures: 'Child Features',
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
    roadmapTitle: 'خارطة الملاحم',
    roadmapSubtitle: 'محفظة ملاحم البرنامج',
    businessRequest: 'ملحمة',
    rank: 'الترتيب',
    proposed: 'مقترح',
    analyzing: 'تحليل',
    approved: 'موافق عليه',
    in_progress: 'قيد التنفيذ',
    done: 'مكتمل',
    cancelled: 'ملغي',
    platform: 'المحور',
    status: 'الحالة',
    owner: 'المالك',
    sortBy: 'ترتيب حسب',
    milestones: 'الميزات الفرعية',
    childFeatures: 'الميزات الفرعية',
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

// Filters configuration for epic roadmap
const EPIC_FILTERS_CONFIG: FiltersConfig = {
  showPlatformQuickFilters: false, // No platform concept for epics
  platformFilters: [],
  showStatusFilter: true,
  showOwnerFilter: true,
  showSortFilter: true,
};

// Main epic roadmap configuration
export const epicRoadmapConfig: RoadmapConfig = {
  workItemType: 'epic',

  // Field mapping from epics entity to roadmap engine
  fieldMap: {
    id: 'id',
    title: 'name',           // Composed as "EPIC_KEY – Name" in hook
    startDate: 'start_date', // Fallback to initiation_date, then created_at handled in hook
    endDate: 'target_completion_date', // Fallback to end_date, if null = open-ended
    status: 'status',        // epic_status enum
    lane: 'theme_id',        // Group by Strategic Theme
    rank: 'program_rank',
    platform: undefined,
  },

  statusColors: EPIC_STATUS_COLORS,

  platforms: {}, // Epics don't have platforms

  translations: EPIC_TRANSLATIONS,

  header: {
    icon: 'EP',
    iconGradient: 'linear-gradient(135deg, hsl(var(--brand-gold)), hsl(var(--brand-gold) / 0.6))',
  },

  legend: {
    showStatus: true,
    showTimeline: true,
    showMilestones: true, // Show Child Features toggle in Epic Roadmap
  },

  filters: EPIC_FILTERS_CONFIG,
};

export default epicRoadmapConfig;
