// Business Request Roadmap Configuration
// Industry Roadmap for Business Requests (mirrors epicRoadmapConfig architecture)

import { RoadmapConfig, StatusConfig, RoadmapTranslations, FiltersConfig } from './types';

// Status configurations - maps process_step values to colors
const BUSINESS_REQUEST_STATUS_COLORS: Record<string, StatusConfig> = {
  'new_request': {
    key: 'new_request',
    label: 'New Request',
    labelAr: 'طلب جديد',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-new)), hsl(var(--roadmap-status-new) / 0.8))',
  },
  'new_demand': {
    key: 'new_demand',
    label: 'New Demand',
    labelAr: 'طلب جديد',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-new)), hsl(var(--roadmap-status-new) / 0.8))',
  },
  'in_review': {
    key: 'in_review',
    label: 'In Review',
    labelAr: 'قيد المراجعة',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-analyse)), hsl(var(--roadmap-status-analyse) / 0.8))',
  },
  'ea_review': {
    key: 'ea_review',
    label: 'EA Review',
    labelAr: 'مراجعة هندسية',
    gradient: 'linear-gradient(90deg, hsl(260,50%,55%), hsl(260,50%,55% / 0.8))',
  },
  'analyse': {
    key: 'analyse',
    label: 'Analyse',
    labelAr: 'تحليل',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-analyse)), hsl(var(--roadmap-status-analyse) / 0.8))',
  },
  'approved': {
    key: 'approved',
    label: 'Approved',
    labelAr: 'موافق عليه',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-approved)), hsl(var(--roadmap-status-approved) / 0.8))',
  },
  'ready_to_implement': {
    key: 'ready_to_implement',
    label: 'Ready to Implement',
    labelAr: 'جاهز للتنفيذ',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-approved)), hsl(var(--roadmap-status-approved) / 0.8))',
  },
  'implement': {
    key: 'implement',
    label: 'Implement',
    labelAr: 'تنفيذ',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-implement)), hsl(var(--roadmap-status-implement) / 0.8))',
  },
  'closed': {
    key: 'closed',
    label: 'Closed',
    labelAr: 'مغلق',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-closed)), hsl(var(--roadmap-status-closed) / 0.8))',
  },
  'rejected': {
    key: 'rejected',
    label: 'Rejected',
    labelAr: 'مرفوض',
    gradient: 'linear-gradient(90deg, hsl(0,65%,50%), hsl(0,65%,50% / 0.8))',
  },
  'on_hold': {
    key: 'on_hold',
    label: 'On Hold',
    labelAr: 'معلق',
    gradient: 'linear-gradient(90deg, hsl(25,80%,55%), hsl(25,80%,55% / 0.8))',
  },
};

// Translations for business request roadmap
const BUSINESS_REQUEST_TRANSLATIONS: RoadmapTranslations = {
  en: {
    roadmapTitle: 'BUSINESS REQUEST ROADMAP',
    roadmapSubtitle: 'Industry Demand Portfolio',
    businessRequest: 'BUSINESS REQUEST',
    rank: 'Rank',
    new_request: 'New Request',
    new_demand: 'New Demand',
    in_review: 'In Review',
    ea_review: 'EA Review',
    analyse: 'Analyse',
    approved: 'Approved',
    ready_to_implement: 'Ready to Implement',
    implement: 'Implement',
    closed: 'Closed',
    rejected: 'Rejected',
    on_hold: 'On Hold',
    platform: 'PLATFORM',
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
    roadmapSubtitle: 'محفظة الطلبات الصناعية',
    businessRequest: 'طلب أعمال',
    rank: 'الترتيب',
    new_request: 'طلب جديد',
    new_demand: 'طلب جديد',
    in_review: 'قيد المراجعة',
    ea_review: 'مراجعة هندسية',
    analyse: 'تحليل',
    approved: 'موافق عليه',
    ready_to_implement: 'جاهز للتنفيذ',
    implement: 'تنفيذ',
    closed: 'مغلق',
    rejected: 'مرفوض',
    on_hold: 'معلق',
    platform: 'المنصة',
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
  showPlatformQuickFilters: true,
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
    title: 'title',
    startDate: 'start_date',
    endDate: 'end_date',
    status: 'process_step',
    lane: 'platform',
    rank: 'rank',
    platform: 'platform',
  },

  statusColors: BUSINESS_REQUEST_STATUS_COLORS,

  platforms: {},

  translations: BUSINESS_REQUEST_TRANSLATIONS,

  header: {
    icon: 'BR',
    iconGradient: 'linear-gradient(135deg, hsl(var(--brand-primary)), hsl(var(--brand-primary) / 0.6))',
  },

  legend: {
    showStatus: true,
    showTimeline: true,
    showMilestones: true,
  },

  filters: BUSINESS_REQUEST_FILTERS_CONFIG,
};

export default businessRequestRoadmapConfig;
