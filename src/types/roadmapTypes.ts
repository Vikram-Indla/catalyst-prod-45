// Executive Roadmap Types and Constants (no seed data)

export type RoadmapStatus = 'NEW' | 'ANALYSE' | 'APPROVED' | 'IMPLEMENT' | 'CLOSED';
export type MilestoneState = 'complete' | 'current' | 'pending';
export type RiskDepStatus = 'resolved' | 'pending' | 'blocked';

export interface BusinessRequestRoadmapItem {
  id: string;
  titleEn: string;
  titleAr: string;
  ownerEn: string;
  ownerAr: string;
  status: RoadmapStatus;
  platform: string;
  rank: number | null;
  startDate: string;
  endDate: string;
  milestones: Array<{ step: 1 | 2 | 3 | 4 | 5; date: string; state: MilestoneState }>;
  risks: Array<{ sno: number; title: string; status: RiskDepStatus }>;
  dependencies: Array<{ sno: number; title: string; status: RiskDepStatus }>;
}

export const PLATFORM_INFO: Record<string, { name: string; nameAr: string; icon: string }> = {
  'Senaei Platform': { name: 'Senaei Platform', nameAr: 'منصة صناعي', icon: 'SP' },
  'Innovation Platform': { name: 'Innovation Platform', nameAr: 'منصة الابتكار', icon: 'IP' },
  'Compass': { name: 'Compass', nameAr: 'كومباس', icon: 'CP' },
  'Tahommena': { name: 'Tahommena', nameAr: 'تحومنا', icon: 'TH' },
  'Mini Apps': { name: 'Mini Apps', nameAr: 'التطبيقات المصغرة', icon: 'MA' },
  'Website': { name: 'Website', nameAr: 'الموقع الإلكتروني', icon: 'WB' },
};

export const STAGE_NAMES: Record<RoadmapStatus, string> = {
  'NEW': 'New Request',
  'ANALYSE': 'Analyse',
  'APPROVED': 'Approved',
  'IMPLEMENT': 'Implement',
  'CLOSED': 'Closed',
};

export const STAGE_NAMES_AR: Record<RoadmapStatus, string> = {
  'NEW': 'طلب جديد',
  'ANALYSE': 'تحليل',
  'APPROVED': 'موافق عليه',
  'IMPLEMENT': 'تنفيذ',
  'CLOSED': 'مغلق',
};
