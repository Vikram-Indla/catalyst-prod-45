/**
 * Capacity & Allocation Utility Functions
 * Following specification from LOVABLE-AI-PROMPT.md
 * Using ONLY Golden Hour palette colors
 */

import { Resource, Allocation, AllocationStatusInfo, CapacityProject } from '@/types/capacity';

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

// Mock data for initial implementation
export const MOCK_PROJECTS: CapacityProject[] = [
  { id: 'intl', name: 'International Relations', shortName: 'International', color: GOLDEN_HOUR.expert, status: 'Active' },
  { id: 'mim', name: 'MIM Website', shortName: 'MIM', color: GOLDEN_HOUR.advanced, status: 'Active' },
  { id: 'innov', name: 'Innovation Platform', shortName: 'Innovation', color: GOLDEN_HOUR.intermediate, status: 'Active' },
  { id: 'senaei', name: 'Senaei BAU-SS', shortName: 'Senaei', color: GOLDEN_HOUR.beginner, status: 'Active' },
  { id: 'mobile', name: 'Senaei Mobile', shortName: 'Mobile', color: GOLDEN_HOUR.expert, status: 'Active' },
  { id: 'icp', name: 'ICP Project', shortName: 'ICP', color: GOLDEN_HOUR.advanced, status: 'Active' },
];

export const MOCK_RESOURCES: Resource[] = [
  { 
    id: 'dreni', 
    name: 'Dreni Djini', 
    initials: 'DD', 
    role: 'Senior Frontend Developer', 
    primarySkill: 'Frontend', 
    location: 'Onsite', 
    department: 'Engineering',
    capacity: 100,
    startDate: '2024-01-01',
    allocations: [
      { id: 'a1', resourceId: 'dreni', projectId: 'intl', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a2', resourceId: 'dreni', projectId: 'mim', weekNumber: 49, year: 2025, percentage: 40, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a1b', resourceId: 'dreni', projectId: 'intl', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a2b', resourceId: 'dreni', projectId: 'mim', weekNumber: 50, year: 2025, percentage: 40, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a2c', resourceId: 'dreni', projectId: 'innov', weekNumber: 50, year: 2025, percentage: 20, type: 'SOFT', createdAt: '2024-12-01' },
      { id: 'a1c', resourceId: 'dreni', projectId: 'intl', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a2d', resourceId: 'dreni', projectId: 'mim', weekNumber: 51, year: 2025, percentage: 40, type: 'HARD', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-12-01'
  },
  { 
    id: 'faisal', 
    name: 'Faisal Javed', 
    initials: 'FJ', 
    role: 'Full Stack Developer', 
    primarySkill: 'Full Stack', 
    location: 'Onsite', 
    department: 'Engineering',
    capacity: 100,
    startDate: '2024-01-01',
    allocations: [
      { id: 'a3', resourceId: 'faisal', projectId: 'intl', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a4', resourceId: 'faisal', projectId: 'icp', weekNumber: 49, year: 2025, percentage: 50, type: 'SOFT', createdAt: '2024-12-01' },
      { id: 'a3b', resourceId: 'faisal', projectId: 'intl', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a4b', resourceId: 'faisal', projectId: 'icp', weekNumber: 50, year: 2025, percentage: 50, type: 'SOFT', createdAt: '2024-12-01' },
      { id: 'a3c', resourceId: 'faisal', projectId: 'intl', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a4c', resourceId: 'faisal', projectId: 'icp', weekNumber: 51, year: 2025, percentage: 50, type: 'SOFT', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-12-01'
  },
  { 
    id: 'andrew', 
    name: 'Andrew Fayyaz', 
    initials: 'AF', 
    role: 'Backend Developer', 
    primarySkill: 'Backend', 
    location: 'Onsite', 
    department: 'Engineering',
    capacity: 100,
    startDate: '2024-01-01',
    allocations: [
      { id: 'a5', resourceId: 'andrew', projectId: 'innov', weekNumber: 49, year: 2025, percentage: 30, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a6', resourceId: 'andrew', projectId: 'senaei', weekNumber: 49, year: 2025, percentage: 30, type: 'SOFT', createdAt: '2024-12-01' },
      { id: 'a5b', resourceId: 'andrew', projectId: 'innov', weekNumber: 50, year: 2025, percentage: 30, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a6b', resourceId: 'andrew', projectId: 'senaei', weekNumber: 50, year: 2025, percentage: 30, type: 'SOFT', createdAt: '2024-12-01' },
      { id: 'a5c', resourceId: 'andrew', projectId: 'innov', weekNumber: 51, year: 2025, percentage: 30, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a6c', resourceId: 'andrew', projectId: 'senaei', weekNumber: 51, year: 2025, percentage: 30, type: 'SOFT', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-12-01'
  },
  { 
    id: 'syed', 
    name: 'Syed Habib', 
    initials: 'SH', 
    role: 'DevOps Engineer', 
    primarySkill: 'DevOps', 
    location: 'Onsite', 
    department: 'Engineering',
    capacity: 100,
    startDate: '2024-01-01',
    allocations: [
      { id: 'a7', resourceId: 'syed', projectId: 'innov', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a8', resourceId: 'syed', projectId: 'senaei', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a7b', resourceId: 'syed', projectId: 'innov', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a8b', resourceId: 'syed', projectId: 'senaei', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a7c', resourceId: 'syed', projectId: 'innov', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a8c', resourceId: 'syed', projectId: 'senaei', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-12-01'
  },
  { 
    id: 'sikander', 
    name: 'Sikander Ahmad', 
    initials: 'SA', 
    role: 'Mobile Developer', 
    primarySkill: 'Frontend', 
    location: 'Onsite', 
    department: 'Engineering',
    capacity: 100,
    startDate: '2024-01-01',
    allocations: [
      { id: 'a9', resourceId: 'sikander', projectId: 'mobile', weekNumber: 49, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a10', resourceId: 'sikander', projectId: 'icp', weekNumber: 49, year: 2025, percentage: 25, type: 'SOFT', createdAt: '2024-12-01' },
      { id: 'a9b', resourceId: 'sikander', projectId: 'mobile', weekNumber: 50, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a10b', resourceId: 'sikander', projectId: 'icp', weekNumber: 50, year: 2025, percentage: 25, type: 'SOFT', createdAt: '2024-12-01' },
      { id: 'a9c', resourceId: 'sikander', projectId: 'mobile', weekNumber: 51, year: 2025, percentage: 50, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a10c', resourceId: 'sikander', projectId: 'icp', weekNumber: 51, year: 2025, percentage: 50, type: 'SOFT', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-12-01'
  },
  { 
    id: 'vikram', 
    name: 'Vikram Indla', 
    initials: 'VI', 
    role: 'Product Manager', 
    primarySkill: 'Product', 
    location: 'Onsite', 
    department: 'Product',
    capacity: 100,
    startDate: '2024-01-01',
    allocations: [
      { id: 'a11', resourceId: 'vikram', projectId: 'senaei', weekNumber: 49, year: 2025, percentage: 40, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a12', resourceId: 'vikram', projectId: 'icp', weekNumber: 49, year: 2025, percentage: 35, type: 'SOFT', createdAt: '2024-12-01' },
      { id: 'a11b', resourceId: 'vikram', projectId: 'senaei', weekNumber: 50, year: 2025, percentage: 40, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a12b', resourceId: 'vikram', projectId: 'icp', weekNumber: 50, year: 2025, percentage: 35, type: 'SOFT', createdAt: '2024-12-01' },
      { id: 'a11c', resourceId: 'vikram', projectId: 'senaei', weekNumber: 51, year: 2025, percentage: 40, type: 'HARD', createdAt: '2024-12-01' },
      { id: 'a12c', resourceId: 'vikram', projectId: 'icp', weekNumber: 51, year: 2025, percentage: 35, type: 'SOFT', createdAt: '2024-12-01' },
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-12-01'
  },
];

export const MOCK_VACANCIES = [
  { id: 'v1', projectId: 'senaei', skill: 'Backend', proficiencyLevel: 'Expert' as const, percentageNeeded: 50, location: 'Onsite' as const, startWeek: 50, endWeek: 4, year: 2024, severity: 'critical' as const, status: 'OPEN' as const },
  { id: 'v2', projectId: 'icp', skill: 'DevOps', proficiencyLevel: 'Advanced' as const, percentageNeeded: 30, location: 'Any' as const, startWeek: 50, endWeek: 8, year: 2024, severity: 'high' as const, status: 'OPEN' as const },
  { id: 'v3', projectId: 'innov', skill: 'QA', proficiencyLevel: 'Intermediate' as const, percentageNeeded: 25, location: 'Offshore' as const, startWeek: 51, endWeek: 2, year: 2024, severity: 'medium' as const, status: 'OPEN' as const },
];
