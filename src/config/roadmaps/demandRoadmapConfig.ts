// Demand Roadmap Configuration
// Extracts all demand-specific logic from the ExecutiveRoadmap into a reusable config

import { RoadmapConfig, StatusConfig, PlatformConfig, RoadmapTranslations, FiltersConfig } from './types';

// Status configurations - maps demand process_step statuses to colors
const DEMAND_STATUS_COLORS: Record<string, StatusConfig> = {
  'NEW': {
    key: 'NEW',
    label: 'New Request',
    labelAr: 'طلب جديد',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-new)), hsl(var(--roadmap-status-new) / 0.8))',
  },
  'ANALYSE': {
    key: 'ANALYSE',
    label: 'Analyse',
    labelAr: 'تحليل',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-analyse)), hsl(var(--roadmap-status-analyse) / 0.8))',
  },
  'APPROVED': {
    key: 'APPROVED',
    label: 'Approved',
    labelAr: 'موافق عليه',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-approved)), hsl(var(--roadmap-status-approved) / 0.8))',
  },
  'IMPLEMENT': {
    key: 'IMPLEMENT',
    label: 'Implement',
    labelAr: 'تنفيذ',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-implement)), hsl(var(--roadmap-status-implement) / 0.8))',
  },
  'CLOSED': {
    key: 'CLOSED',
    label: 'Closed',
    labelAr: 'مغلق',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-closed)), hsl(var(--roadmap-status-closed) / 0.8))',
  },
};

// Platform configurations - demand platforms
const DEMAND_PLATFORMS: Record<string, PlatformConfig> = {
  'Senaei Platform': { id: 'Senaei Platform', name: 'Senaei Platform', nameAr: 'منصة صناعي', icon: 'SP' },
  'Innovation Platform': { id: 'Innovation Platform', name: 'Innovation Platform', nameAr: 'منصة الابتكار', icon: 'IP' },
  'Compass': { id: 'Compass', name: 'Compass', nameAr: 'كومباس', icon: 'CP' },
  'Tahommena': { id: 'Tahommena', name: 'Tahommena', nameAr: 'تحومنا', icon: 'TH' },
  'Mini Apps': { id: 'Mini Apps', name: 'Mini Apps', nameAr: 'التطبيقات المصغرة', icon: 'MA' },
  'Website': { id: 'Website', name: 'Website', nameAr: 'الموقع الإلكتروني', icon: 'WB' },
};

// Translations for demand roadmap
const DEMAND_TRANSLATIONS: RoadmapTranslations = {
  en: {
    roadmapTitle: 'EXECUTIVE ROADMAP',
    roadmapSubtitle: 'Industry Requests Portfolio',
    businessRequest: 'BUSINESS REQUEST',
    rank: 'Rank',
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
    roadmapTitle: 'خارطة الطريق التنفيذية',
    roadmapSubtitle: 'محفظة الطلبات الصناعية',
    businessRequest: 'طلب العمل',
    rank: 'الترتيب',
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

// Filters configuration for demand roadmap
const DEMAND_FILTERS_CONFIG: FiltersConfig = {
  showPlatformQuickFilters: true,
  platformFilters: [
    { id: 'Senaei Platform', label: 'Senaei Platform' },
    { id: 'Innovation Platform', label: 'Innovation Platform' },
    { id: 'Compass', label: 'Compass' },
    { id: 'Tahommena', label: 'Tahommena' },
    { id: 'Mini Apps', label: 'Mini Apps' },
    { id: 'Website', label: 'Website' },
  ],
  showStatusFilter: true,
  showOwnerFilter: true,
  showSortFilter: true,
};

// Main demand roadmap configuration
export const demandRoadmapConfig: RoadmapConfig = {
  workItemType: 'demand',

  // Field mapping from business_requests entity to roadmap engine
  fieldMap: {
    id: 'request_key',
    title: 'title',
    startDate: 'impl_start_date', // Kickoff date
    endDate: 'impl_target_end_date', // Target Complete date
    status: 'process_step',
    lane: 'business_owner', // Grouping by business owner
    rank: 'rank',
    platform: 'delivery_platform',
  },

  statusColors: DEMAND_STATUS_COLORS,

  platforms: DEMAND_PLATFORMS,

  translations: DEMAND_TRANSLATIONS,

  header: {
    icon: 'MIM',
    iconGradient: 'linear-gradient(135deg, #C69C6D, #E8D5C0)',
  },

  legend: {
    showStatus: true,
    showTimeline: true,
    showMilestones: true,
  },

  filters: DEMAND_FILTERS_CONFIG,
};

export default demandRoadmapConfig;
