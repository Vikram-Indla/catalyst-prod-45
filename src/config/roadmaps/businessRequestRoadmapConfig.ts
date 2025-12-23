// Business Request Roadmap Configuration
// Industry Business Requests roadmap
// Cloned from epicRoadmapConfig with Business Request labels

import { RoadmapConfig, StatusConfig, RoadmapTranslations, FiltersConfig } from './types';

// Status configurations - maps process_step to colors (same visual pattern as epics)
const BUSINESS_REQUEST_STATUS_COLORS: Record<string, StatusConfig> = {
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

// Translations for business request roadmap
const BUSINESS_REQUEST_TRANSLATIONS: RoadmapTranslations = {
  en: {
    roadmapTitle: 'BUSINESS REQUEST ROADMAP',
    roadmapSubtitle: 'Industry Demand Portfolio',
    businessRequest: 'BUSINESS REQUEST',
    rank: 'Rank',
    proposed: 'Proposed',
    analyzing: 'Analyzing',
    approved: 'Approved',
    in_progress: 'In Progress',
    done: 'Done',
    cancelled: 'Cancelled',
    platform: 'PRODUCT',
    status: 'STATUS',
    owner: 'OWNER',
    sortBy: 'SORT BY',
    milestones: 'LINKED FEATURES',
    childFeatures: 'Linked Features',
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
    roadmapTitle: 'خارطة طلبات الأعمال',
    roadmapSubtitle: 'محفظة الطلب الصناعي',
    businessRequest: 'طلب أعمال',
    rank: 'الترتيب',
    proposed: 'مقترح',
    analyzing: 'تحليل',
    approved: 'موافق عليه',
    in_progress: 'قيد التنفيذ',
    done: 'مكتمل',
    cancelled: 'ملغي',
    platform: 'المنتج',
    status: 'الحالة',
    owner: 'المالك',
    sortBy: 'ترتيب حسب',
    milestones: 'الميزات المرتبطة',
    childFeatures: 'الميزات المرتبطة',
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

// Filters configuration for business request roadmap
const BUSINESS_REQUEST_FILTERS_CONFIG: FiltersConfig = {
  showPlatformQuickFilters: false, // No platform concept
  platformFilters: [],
  showStatusFilter: true,
  showOwnerFilter: true,
  showSortFilter: true,
};

// Main business request roadmap configuration
export const businessRequestRoadmapConfig: RoadmapConfig = {
  workItemType: 'business_request',

  // Field mapping from business_requests entity to roadmap engine
  fieldMap: {
    id: 'id',
    title: 'title',           // Composed as "REQUEST_KEY – Title" in hook
    startDate: 'impl_start_date', // Fallback to start_date, then created_at handled in hook
    endDate: 'impl_target_end_date', // Fallback to end_date, if null = open-ended
    status: 'process_step',   // Maps to roadmap status
    lane: 'product_id',       // Group by Product
    rank: 'rank',
    platform: undefined,
  },

  statusColors: BUSINESS_REQUEST_STATUS_COLORS,

  platforms: {}, // Business requests use products for grouping

  translations: BUSINESS_REQUEST_TRANSLATIONS,

  header: {
    icon: 'BR',
    iconGradient: 'linear-gradient(135deg, hsl(var(--brand-primary)), hsl(var(--brand-primary) / 0.6))',
  },

  legend: {
    showStatus: true,
    showTimeline: true,
    showMilestones: true, // Show Linked Features toggle
  },

  filters: BUSINESS_REQUEST_FILTERS_CONFIG,
};

export default businessRequestRoadmapConfig;
