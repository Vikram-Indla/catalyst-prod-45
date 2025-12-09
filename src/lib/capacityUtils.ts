/**
 * Capacity & Allocation Utility Functions
 * Following specification from LOVABLE-AI-PROMPT.md
 * Using ONLY Golden Hour palette colors
 */

import { Resource, Allocation, AllocationStatusInfo, CapacityProject, Vacancy } from '@/types/capacity';

// Golden Hour palette colors (CSS variables must be defined in index.css)
export const GOLDEN_HOUR = {
  expert: '#5c7c5c',      // Olive - Full allocation, success
  advanced: '#8b7355',    // Bronze - Warnings, underallocation
  intermediate: '#c69c6d', // Gold - Brand accent
  beginner: '#d4b896',    // Champagne - Light states
  none: '#c8ccd0',        // Grey - Neutral
} as const;

// Get current ISO week number
export function getCurrentWeek(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

// Get current year
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

// Calculate total utilization for a resource
export function calculateUtilization(allocations: Allocation[], weekNumber?: number, year?: number): number {
  const filtered = weekNumber && year 
    ? allocations.filter(a => a.weekNumber === weekNumber && a.year === year)
    : allocations;
  return filtered.reduce((sum, a) => sum + a.percentage, 0);
}

// Get allocation status based on percentage - Using Golden Hour colors
export function getStatus(percentage: number): AllocationStatusInfo {
  if (percentage > 100) {
    return { 
      status: 'over', 
      label: 'Overallocated', 
      colorClass: 'text-[#c69c6d] bg-[#c69c6d]/10' // Gold for over
    };
  }
  if (percentage >= 80) {
    return { 
      status: 'full', 
      label: 'Fully Allocated', 
      colorClass: 'text-[#5c7c5c] bg-[#5c7c5c]/10' // Olive for full
    };
  }
  return { 
    status: 'under', 
    label: 'Underallocated', 
    colorClass: 'text-[#8b7355] bg-[#8b7355]/10' // Bronze for under
  };
}

// Check if a week is editable
export function isWeekEditable(weekNumber: number, year: number, currentWeek: number, currentYear: number, adminMode: boolean): boolean {
  if (year > currentYear) return true;
  if (year < currentYear) return adminMode;
  if (weekNumber > currentWeek) return true;
  if (weekNumber === currentWeek) return true;
  return adminMode;
}

// Get week date range string
export function getWeekDateRange(weekNumber: number, year: number): string {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysOffset = (weekNumber - 1) * 7 - firstDayOfYear.getDay() + 1;
  const weekStart = new Date(year, 0, 1 + daysOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const formatDate = (d: Date) => {
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleString('en', { month: 'short' });
    return `${day} ${month}`;
  };
  
  return `${formatDate(weekStart)}–${formatDate(weekEnd)}`;
}

// Get available capacity for a resource in a week
export function getAvailableCapacity(resource: Resource, weekNumber: number, year: number): number {
  const used = calculateUtilization(resource.allocations, weekNumber, year);
  return Math.max(0, resource.capacity - used);
}

// Generate initials from name
export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// Projects data based on team structure
export const MOCK_PROJECTS: CapacityProject[] = [
  { id: 'ai-data', name: 'AI & Data', shortName: 'AI & Data', color: GOLDEN_HOUR.expert, status: 'Active' },
  { id: 'innovation', name: 'Innovation Platform', shortName: 'Innovation', color: GOLDEN_HOUR.advanced, status: 'Active' },
  { id: 'intl', name: 'International Relations', shortName: 'International', color: GOLDEN_HOUR.intermediate, status: 'Active' },
  { id: 'mim', name: 'MIM Website', shortName: 'MIM', color: GOLDEN_HOUR.beginner, status: 'Active' },
  { id: 'senaei-core', name: 'Senaei BAU Core', shortName: 'Senaei Core', color: GOLDEN_HOUR.expert, status: 'Active' },
  { id: 'senaei-ss', name: 'Senaei BAU-SS', shortName: 'Senaei SS', color: GOLDEN_HOUR.advanced, status: 'Active' },
  { id: 'senaei-mobile', name: 'Senaei Mobile', shortName: 'Mobile', color: GOLDEN_HOUR.intermediate, status: 'Active' },
  { id: 'l2l3', name: 'L2/L3 Support', shortName: 'L2/L3', color: GOLDEN_HOUR.beginner, status: 'Active' },
  { id: 'icp', name: 'ICP Project', shortName: 'ICP', color: GOLDEN_HOUR.expert, status: 'Active' },
  { id: 'inspection', name: 'Inspection Project', shortName: 'Inspection', color: GOLDEN_HOUR.advanced, status: 'Active' },
  { id: 'tohemmena', name: 'Tohemmena', shortName: 'Tohemmena', color: GOLDEN_HOUR.intermediate, status: 'Active' },
];

// 32 Team Members with allocations
export const MOCK_RESOURCES: Resource[] = [
  // AI & Data Team
  { 
    id: 'amadou', name: 'Amadou Ndiaye', initials: 'AN', role: 'Data Engineer', 
    primarySkill: 'Data', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'amadou-1', resourceId: 'amadou', projectId: 'ai-data', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'amadou-2', resourceId: 'amadou', projectId: 'ai-data', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'amadou-3', resourceId: 'amadou', projectId: 'ai-data', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-01'
  },
  { 
    id: 'maaz', name: 'Maaz Majid', initials: 'MM', role: 'Data Engineer', 
    primarySkill: 'Data', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'maaz-1', resourceId: 'maaz', projectId: 'ai-data', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'maaz-2', resourceId: 'maaz', projectId: 'ai-data', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'maaz-3', resourceId: 'maaz', projectId: 'ai-data', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-28'
  },
  
  // Innovation Platform Team
  { 
    id: 'andrew', name: 'Andrew Fayyaz', initials: 'AF', role: 'Frontend Developer', 
    primarySkill: 'Frontend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'andrew-1', resourceId: 'andrew', projectId: 'innovation', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'andrew-2', resourceId: 'andrew', projectId: 'senaei-ss', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'andrew-3', resourceId: 'andrew', projectId: 'innovation', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'andrew-4', resourceId: 'andrew', projectId: 'senaei-ss', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'andrew-5', resourceId: 'andrew', projectId: 'innovation', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'andrew-6', resourceId: 'andrew', projectId: 'senaei-ss', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-02' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-02'
  },
  { 
    id: 'raza', name: 'Raza Bangi', initials: 'RB', role: 'Backend Developer', 
    primarySkill: 'Backend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'raza-1', resourceId: 'raza', projectId: 'innovation', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-30' },
      { id: 'raza-2', resourceId: 'raza', projectId: 'innovation', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-30' },
      { id: 'raza-3', resourceId: 'raza', projectId: 'innovation', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-30' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-30'
  },
  { 
    id: 'syed', name: 'Syed Habib', initials: 'SH', role: 'Sr Backend Developer', 
    primarySkill: 'Backend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'syed-1', resourceId: 'syed', projectId: 'innovation', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'syed-2', resourceId: 'syed', projectId: 'senaei-ss', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'syed-3', resourceId: 'syed', projectId: 'innovation', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'syed-4', resourceId: 'syed', projectId: 'senaei-ss', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'syed-5', resourceId: 'syed', projectId: 'innovation', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'syed-6', resourceId: 'syed', projectId: 'senaei-ss', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-01'
  },
  
  // International Relations Team
  { 
    id: 'dreni', name: 'Dreni Djini', initials: 'DD', role: 'Frontend Architect', 
    primarySkill: 'Frontend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'dreni-1', resourceId: 'dreni', projectId: 'intl', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-25' },
      { id: 'dreni-2', resourceId: 'dreni', projectId: 'mim', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-25' },
      { id: 'dreni-3', resourceId: 'dreni', projectId: 'intl', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-25' },
      { id: 'dreni-4', resourceId: 'dreni', projectId: 'mim', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-25' },
      { id: 'dreni-5', resourceId: 'dreni', projectId: 'intl', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-25' },
      { id: 'dreni-6', resourceId: 'dreni', projectId: 'mim', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-25' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-25'
  },
  { 
    id: 'faisal', name: 'Faisal Javed', initials: 'FJ', role: 'Technical Product Owner', 
    primarySkill: 'Product', location: 'Onsite', department: 'Product', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'faisal-1', resourceId: 'faisal', projectId: 'intl', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-03' },
      { id: 'faisal-2', resourceId: 'faisal', projectId: 'icp', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-03' },
      { id: 'faisal-3', resourceId: 'faisal', projectId: 'intl', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-03' },
      { id: 'faisal-4', resourceId: 'faisal', projectId: 'icp', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-03' },
      { id: 'faisal-5', resourceId: 'faisal', projectId: 'intl', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-03' },
      { id: 'faisal-6', resourceId: 'faisal', projectId: 'icp', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-03' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-03'
  },
  { 
    id: 'sherif', name: 'Sherif Gjini', initials: 'SG', role: 'Sr Frontend Developer', 
    primarySkill: 'Frontend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'sherif-1', resourceId: 'sherif', projectId: 'intl', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'sherif-2', resourceId: 'sherif', projectId: 'mim', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'sherif-3', resourceId: 'sherif', projectId: 'intl', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'sherif-4', resourceId: 'sherif', projectId: 'mim', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'sherif-5', resourceId: 'sherif', projectId: 'intl', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'sherif-6', resourceId: 'sherif', projectId: 'mim', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-11-28' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-28'
  },
  
  // Senaei BAU Core Team
  { 
    id: 'arslan', name: 'Arslan Malik', initials: 'AM', role: 'DevOps Architect', 
    primarySkill: 'DevOps', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'arslan-1', resourceId: 'arslan', projectId: 'senaei-core', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'arslan-2', resourceId: 'arslan', projectId: 'senaei-core', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'arslan-3', resourceId: 'arslan', projectId: 'senaei-core', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-01'
  },
  { 
    id: 'hassan', name: 'Hassan Raza Hasrat', initials: 'HH', role: 'Backend Architect', 
    primarySkill: 'Backend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'hassan-1', resourceId: 'hassan', projectId: 'senaei-core', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-29' },
      { id: 'hassan-2', resourceId: 'hassan', projectId: 'senaei-core', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-29' },
      { id: 'hassan-3', resourceId: 'hassan', projectId: 'senaei-core', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-29' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-29'
  },
  { 
    id: 'imran', name: 'Imran Aslam', initials: 'IA', role: 'Sr Frontend Developer', 
    primarySkill: 'Frontend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'imran-1', resourceId: 'imran', projectId: 'senaei-core', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'imran-2', resourceId: 'imran', projectId: 'senaei-core', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'imran-3', resourceId: 'imran', projectId: 'senaei-core', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-02' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-02'
  },
  { 
    id: 'nada', name: 'Nada Alfassam', initials: 'NA', role: 'Technical Product Owner', 
    primarySkill: 'Product', location: 'Onsite', department: 'Product', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'nada-1', resourceId: 'nada', projectId: 'senaei-core', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
      { id: 'nada-2', resourceId: 'nada', projectId: 'senaei-core', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
      { id: 'nada-3', resourceId: 'nada', projectId: 'senaei-core', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-30'
  },
  { 
    id: 'vikram', name: 'Vikram Indla', initials: 'VI', role: 'Delivery Manager', 
    primarySkill: 'Product', location: 'Onsite', department: 'Product', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'vikram-1', resourceId: 'vikram', projectId: 'senaei-core', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'vikram-2', resourceId: 'vikram', projectId: 'senaei-core', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'vikram-3', resourceId: 'vikram', projectId: 'senaei-core', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-01'
  },
  { 
    id: 'yahya', name: 'Yahya Alayoni', initials: 'YA', role: 'Integration Architect', 
    primarySkill: 'Backend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'yahya-1', resourceId: 'yahya', projectId: 'senaei-core', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'yahya-2', resourceId: 'yahya', projectId: 'senaei-core', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'yahya-3', resourceId: 'yahya', projectId: 'senaei-core', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-28'
  },
  { 
    id: 'yazeed', name: 'Yazeed Daraz', initials: 'YD', role: 'Sr QA Specialist', 
    primarySkill: 'QA', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'yazeed-1', resourceId: 'yazeed', projectId: 'senaei-core', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-03' },
      { id: 'yazeed-2', resourceId: 'yazeed', projectId: 'senaei-core', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-03' },
      { id: 'yazeed-3', resourceId: 'yazeed', projectId: 'senaei-core', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-03' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-03'
  },
  
  // Senaei BAU-SS Team
  { 
    id: 'ayaz', name: 'Ayaz Muhammad', initials: 'AY', role: 'Backend Developer', 
    primarySkill: 'Backend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'ayaz-1', resourceId: 'ayaz', projectId: 'senaei-ss', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'ayaz-2', resourceId: 'ayaz', projectId: 'senaei-ss', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'ayaz-3', resourceId: 'ayaz', projectId: 'senaei-ss', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-01'
  },
  { 
    id: 'hadeel', name: 'Hadeel', initials: 'HD', role: 'QA Engineer', 
    primarySkill: 'QA', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'hadeel-1', resourceId: 'hadeel', projectId: 'senaei-ss', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
      { id: 'hadeel-2', resourceId: 'hadeel', projectId: 'senaei-ss', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
      { id: 'hadeel-3', resourceId: 'hadeel', projectId: 'senaei-ss', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-30'
  },
  { 
    id: 'karim', name: 'Karim', initials: 'KR', role: 'QA Engineer', 
    primarySkill: 'QA', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'karim-1', resourceId: 'karim', projectId: 'senaei-ss', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-29' },
      { id: 'karim-2', resourceId: 'karim', projectId: 'senaei-ss', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-29' },
      { id: 'karim-3', resourceId: 'karim', projectId: 'senaei-ss', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-29' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-29'
  },
  { 
    id: 'rahaf', name: 'Rahaf', initials: 'RF', role: 'QA Engineer', 
    primarySkill: 'QA', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'rahaf-1', resourceId: 'rahaf', projectId: 'senaei-ss', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'rahaf-2', resourceId: 'rahaf', projectId: 'senaei-ss', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'rahaf-3', resourceId: 'rahaf', projectId: 'senaei-ss', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-02' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-02'
  },
  { 
    id: 'reem', name: 'Reem', initials: 'RM', role: 'QA Engineer', 
    primarySkill: 'QA', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'reem-1', resourceId: 'reem', projectId: 'senaei-ss', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'reem-2', resourceId: 'reem', projectId: 'senaei-ss', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'reem-3', resourceId: 'reem', projectId: 'senaei-ss', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-28'
  },
  { 
    id: 'sarah', name: 'Sarah', initials: 'SR', role: 'QA Engineer', 
    primarySkill: 'QA', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'sarah-1', resourceId: 'sarah', projectId: 'senaei-ss', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'sarah-2', resourceId: 'sarah', projectId: 'senaei-ss', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'sarah-3', resourceId: 'sarah', projectId: 'senaei-ss', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-01'
  },
  { 
    id: 'suleiman', name: 'Suleiman', initials: 'SU', role: 'QA Lead', 
    primarySkill: 'QA', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'suleiman-1', resourceId: 'suleiman', projectId: 'senaei-ss', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
      { id: 'suleiman-2', resourceId: 'suleiman', projectId: 'senaei-ss', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
      { id: 'suleiman-3', resourceId: 'suleiman', projectId: 'senaei-ss', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-30'
  },
  
  // Senaei Mobile Team
  { 
    id: 'sikander', name: 'Sikander Ahmad', initials: 'SA', role: 'Mobile Developer', 
    primarySkill: 'Frontend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'sikander-1', resourceId: 'sikander', projectId: 'senaei-mobile', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'sikander-2', resourceId: 'sikander', projectId: 'inspection', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'sikander-3', resourceId: 'sikander', projectId: 'senaei-mobile', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'sikander-4', resourceId: 'sikander', projectId: 'inspection', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'sikander-5', resourceId: 'sikander', projectId: 'senaei-mobile', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'sikander-6', resourceId: 'sikander', projectId: 'inspection', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-02' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-02'
  },
  { 
    id: 'wahid', name: 'Wahid Nasri', initials: 'WN', role: 'Senior Mobile Developer', 
    primarySkill: 'Frontend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'wahid-1', resourceId: 'wahid', projectId: 'senaei-mobile', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-29' },
      { id: 'wahid-2', resourceId: 'wahid', projectId: 'senaei-mobile', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-29' },
      { id: 'wahid-3', resourceId: 'wahid', projectId: 'senaei-mobile', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-29' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-29'
  },
  
  // L2/L3 Support Team
  { 
    id: 'divyam', name: 'Divyam Kshatriya', initials: 'DK', role: 'Frontend Senior Developer', 
    primarySkill: 'Frontend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'divyam-1', resourceId: 'divyam', projectId: 'l2l3', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'divyam-2', resourceId: 'divyam', projectId: 'l2l3', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'divyam-3', resourceId: 'divyam', projectId: 'l2l3', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-01'
  },
  { 
    id: 'waqas', name: 'Waqas Ali', initials: 'WA', role: 'Backend Senior Developer', 
    primarySkill: 'Backend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'waqas-1', resourceId: 'waqas', projectId: 'l2l3', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
      { id: 'waqas-2', resourceId: 'waqas', projectId: 'l2l3', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
      { id: 'waqas-3', resourceId: 'waqas', projectId: 'l2l3', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-30'
  },
  
  // ICP Project Team
  { 
    id: 'adnan', name: 'Adnan Ali', initials: 'AA', role: 'Frontend Developer', 
    primarySkill: 'Frontend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'adnan-1', resourceId: 'adnan', projectId: 'icp', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-03' },
      { id: 'adnan-2', resourceId: 'adnan', projectId: 'icp', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-03' },
      { id: 'adnan-3', resourceId: 'adnan', projectId: 'icp', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-03' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-03'
  },
  { 
    id: 'mazen', name: 'Mazen Yehia', initials: 'MY', role: 'Backend Developer', 
    primarySkill: 'Backend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'mazen-1', resourceId: 'mazen', projectId: 'icp', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'mazen-2', resourceId: 'mazen', projectId: 'icp', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'mazen-3', resourceId: 'mazen', projectId: 'icp', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-28'
  },
  { 
    id: 'menna', name: 'Menna Tula Nasser', initials: 'MN', role: 'Frontend Developer', 
    primarySkill: 'Frontend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'menna-1', resourceId: 'menna', projectId: 'icp', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'menna-2', resourceId: 'menna', projectId: 'icp', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'menna-3', resourceId: 'menna', projectId: 'icp', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-01'
  },
  
  // Inspection Project Team
  { 
    id: 'aya', name: 'Aya Ibrahims', initials: 'AI', role: 'QA Analyst', 
    primarySkill: 'QA', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'aya-1', resourceId: 'aya', projectId: 'inspection', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
      { id: 'aya-2', resourceId: 'aya', projectId: 'inspection', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
      { id: 'aya-3', resourceId: 'aya', projectId: 'inspection', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-30'
  },
  { 
    id: 'nour', name: 'Nour Almaani', initials: 'NM', role: 'QA Engineer', 
    primarySkill: 'QA', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'nour-1', resourceId: 'nour', projectId: 'inspection', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'nour-2', resourceId: 'nour', projectId: 'inspection', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-02' },
      { id: 'nour-3', resourceId: 'nour', projectId: 'inspection', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-02' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-02'
  },
  { 
    id: 'ubaid', name: 'Ubaid Nawab', initials: 'UN', role: 'Backend Developer', 
    primarySkill: 'Backend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'ubaid-1', resourceId: 'ubaid', projectId: 'inspection', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-29' },
      { id: 'ubaid-2', resourceId: 'ubaid', projectId: 'inspection', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-29' },
      { id: 'ubaid-3', resourceId: 'ubaid', projectId: 'inspection', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-29' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-29'
  },
  
  // Tohemmena Team
  { 
    id: 'hasan', name: 'Hasan Elsherby', initials: 'HE', role: 'Sr Frontend Developer', 
    primarySkill: 'Frontend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'hasan-1', resourceId: 'hasan', projectId: 'tohemmena', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'hasan-2', resourceId: 'hasan', projectId: 'tohemmena', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'hasan-3', resourceId: 'hasan', projectId: 'tohemmena', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-12-01'
  },
  { 
    id: 'michael', name: 'Michael Ibrahim', initials: 'MI', role: 'Sr Frontend Developer', 
    primarySkill: 'Frontend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'michael-1', resourceId: 'michael', projectId: 'tohemmena', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'michael-2', resourceId: 'michael', projectId: 'tohemmena', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
      { id: 'michael-3', resourceId: 'michael', projectId: 'tohemmena', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-28' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-28'
  },
  { 
    id: 'yousif', name: 'Yousif Shalaby', initials: 'YS', role: 'Frontend Architect', 
    primarySkill: 'Frontend', location: 'Onsite', department: 'Engineering', capacity: 100, startDate: '2024-01-01',
    allocations: [
      { id: 'yousif-1', resourceId: 'yousif', projectId: 'tohemmena', weekNumber: 49, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
      { id: 'yousif-2', resourceId: 'yousif', projectId: 'tohemmena', weekNumber: 50, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
      { id: 'yousif-3', resourceId: 'yousif', projectId: 'tohemmena', weekNumber: 51, year: 2025, percentage: 100, type: 'HARD', createdAt: '2024-11-30' },
    ],
    createdAt: '2024-01-01', updatedAt: '2024-11-30'
  },
];

export const MOCK_VACANCIES: Vacancy[] = [
  {
    id: 'vacancy-1',
    projectId: 'proj-1',
    skill: 'Data Engineer',
    proficiencyLevel: 'Advanced',
    percentageNeeded: 100,
    location: 'Any',
    startWeek: 50,
    endWeek: 4,
    year: 2024,
    severity: 'high',
    status: 'OPEN'
  },
  {
    id: 'vacancy-2',
    projectId: 'proj-2',
    skill: 'QA Tester',
    proficiencyLevel: 'Intermediate',
    percentageNeeded: 50,
    location: 'Any',
    startWeek: 51,
    endWeek: 6,
    year: 2024,
    severity: 'medium',
    status: 'OPEN'
  }
];
