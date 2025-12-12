// Theme Roadmap Configuration
// Strategic Themes roadmap for Enterprise context

import { RoadmapConfig, StatusConfig, RoadmapTranslations, FiltersConfig } from './types';

// Status configurations - maps theme_status enum to colors
const THEME_STATUS_COLORS: Record<string, StatusConfig> = {
  'proposed': {
    key: 'proposed',
    label: 'Proposed',
    labelAr: 'مقترح',
    gradient: 'linear-gradient(90deg, hsl(var(--roadmap-status-new)), hsl(var(--roadmap-status-new) / 0.8))',
  },
  'active': {
    key: 'active',
    label: 'Active',
    labelAr: 'نشط',
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

// Translations for theme roadmap
const THEME_TRANSLATIONS: RoadmapTranslations = {
  en: {
    roadmapTitle: 'STRATEGIC THEMES ROADMAP',
    roadmapSubtitle: 'Enterprise Theme Portfolio',
    businessRequest: 'THEME',
    rank: 'Rank',
    proposed: 'Proposed',
    active: 'Active',
    done: 'Done',
    cancelled: 'Cancelled',
    platform: 'SNAPSHOT',
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
    roadmapTitle: 'خارطة المحاور الاستراتيجية',
    roadmapSubtitle: 'محفظة المحاور المؤسسية',
    businessRequest: 'محور',
    rank: 'الترتيب',
    proposed: 'مقترح',
    active: 'نشط',
    done: 'مكتمل',
    cancelled: 'ملغي',
    platform: 'اللقطة',
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

// Filters configuration for theme roadmap
const THEME_FILTERS_CONFIG: FiltersConfig = {
  showPlatformQuickFilters: false, // No platform concept for themes
  platformFilters: [],
  showStatusFilter: true,
  showOwnerFilter: true,
  showSortFilter: true,
};

// Main theme roadmap configuration
export const themeRoadmapConfig: RoadmapConfig = {
  workItemType: 'theme',

  // Field mapping from strategic_themes entity to roadmap engine
  fieldMap: {
    id: 'id',
    title: 'name',
    startDate: 'start_date', // Fallback to created_at handled in hook
    endDate: 'end_date',     // If null, treat as open-ended
    status: 'status',        // theme_status enum: proposed | active | done | cancelled
    lane: 'snapshot_id',     // Group by Strategy Snapshot
    rank: undefined,         // No rank field for themes
    platform: undefined,     // No platform concept for themes
  },

  statusColors: THEME_STATUS_COLORS,

  platforms: {}, // Themes don't have platforms

  translations: THEME_TRANSLATIONS,

  header: {
    icon: 'TH',
    iconGradient: 'linear-gradient(135deg, #C69C6D, #E8D5C0)',
  },

  legend: {
    showStatus: true,
    showTimeline: true,
    showMilestones: false, // Themes do NOT show milestones
  },

  filters: THEME_FILTERS_CONFIG,
};

export default themeRoadmapConfig;
