// Roadmap Engine Configuration Types

export type TimeScale = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type Language = 'en' | 'ar';
export type SortField = 'rank' | 'platform' | 'submission' | 'score' | 'target' | 'quarter' | 'owner';
export type SortOrder = 'asc' | 'desc';

// Generic roadmap item structure that all entity types must map to
export interface RoadmapItem {
  id: string;
  titleEn: string;
  titleAr: string;
  ownerEn: string;
  ownerAr: string;
  status: string;
  platform: string;
  rank: number | null;
  startDate: string;
  endDate: string;
  milestones: Array<{ step: 1 | 2 | 3 | 4 | 5; date: string; state: 'complete' | 'current' | 'pending' }>;
  risks: Array<{ sno: number; title: string; status: 'resolved' | 'pending' | 'blocked' }>;
  dependencies: Array<{ sno: number; title: string; status: 'resolved' | 'pending' | 'blocked' }>;
}

// Status configuration for legend and bar colors
export interface StatusConfig {
  key: string;
  label: string;
  labelAr: string;
  gradient: string;
}

// Platform filter configuration
export interface PlatformConfig {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
}

// Field mapping from source entity to RoadmapItem
export interface FieldMap {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  lane: string; // grouping field (e.g., business_owner, team, etc.)
  rank?: string;
  platform?: string;
}

// Translations configuration
export interface RoadmapTranslations {
  en: {
    roadmapTitle: string;
    roadmapSubtitle: string;
    businessRequest: string;
    rank: string;
    [key: string]: string;
  };
  ar: {
    roadmapTitle: string;
    roadmapSubtitle: string;
    businessRequest: string;
    rank: string;
    [key: string]: string;
  };
}

// Header configuration
export interface HeaderConfig {
  icon: string;
  iconGradient: string;
}

// Legend configuration
export interface LegendConfig {
  showStatus: boolean;
  showTimeline: boolean;
  showMilestones: boolean;
}

// Filter configuration
export interface FiltersConfig {
  showPlatformQuickFilters: boolean;
  platformFilters: Array<{ id: string; label: string }>;
  showStatusFilter: boolean;
  showOwnerFilter: boolean;
  showSortFilter: boolean;
}

// Main roadmap configuration interface
export interface RoadmapConfig {
  // Identifier for the roadmap type
  workItemType: string;
  
  // Field mapping from source entity to roadmap engine
  fieldMap: FieldMap;
  
  // Status to color/gradient mapping
  statusColors: Record<string, StatusConfig>;
  
  // Platform configuration
  platforms: Record<string, PlatformConfig>;
  
  // Translations
  translations: RoadmapTranslations;
  
  // Header configuration
  header: HeaderConfig;
  
  // Legend configuration
  legend: LegendConfig;
  
  // Filters configuration
  filters: FiltersConfig;
  
  // Drawer opener function - injected at runtime
  openDrawer?: (id: string) => void;
}

// Props for the generic RoadmapEngine
export interface RoadmapEngineProps {
  config: RoadmapConfig;
  items: RoadmapItem[];
  isLoading?: boolean;
  className?: string;
  onItemClick?: (id: string) => void;
}
