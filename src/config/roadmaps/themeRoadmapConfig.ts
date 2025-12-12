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

// Epic status colors for child epic markers on Theme roadmap
// Reused from epicRoadmapConfig status colors
export const THEME_EPIC_MARKER_STATUS_COLORS: Record<string, { border: string; background: string; text: string }> = {
  'proposed': {
    border: 'hsl(var(--roadmap-status-new))',
    background: 'white',
    text: 'hsl(var(--roadmap-status-new))',
  },
  'analyzing': {
    border: 'hsl(var(--roadmap-status-analyse))',
    background: 'white',
    text: 'hsl(var(--roadmap-status-analyse))',
  },
  'approved': {
    border: 'hsl(var(--roadmap-status-approved))',
    background: 'white',
    text: 'hsl(var(--roadmap-status-approved))',
  },
  'in_progress': {
    border: 'hsl(var(--roadmap-status-implement))',
    background: 'hsl(var(--roadmap-status-implement))',
    text: 'white',
  },
  'done': {
    border: 'hsl(var(--roadmap-status-closed))',
    background: 'hsl(var(--roadmap-status-closed))',
    text: 'white',
  },
  'cancelled': {
    border: 'hsl(var(--muted))',
    background: 'hsl(var(--muted))',
    text: 'white',
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
    milestones: 'CHILD EPICS', // Theme-specific: show Child Epics instead of Milestones
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
    milestones: 'الملاحم الفرعية', // Theme-specific: Arabic for Child Epics
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
    showMilestones: true, // Theme roadmap shows Child Epics as milestones
  },

  filters: THEME_FILTERS_CONFIG,
};

export default themeRoadmapConfig;
