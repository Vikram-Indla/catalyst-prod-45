// Executive Roadmap Seed Data
// Matches screenshot KPI counts: NEW=2, ANALYSE=3, APPROVED=2, IMPLEMENT=2, CLOSED=1

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

export const SEED_ROADMAP_ITEMS: BusinessRequestRoadmapItem[] = [
  {
    id: "MIM-030",
    titleEn: "Industrial License Automation Portal",
    titleAr: "بوابة أتمتة الرخص الصناعية",
    ownerEn: "Fahad Al-Mutairi",
    ownerAr: "فهد المطيري",
    status: "APPROVED",
    platform: "Senaei Platform",
    rank: 1,
    startDate: "2024-10-24",
    endDate: "2025-03-25",
    milestones: [
      { step: 1, date: "2024-10-24", state: "complete" },
      { step: 2, date: "2024-11-24", state: "complete" },
      { step: 3, date: "2024-12-24", state: "current" },
      { step: 4, date: "2025-01-25", state: "pending" },
      { step: 5, date: "2025-03-25", state: "pending" }
    ],
    risks: [],
    dependencies: []
  },
  {
    id: "MIM-002",
    titleEn: "Environmental Compliance Tracker",
    titleAr: "متتبع الامتثال البيئي",
    ownerEn: "Ahmed Al-Rashid",
    ownerAr: "أحمد الراشد",
    status: "IMPLEMENT",
    platform: "Senaei Platform",
    rank: 2,
    startDate: "2024-11-24",
    endDate: "2025-02-25",
    milestones: [
      { step: 1, date: "2024-11-24", state: "complete" },
      { step: 2, date: "2024-12-24", state: "complete" },
      { step: 3, date: "2025-01-10", state: "complete" },
      { step: 4, date: "2025-01-25", state: "current" },
      { step: 5, date: "2025-02-25", state: "pending" }
    ],
    risks: [
      { sno: 1, title: "Third-party API limits", status: "resolved" }
    ],
    dependencies: [
      { sno: 1, title: "MIM-030: License Portal", status: "pending" }
    ]
  },
  {
    id: "MIM-003",
    titleEn: "Factory Inspection Management",
    titleAr: "إدارة تفتيش المصانع",
    ownerEn: "Ahmed Al-Rashid",
    ownerAr: "أحمد الراشد",
    status: "ANALYSE",
    platform: "Senaei Platform",
    rank: 3,
    startDate: "2025-01-25",
    endDate: "2025-06-25",
    milestones: [
      { step: 1, date: "2025-01-25", state: "complete" },
      { step: 2, date: "2025-02-25", state: "current" },
      { step: 3, date: "2025-03-25", state: "pending" },
      { step: 4, date: "2025-05-25", state: "pending" },
      { step: 5, date: "2025-06-25", state: "pending" }
    ],
    risks: [],
    dependencies: []
  },
  {
    id: "MIM-019",
    titleEn: "Energy Efficiency Dashboard",
    titleAr: "لوحة كفاءة الطاقة",
    ownerEn: "Khalid Al-Saud",
    ownerAr: "خالد آل سعود",
    status: "NEW",
    platform: "Senaei Platform",
    rank: 4,
    startDate: "2024-10-24",
    endDate: "2025-03-25",
    milestones: [
      { step: 1, date: "2024-10-24", state: "current" },
      { step: 2, date: "2024-11-24", state: "pending" },
      { step: 3, date: "2024-12-24", state: "pending" },
      { step: 4, date: "2025-01-25", state: "pending" },
      { step: 5, date: "2025-03-25", state: "pending" }
    ],
    risks: [],
    dependencies: []
  },
  {
    id: "MIM-029",
    titleEn: "R&D Grant Application Portal",
    titleAr: "بوابة منح البحث والتطوير",
    ownerEn: "Mansour Al-Dossary",
    ownerAr: "منصور الدوسري",
    status: "ANALYSE",
    platform: "Innovation Platform",
    rank: 5,
    startDate: "2024-12-24",
    endDate: "2025-05-25",
    milestones: [
      { step: 1, date: "2024-12-24", state: "complete" },
      { step: 2, date: "2025-02-01", state: "current" },
      { step: 3, date: "2025-03-25", state: "pending" },
      { step: 4, date: "2025-04-25", state: "pending" },
      { step: 5, date: "2025-05-25", state: "pending" }
    ],
    risks: [],
    dependencies: []
  },
  {
    id: "MIM-021",
    titleEn: "Customs Clearance Automation",
    titleAr: "أتمتة التخليص الجمركي",
    ownerEn: "Omar Al-Zahrani",
    ownerAr: "عمر الزهراني",
    status: "CLOSED",
    platform: "Compass",
    rank: 6,
    startDate: "2024-10-24",
    endDate: "2024-12-24",
    milestones: [
      { step: 1, date: "2024-10-24", state: "complete" },
      { step: 2, date: "2024-11-10", state: "complete" },
      { step: 3, date: "2024-11-24", state: "complete" },
      { step: 4, date: "2024-12-10", state: "complete" },
      { step: 5, date: "2024-12-24", state: "complete" }
    ],
    risks: [],
    dependencies: []
  },
  {
    id: "MIM-025",
    titleEn: "Industry Analytics Dashboard",
    titleAr: "لوحة تحليلات الصناعة",
    ownerEn: "Sara Al-Farsi",
    ownerAr: "سارة الفارسي",
    status: "ANALYSE",
    platform: "Tahommena",
    rank: 7,
    startDate: "2024-11-24",
    endDate: "2025-04-25",
    milestones: [
      { step: 1, date: "2024-11-24", state: "complete" },
      { step: 2, date: "2025-02-05", state: "current" },
      { step: 3, date: "2025-03-01", state: "pending" },
      { step: 4, date: "2025-03-25", state: "pending" },
      { step: 5, date: "2025-04-25", state: "pending" }
    ],
    risks: [],
    dependencies: []
  },
  {
    id: "MIM-027",
    titleEn: "Permit Application Mini App",
    titleAr: "تطبيق طلب التصاريح (مصغّر)",
    ownerEn: "Nasser Al-Qahtani",
    ownerAr: "ناصر القحطاني",
    status: "APPROVED",
    platform: "Mini Apps",
    rank: 8,
    startDate: "2024-12-24",
    endDate: "2025-03-25",
    milestones: [
      { step: 1, date: "2024-12-24", state: "complete" },
      { step: 2, date: "2025-01-10", state: "complete" },
      { step: 3, date: "2025-02-10", state: "current" },
      { step: 4, date: "2025-03-01", state: "pending" },
      { step: 5, date: "2025-03-25", state: "pending" }
    ],
    risks: [],
    dependencies: []
  },
  {
    id: "MIM-028",
    titleEn: "Industrial Waste Management Portal",
    titleAr: "بوابة إدارة النفايات الصناعية",
    ownerEn: "Abdulaziz Al-Otaibi",
    ownerAr: "عبدالعزيز العتيبي",
    status: "IMPLEMENT",
    platform: "Senaei Platform",
    rank: 9,
    startDate: "2024-10-24",
    endDate: "2025-02-25",
    milestones: [
      { step: 1, date: "2024-10-24", state: "complete" },
      { step: 2, date: "2024-11-24", state: "complete" },
      { step: 3, date: "2024-12-24", state: "complete" },
      { step: 4, date: "2025-01-25", state: "current" },
      { step: 5, date: "2025-02-25", state: "pending" }
    ],
    risks: [],
    dependencies: []
  },
  {
    id: "MIM-024",
    titleEn: "Emergency Response Coordination System",
    titleAr: "نظام تنسيق الاستجابة للطوارئ",
    ownerEn: "Reem Al-Qahtani",
    ownerAr: "ريم القحطاني",
    status: "NEW",
    platform: "Senaei Platform",
    rank: 10,
    startDate: "2025-01-05",
    endDate: "2025-03-25",
    milestones: [
      { step: 1, date: "2025-01-05", state: "current" },
      { step: 2, date: "2025-01-25", state: "pending" },
      { step: 3, date: "2025-02-10", state: "pending" },
      { step: 4, date: "2025-03-01", state: "pending" },
      { step: 5, date: "2025-03-25", state: "pending" }
    ],
    risks: [],
    dependencies: []
  }
];
