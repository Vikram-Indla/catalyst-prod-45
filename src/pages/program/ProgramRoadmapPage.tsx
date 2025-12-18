/**
 * Program Roadmap Page
 * Based on catalyst-epic-roadmap-daily.html
 * 
 * Changes from original:
 * 1. Title: "Program Roadmap" (not Epic Roadmap)
 * 2. Toolbar: Search → My Projects → Group by → Filters (left), Milestones + Year + Info (right)
 * 3. No quick toggle chips
 * 4. Tooltip: "Linked Features" (open only, scrollable) instead of "Milestones"
 * 5. List header: "PROGRAMS" (not EPICS)
 * 
 * Stability pass done: no blanking, no spinners, single header.
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ProgramPageLayout } from '@/components/program/ProgramPageLayout';
import { Search, Home, Filter, Info, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ===== TYPES =====
interface LinkedFeature {
  key: string;
  title: string;
  status: 'Open' | 'In Progress' | 'Done' | 'Closed';
}

interface Milestone {
  title: string;
  date: string;
  status: 'complete' | 'current' | 'pending' | 'overdue';
}

interface ProgramItem {
  id: number;
  key: string;
  title: string;
  owner: string;
  platform: string;
  health: 'On Track' | 'At Risk' | 'Blocked';
  status: 'Draft' | 'Active' | 'Completed' | 'On Hold';
  startDate: string;
  endDate: string;
  progress: number;
  linkedProjects: string[];
  milestones: Milestone[];
  linkedFeatures: LinkedFeature[];
  hasDependencies?: boolean;
  isBlocked?: boolean;
  isBlocking?: boolean;
}

interface Project {
  id: string;
  name: string;
}

interface Quarter {
  label: string;
  start: Date;
  end: Date;
}

interface ProgramFilters {
  owners: string[];
  linkedProjects: string[];
  status: string[];
  health: string[];
  activeInPeriod: string | null;
  overdueOnly: boolean;
  hasDependencies: boolean | null;
  blockedOrBlocking: boolean | null;
  hasLinkedFeatures: boolean | null;
  featureStatusOpenOnly: boolean;
}

// ===== MOCK DATA =====
const TODAY = new Date('2025-11-15');

const PROJECTS: Project[] = [
  { id: 'proj-1', name: 'Investor Portal' },
  { id: 'proj-2', name: 'Licensing System' },
  { id: 'proj-3', name: 'Analytics Hub' },
  { id: 'proj-4', name: 'Mobile App' }
];

const OWNERS = ['Vikram Indla', 'Sarah Chen', 'Ahmed Khalid', 'Layla Hassan', 'Omar Farooq', 'Fatima Al-Rashid', 'Mohammed Al-Saud'];
const PROGRAM_STATUSES = ['Draft', 'Active', 'Completed', 'On Hold'] as const;
const HEALTH_STATUSES = ['On Track', 'At Risk', 'Blocked'] as const;
const ACTIVE_IN_PERIOD_OPTIONS = ['This Quarter', 'Next Quarter', 'Custom Range'] as const;

const DEFAULT_FILTERS: ProgramFilters = {
  owners: [],
  linkedProjects: [],
  status: [],
  health: [],
  activeInPeriod: null,
  overdueOnly: false,
  hasDependencies: null,
  blockedOrBlocking: null,
  hasLinkedFeatures: null,
  featureStatusOpenOnly: false,
};

const PROGRAMS: ProgramItem[] = [
  {
    id: 1, key: 'PRG-101', title: 'Digital Identity Verification',
    owner: 'Vikram Indla', platform: 'Seneai Platform', health: 'On Track', status: 'Active',
    startDate: '2025-01-15', endDate: '2025-09-30', progress: 82,
    linkedProjects: ['proj-1', 'proj-2'], hasDependencies: true, isBlocked: false, isBlocking: false,
    milestones: [
      { title: 'Architecture Design', date: '2025-02-28', status: 'complete' },
      { title: 'API Integration', date: '2025-05-15', status: 'complete' },
      { title: 'Security Audit', date: '2025-07-31', status: 'complete' },
      { title: 'Production Release', date: '2025-09-30', status: 'complete' }
    ],
    linkedFeatures: [
      { key: 'FTR-201', title: 'Biometric Authentication Module', status: 'In Progress' },
      { key: 'FTR-202', title: 'Document Verification API', status: 'Open' },
      { key: 'FTR-203', title: 'KYC Workflow Engine', status: 'In Progress' },
      { key: 'FTR-204', title: 'Risk Assessment Dashboard', status: 'Open' },
      { key: 'FTR-205', title: 'Compliance Report Generator', status: 'Done' }
    ]
  },
  {
    id: 2, key: 'PRG-102', title: 'Investor Portal Enhancement',
    owner: 'Sarah Chen', platform: 'Core Platform', health: 'At Risk', status: 'Active',
    startDate: '2025-01-01', endDate: '2025-12-31', progress: 48,
    linkedProjects: ['proj-1', 'proj-4'], hasDependencies: true, isBlocked: false, isBlocking: true,
    milestones: [
      { title: 'UX Research', date: '2025-03-15', status: 'complete' },
      { title: 'Phase 1 Launch', date: '2025-06-30', status: 'complete' },
      { title: 'Phase 2 Features', date: '2025-09-30', status: 'overdue' },
      { title: 'Full Rollout', date: '2025-12-31', status: 'pending' }
    ],
    linkedFeatures: [
      { key: 'FTR-301', title: 'Portfolio Dashboard Redesign', status: 'In Progress' },
      { key: 'FTR-302', title: 'Real-time Investment Tracking', status: 'Open' },
      { key: 'FTR-303', title: 'Dividend Calculator Widget', status: 'Open' },
      { key: 'FTR-304', title: 'Tax Report Generation', status: 'In Progress' },
      { key: 'FTR-305', title: 'Mobile Push Notifications', status: 'Open' },
      { key: 'FTR-306', title: 'Document Upload Portal', status: 'In Progress' },
      { key: 'FTR-307', title: 'Secure Messaging System', status: 'Open' },
      { key: 'FTR-308', title: 'Investment Performance Charts', status: 'Done' }
    ]
  },
  {
    id: 3, key: 'PRG-103', title: 'Regulatory Compliance Engine',
    owner: 'Ahmed Khalid', platform: 'Seneai Platform', health: 'On Track', status: 'Completed',
    startDate: '2025-01-10', endDate: '2025-07-30', progress: 100,
    linkedProjects: ['proj-2'], hasDependencies: false, isBlocked: false, isBlocking: false,
    milestones: [
      { title: 'Rules Engine', date: '2025-03-01', status: 'complete' },
      { title: 'Integration Testing', date: '2025-05-15', status: 'complete' },
      { title: 'UAT Sign-off', date: '2025-06-30', status: 'complete' },
      { title: 'Go Live', date: '2025-07-30', status: 'complete' }
    ],
    linkedFeatures: [
      { key: 'FTR-401', title: 'Rules Configuration Panel', status: 'Done' },
      { key: 'FTR-402', title: 'Audit Trail Module', status: 'Done' },
      { key: 'FTR-403', title: 'Violation Alert System', status: 'Closed' }
    ]
  },
  {
    id: 4, key: 'PRG-104', title: 'Industrial Marketplace',
    owner: 'Layla Hassan', platform: 'Innovation Platform', health: 'At Risk', status: 'Active',
    startDate: '2025-01-01', endDate: '2025-12-31', progress: 35,
    linkedProjects: ['proj-3'], hasDependencies: true, isBlocked: true, isBlocking: false,
    milestones: [
      { title: 'Vendor Onboarding', date: '2025-04-30', status: 'complete' },
      { title: 'Catalog MVP', date: '2025-07-31', status: 'overdue' },
      { title: 'Payment Integration', date: '2025-10-31', status: 'current' },
      { title: 'Launch', date: '2025-12-31', status: 'pending' }
    ],
    linkedFeatures: [
      { key: 'FTR-501', title: 'Vendor Registration Flow', status: 'Open' },
      { key: 'FTR-502', title: 'Product Catalog Management', status: 'In Progress' },
      { key: 'FTR-503', title: 'Search & Filter Engine', status: 'Open' },
      { key: 'FTR-504', title: 'Shopping Cart Module', status: 'Open' },
      { key: 'FTR-505', title: 'Order Management System', status: 'In Progress' },
      { key: 'FTR-506', title: 'Payment Gateway Integration', status: 'Open' },
      { key: 'FTR-507', title: 'Vendor Analytics Dashboard', status: 'Open' },
      { key: 'FTR-508', title: 'Rating & Review System', status: 'Open' },
      { key: 'FTR-509', title: 'Inventory Sync API', status: 'In Progress' },
      { key: 'FTR-510', title: 'Bulk Import Tool', status: 'Open' },
      { key: 'FTR-511', title: 'Notification Center', status: 'Open' },
      { key: 'FTR-512', title: 'Customer Support Chat', status: 'Open' }
    ]
  },
  {
    id: 5, key: 'PRG-105', title: 'Smart Document Processing',
    owner: 'Omar Farooq', platform: 'Seneai Platform', health: 'On Track', status: 'Active',
    startDate: '2025-04-01', endDate: '2026-03-31', progress: 28,
    linkedProjects: ['proj-1', 'proj-2', 'proj-3'], hasDependencies: false, isBlocked: false, isBlocking: false,
    milestones: [
      { title: 'OCR Engine', date: '2025-05-31', status: 'complete' },
      { title: 'ML Training', date: '2025-09-30', status: 'complete' },
      { title: 'Arabic Support', date: '2025-12-31', status: 'current' },
      { title: 'Deployment', date: '2026-03-31', status: 'pending' }
    ],
    linkedFeatures: [
      { key: 'FTR-601', title: 'OCR Processing Pipeline', status: 'In Progress' },
      { key: 'FTR-602', title: 'Document Classification Model', status: 'Open' },
      { key: 'FTR-603', title: 'Arabic Text Extraction', status: 'Open' },
      { key: 'FTR-604', title: 'Template Matching System', status: 'In Progress' }
    ]
  },
  {
    id: 6, key: 'PRG-106', title: 'Workflow Automation Suite',
    owner: 'Fatima Al-Rashid', platform: 'Core Platform', health: 'On Track', status: 'Active',
    startDate: '2025-03-01', endDate: '2025-11-30', progress: 70,
    linkedProjects: ['proj-2', 'proj-3'], hasDependencies: true, isBlocked: false, isBlocking: false,
    milestones: [
      { title: 'Process Mapping', date: '2025-04-30', status: 'complete' },
      { title: 'Automation Engine', date: '2025-07-31', status: 'complete' },
      { title: 'User Training', date: '2025-10-31', status: 'current' },
      { title: 'Full Deploy', date: '2025-11-30', status: 'pending' }
    ],
    linkedFeatures: [
      { key: 'FTR-701', title: 'Visual Workflow Builder', status: 'In Progress' },
      { key: 'FTR-702', title: 'Task Assignment Engine', status: 'Open' },
      { key: 'FTR-703', title: 'SLA Monitoring Dashboard', status: 'Open' }
    ]
  },
  {
    id: 7, key: 'PRG-107', title: 'Investment Tracking Dashboard',
    owner: 'Mohammed Al-Saud', platform: 'Innovation Platform', health: 'On Track', status: 'Draft',
    startDate: '2025-06-01', endDate: '2026-02-28', progress: 22,
    linkedProjects: ['proj-1', 'proj-3'], hasDependencies: false, isBlocked: false, isBlocking: false,
    milestones: [
      { title: 'Requirements', date: '2025-07-15', status: 'complete' },
      { title: 'Wireframes', date: '2025-09-30', status: 'complete' },
      { title: 'Data Integration', date: '2025-12-31', status: 'current' },
      { title: 'Beta Release', date: '2026-02-28', status: 'pending' }
    ],
    linkedFeatures: [
      { key: 'FTR-801', title: 'Portfolio Overview Widget', status: 'In Progress' },
      { key: 'FTR-802', title: 'Performance Comparison Tool', status: 'Open' },
      { key: 'FTR-803', title: 'Custom Report Builder', status: 'Open' },
      { key: 'FTR-804', title: 'Export to Excel/PDF', status: 'Open' },
      { key: 'FTR-805', title: 'Data Refresh Scheduler', status: 'In Progress' }
    ]
  },
  {
    id: 8, key: 'PRG-108', title: 'Partner Integration Hub',
    owner: 'Vikram Indla', platform: 'Core Platform', health: 'Blocked', status: 'On Hold',
    startDate: '2025-02-15', endDate: '2025-10-15', progress: 55,
    linkedProjects: ['proj-4'], hasDependencies: true, isBlocked: true, isBlocking: true,
    milestones: [
      { title: 'API Spec', date: '2025-03-31', status: 'complete' },
      { title: 'Partner SDK', date: '2025-06-30', status: 'complete' },
      { title: 'Certification', date: '2025-08-31', status: 'overdue' },
      { title: 'Hub Launch', date: '2025-10-15', status: 'pending' }
    ],
    linkedFeatures: [
      { key: 'FTR-901', title: 'Partner Registration Portal', status: 'In Progress' },
      { key: 'FTR-902', title: 'API Key Management', status: 'Open' },
      { key: 'FTR-903', title: 'Webhook Configuration', status: 'Open' }
    ]
  },
  {
    id: 9, key: 'PRG-109', title: 'Analytics & Reporting Platform',
    owner: 'Sarah Chen', platform: 'Seneai Platform', health: 'On Track', status: 'Active',
    startDate: '2025-07-01', endDate: '2026-06-30', progress: 8,
    linkedProjects: ['proj-3'], hasDependencies: false, isBlocked: false, isBlocking: false,
    milestones: [
      { title: 'Data Model', date: '2025-09-30', status: 'complete' },
      { title: 'ETL Pipeline', date: '2025-12-31', status: 'current' },
      { title: 'Dashboard Suite', date: '2026-03-31', status: 'pending' },
      { title: 'Self-Service BI', date: '2026-06-30', status: 'pending' }
    ],
    linkedFeatures: [
      { key: 'FTR-1001', title: 'Data Warehouse Schema', status: 'In Progress' },
      { key: 'FTR-1002', title: 'ETL Job Orchestrator', status: 'Open' },
      { key: 'FTR-1003', title: 'Query Performance Monitor', status: 'Open' }
    ]
  },
  {
    id: 10, key: 'PRG-110', title: 'Mobile App Refresh',
    owner: 'Ahmed Khalid', platform: 'Innovation Platform', health: 'On Track', status: 'Draft',
    startDate: '2025-09-01', endDate: '2026-04-30', progress: 5,
    linkedProjects: ['proj-1', 'proj-4'], hasDependencies: false, isBlocked: false, isBlocking: false,
    milestones: [
      { title: 'Design System', date: '2025-11-30', status: 'current' },
      { title: 'iOS Dev', date: '2026-02-28', status: 'pending' },
      { title: 'Android Dev', date: '2026-03-31', status: 'pending' },
      { title: 'App Store', date: '2026-04-30', status: 'pending' }
    ],
    linkedFeatures: [
      { key: 'FTR-1101', title: 'New Design System Components', status: 'In Progress' },
      { key: 'FTR-1102', title: 'Dark Mode Support', status: 'Open' },
      { key: 'FTR-1103', title: 'Biometric Login', status: 'Open' },
      { key: 'FTR-1104', title: 'Offline Mode', status: 'Open' },
      { key: 'FTR-1105', title: 'Push Notification Revamp', status: 'Open' },
      { key: 'FTR-1106', title: 'Performance Optimization', status: 'Open' }
    ]
  }
];

const QUARTERS: Quarter[] = [
  { label: 'Q1 2025', start: new Date('2025-01-01'), end: new Date('2025-03-31') },
  { label: 'Q2 2025', start: new Date('2025-04-01'), end: new Date('2025-06-30') },
  { label: 'Q3 2025', start: new Date('2025-07-01'), end: new Date('2025-09-30') },
  { label: 'Q4 2025', start: new Date('2025-10-01'), end: new Date('2025-12-31') },
  { label: 'Q1 2026', start: new Date('2026-01-01'), end: new Date('2026-03-31') },
  { label: 'Q2 2026', start: new Date('2026-04-01'), end: new Date('2026-06-30') }
];

// ===== UTILITIES =====
function parseDate(str: string): Date {
  return new Date(str);
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} → ${formatDate(end)}`;
}

function getHealthClass(health: string): string {
  if (health === 'On Track') return 'on-track';
  if (health === 'At Risk') return 'at-risk';
  if (health === 'Blocked') return 'blocked';
  return 'on-track';
}

function getOwnerInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getProjectName(id: string): string {
  const p = PROJECTS.find(proj => proj.id === id);
  return p ? p.name : id;
}

function getTimelineStart(): Date {
  return QUARTERS[0].start;
}

function getTimelineEnd(): Date {
  return QUARTERS[QUARTERS.length - 1].end;
}

function dateToPercent(date: Date | string): number {
  const d = typeof date === 'string' ? parseDate(date) : date;
  const start = getTimelineStart();
  const end = getTimelineEnd();
  const total = end.getTime() - start.getTime();
  const offset = d.getTime() - start.getTime();
  return Math.max(0, Math.min(100, (offset / total) * 100));
}

function getTodayPercent(): number {
  return dateToPercent(TODAY);
}

// ===== COMPONENT =====
export default function ProgramRoadmapPage() {
  const { programId } = useParams<{ programId: string }>();
  
  // State
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<'platform' | 'owner' | 'health'>('platform');
  const [showMilestones, setShowMilestones] = useState(true);
  const [year, setYear] = useState('2025');
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  // Filter state
  const [filters, setFilters] = useState<ProgramFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<ProgramFilters>(DEFAULT_FILTERS);
  
  // Dropdown states
  const [projectsMenuOpen, setProjectsMenuOpen] = useState(false);
  const [groupByMenuOpen, setGroupByMenuOpen] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const [filtersMenuOpen, setFiltersMenuOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState<{ visible: boolean; program: ProgramItem | null; x: number; y: number }>({
    visible: false,
    program: null,
    x: 0,
    y: 0
  });
  
  // Refs for scroll sync
  const listBodyRef = useRef<HTMLDivElement>(null);
  const timelineBodyRef = useRef<HTMLDivElement>(null);
  
  // Helper to check if program is overdue
  const isProgramOverdue = (program: ProgramItem): boolean => {
    const endDate = parseDate(program.endDate);
    return endDate < TODAY && program.progress < 100;
  };
  
  // Helper to check if program is active in a period
  const isProgramActiveInPeriod = (program: ProgramItem, period: string | null): boolean => {
    if (!period) return true;
    const start = parseDate(program.startDate);
    const end = parseDate(program.endDate);
    
    if (period === 'This Quarter') {
      const q4Start = new Date('2025-10-01');
      const q4End = new Date('2025-12-31');
      return start <= q4End && end >= q4Start;
    }
    if (period === 'Next Quarter') {
      const q1Start = new Date('2026-01-01');
      const q1End = new Date('2026-03-31');
      return start <= q1End && end >= q1Start;
    }
    return true;
  };
  
  // Helper to check if program has open features only
  const hasOnlyOpenFeatures = (program: ProgramItem): boolean => {
    const openFeatures = program.linkedFeatures.filter(f => f.status === 'Open' || f.status === 'In Progress');
    return openFeatures.length > 0;
  };
  
  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.owners.length > 0) count += filters.owners.length;
    if (filters.linkedProjects.length > 0) count += filters.linkedProjects.length;
    if (filters.status.length > 0) count += filters.status.length;
    if (filters.health.length > 0) count += filters.health.length;
    if (filters.activeInPeriod) count += 1;
    if (filters.overdueOnly) count += 1;
    if (filters.hasDependencies !== null) count += 1;
    if (filters.blockedOrBlocking !== null) count += 1;
    if (filters.hasLinkedFeatures !== null) count += 1;
    if (filters.featureStatusOpenOnly) count += 1;
    return count;
  }, [filters]);
  
  // Filter programs
  const filteredPrograms = useMemo(() => {
    let filtered = [...PROGRAMS];
    
    // Text search
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.key.toLowerCase().includes(s) ||
        p.title.toLowerCase().includes(s) ||
        p.owner.toLowerCase().includes(s)
      );
    }
    
    // Owner filter
    if (filters.owners.length > 0) {
      filtered = filtered.filter(p => filters.owners.includes(p.owner));
    }
    
    // Linked Project filter
    if (filters.linkedProjects.length > 0) {
      filtered = filtered.filter(p => 
        p.linkedProjects.some(proj => filters.linkedProjects.includes(proj))
      );
    }
    
    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(p => filters.status.includes(p.status));
    }
    
    // Health filter
    if (filters.health.length > 0) {
      filtered = filtered.filter(p => filters.health.includes(p.health));
    }
    
    // Active in period filter
    if (filters.activeInPeriod) {
      filtered = filtered.filter(p => isProgramActiveInPeriod(p, filters.activeInPeriod));
    }
    
    // Overdue filter
    if (filters.overdueOnly) {
      filtered = filtered.filter(p => isProgramOverdue(p));
    }
    
    // Has Dependencies filter
    if (filters.hasDependencies !== null) {
      filtered = filtered.filter(p => p.hasDependencies === filters.hasDependencies);
    }
    
    // Blocked / Blocking filter
    if (filters.blockedOrBlocking !== null) {
      filtered = filtered.filter(p => 
        filters.blockedOrBlocking ? (p.isBlocked || p.isBlocking) : (!p.isBlocked && !p.isBlocking)
      );
    }
    
    // Has Linked Features filter
    if (filters.hasLinkedFeatures !== null) {
      filtered = filtered.filter(p => 
        filters.hasLinkedFeatures ? p.linkedFeatures.length > 0 : p.linkedFeatures.length === 0
      );
    }
    
    // Feature Status (Open only) filter
    if (filters.featureStatusOpenOnly) {
      filtered = filtered.filter(p => hasOnlyOpenFeatures(p));
    }
    
    return filtered;
  }, [search, filters]);
  
  // Handle filter apply
  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setFiltersMenuOpen(false);
  };
  
  // Handle filter reset
  const handleResetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
  };
  
  // Toggle multi-select filter
  const toggleFilterValue = (filterKey: keyof Pick<ProgramFilters, 'owners' | 'linkedProjects' | 'status' | 'health'>, value: string) => {
    setDraftFilters(prev => {
      const current = prev[filterKey] as string[];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [filterKey]: newValues };
    });
  };
  
  // Open filter panel - sync draft with current
  useEffect(() => {
    if (filtersMenuOpen) {
      setDraftFilters(filters);
    }
  }, [filtersMenuOpen]);
  
  // Group programs
  const groupedPrograms = useMemo(() => {
    const groups: Record<string, ProgramItem[]> = {};
    
    filteredPrograms.forEach(program => {
      let key: string;
      if (groupBy === 'platform') key = program.platform;
      else if (groupBy === 'owner') key = program.owner;
      else if (groupBy === 'health') key = program.health;
      else key = 'All';
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(program);
    });
    
    return Object.entries(groups).map(([key, programs]) => ({ key, programs }));
  }, [filteredPrograms, groupBy]);
  
  // Toggle group collapse
  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  
  // Toggle project selection
  const toggleProject = useCallback((id: string) => {
    setSelectedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  
  // Scroll sync
  const handleListScroll = useCallback(() => {
    if (listBodyRef.current && timelineBodyRef.current) {
      timelineBodyRef.current.scrollTop = listBodyRef.current.scrollTop;
    }
  }, []);
  
  const handleTimelineScroll = useCallback(() => {
    if (listBodyRef.current && timelineBodyRef.current) {
      listBodyRef.current.scrollTop = timelineBodyRef.current.scrollTop;
    }
  }, []);
  
  // Tooltip handlers
  const showTooltip = useCallback((e: React.MouseEvent, program: ProgramItem) => {
    setTooltip({
      visible: true,
      program,
      x: e.clientX + 16,
      y: e.clientY + 16
    });
  }, []);
  
  const moveTooltip = useCallback((e: React.MouseEvent) => {
    if (!tooltip.visible) return;
    
    let x = e.clientX + 16;
    let y = e.clientY + 16;
    
    // Keep tooltip on screen
    if (x + 300 > window.innerWidth - 20) x = e.clientX - 316;
    if (y + 400 > window.innerHeight - 20) y = e.clientY - 400;
    
    setTooltip(prev => ({ ...prev, x, y }));
  }, [tooltip.visible]);
  
  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);
  
  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = () => {
      setProjectsMenuOpen(false);
      setGroupByMenuOpen(false);
      setYearMenuOpen(false);
      setFiltersMenuOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  
  // Get open features only for tooltip
  const getOpenFeatures = (program: ProgramItem): LinkedFeature[] => {
    return program.linkedFeatures.filter(f => f.status !== 'Done' && f.status !== 'Closed');
  };
  
  const todayPercent = getTodayPercent();
  
  return (
    <ProgramPageLayout>
      <div className="flex flex-col h-full bg-background overflow-hidden">
        {/* Page Header */}
        <div className="px-5 pt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
            <span>PROGRAM</span>
            <span>/</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Program Roadmap</h1>
        </div>
        
        {/* Toolbar - Matches Image 1 layout */}
        <div className="px-5 py-3 flex items-center gap-2.5 flex-wrap">
          {/* LEFT: Search → My Projects → Group by → Filters */}
          <div className="relative w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search programs..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>
          
          {/* My Projects Dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setProjectsMenuOpen(!projectsMenuOpen);
                setGroupByMenuOpen(false);
                setYearMenuOpen(false);
                setFiltersMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg bg-background hover:bg-muted transition-colors"
            >
              <Home className="h-4 w-4 text-muted-foreground" />
              <span>My Projects</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            
            {projectsMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-[220px] bg-background border border-border rounded-lg shadow-lg z-50 p-2">
                {PROJECTS.map(project => (
                  <div
                    key={project.id}
                    onClick={() => toggleProject(project.id)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-muted cursor-pointer"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                      selectedProjects.has(project.id)
                        ? "bg-brand-primary border-brand-primary"
                        : "border-border"
                    )}>
                      {selectedProjects.has(project.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm">{project.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Group by Dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setGroupByMenuOpen(!groupByMenuOpen);
                setProjectsMenuOpen(false);
                setYearMenuOpen(false);
                setFiltersMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg bg-background hover:bg-muted transition-colors"
            >
              <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18"/>
              </svg>
              <span>Group by</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            
            {groupByMenuOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-background border border-border rounded-lg shadow-lg z-50">
                {[
                  { value: 'platform', label: 'Delivery Platform' },
                  { value: 'owner', label: 'Program Owner' },
                  { value: 'health', label: 'Health' }
                ].map(option => (
                  <div
                    key={option.value}
                    onClick={() => {
                      setGroupBy(option.value as typeof groupBy);
                      setCollapsedGroups(new Set());
                      setGroupByMenuOpen(false);
                    }}
                    className={cn(
                      "px-3 py-2.5 text-sm cursor-pointer first:rounded-t-lg last:rounded-b-lg",
                      groupBy === option.value
                        ? "bg-brand-primary-muted text-brand-primary font-medium"
                        : "hover:bg-muted"
                    )}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Filters Button */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setFiltersMenuOpen(!filtersMenuOpen);
                setProjectsMenuOpen(false);
                setGroupByMenuOpen(false);
                setYearMenuOpen(false);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors",
                activeFilterCount > 0
                  ? "border-brand-primary bg-brand-primary-muted text-brand-primary"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-brand-primary text-white rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            
            {filtersMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-[380px] bg-background border border-border rounded-lg shadow-lg z-50 max-h-[70vh] overflow-auto">
                {/* Header */}
                <div className="sticky top-0 bg-background px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="font-semibold text-sm">Filters</span>
                  <button
                    onClick={() => setFiltersMenuOpen(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Program Owner */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Program Owner
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {OWNERS.map(owner => (
                        <button
                          key={owner}
                          onClick={() => toggleFilterValue('owners', owner)}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-full border transition-colors",
                            draftFilters.owners.includes(owner)
                              ? "bg-brand-primary text-white border-brand-primary"
                              : "bg-background border-border hover:bg-muted"
                          )}
                        >
                          {owner.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Linked Project */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Linked Project
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PROJECTS.map(proj => (
                        <button
                          key={proj.id}
                          onClick={() => toggleFilterValue('linkedProjects', proj.id)}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-full border transition-colors",
                            draftFilters.linkedProjects.includes(proj.id)
                              ? "bg-brand-primary text-white border-brand-primary"
                              : "bg-background border-border hover:bg-muted"
                          )}
                        >
                          {proj.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Program Status */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Program Status
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PROGRAM_STATUSES.map(status => (
                        <button
                          key={status}
                          onClick={() => toggleFilterValue('status', status)}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-full border transition-colors",
                            draftFilters.status.includes(status)
                              ? "bg-brand-primary text-white border-brand-primary"
                              : "bg-background border-border hover:bg-muted"
                          )}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Health Status */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Health Status
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {HEALTH_STATUSES.map(health => (
                        <button
                          key={health}
                          onClick={() => toggleFilterValue('health', health)}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-full border transition-colors flex items-center gap-1.5",
                            draftFilters.health.includes(health)
                              ? "bg-brand-primary text-white border-brand-primary"
                              : "bg-background border-border hover:bg-muted"
                          )}
                        >
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            health === 'On Track' && "bg-brand-primary",
                            health === 'At Risk' && "bg-secondary-bronze",
                            health === 'Blocked' && "bg-destructive",
                            draftFilters.health.includes(health) && "bg-white"
                          )} />
                          {health}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Active In Period */}
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Active In Period
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ACTIVE_IN_PERIOD_OPTIONS.map(period => (
                        <button
                          key={period}
                          onClick={() => setDraftFilters(prev => ({
                            ...prev,
                            activeInPeriod: prev.activeInPeriod === period ? null : period
                          }))}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-full border transition-colors",
                            draftFilters.activeInPeriod === period
                              ? "bg-brand-primary text-white border-brand-primary"
                              : "bg-background border-border hover:bg-muted"
                          )}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Boolean Filters */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    {/* Overdue Programs */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftFilters.overdueOnly}
                        onChange={(e) => setDraftFilters(prev => ({ ...prev, overdueOnly: e.target.checked }))}
                        className="w-4 h-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="text-sm">Overdue Programs</span>
                    </label>
                    
                    {/* Has Dependencies */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftFilters.hasDependencies === true}
                        onChange={(e) => setDraftFilters(prev => ({ 
                          ...prev, 
                          hasDependencies: e.target.checked ? true : null 
                        }))}
                        className="w-4 h-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="text-sm">Has Dependencies</span>
                    </label>
                    
                    {/* Blocked / Blocking */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftFilters.blockedOrBlocking === true}
                        onChange={(e) => setDraftFilters(prev => ({ 
                          ...prev, 
                          blockedOrBlocking: e.target.checked ? true : null 
                        }))}
                        className="w-4 h-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="text-sm">Blocked / Blocking Programs</span>
                    </label>
                    
                    {/* Has Linked Features */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftFilters.hasLinkedFeatures === true}
                        onChange={(e) => setDraftFilters(prev => ({ 
                          ...prev, 
                          hasLinkedFeatures: e.target.checked ? true : null 
                        }))}
                        className="w-4 h-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="text-sm">Has Linked Features</span>
                    </label>
                    
                    {/* Feature Status (Open only) */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftFilters.featureStatusOpenOnly}
                        onChange={(e) => setDraftFilters(prev => ({ ...prev, featureStatusOpenOnly: e.target.checked }))}
                        className="w-4 h-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="text-sm">Feature Status (Open only)</span>
                    </label>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="sticky bottom-0 bg-background px-4 py-3 border-t border-border flex items-center justify-between gap-2">
                  <button
                    onClick={handleResetFilters}
                    className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="px-4 py-1.5 text-sm bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* RIGHT: Milestones toggle + Year + Info */}
          <div className="ml-auto flex items-center gap-3">
            {/* Milestones Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">Milestones</span>
              <button
                onClick={() => setShowMilestones(!showMilestones)}
                className={cn(
                  "w-10 h-[22px] rounded-full relative transition-colors",
                  showMilestones ? "bg-brand-primary" : "bg-border"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform",
                  showMilestones ? "translate-x-[20px]" : "translate-x-0.5"
                )} />
              </button>
            </div>
            
            {/* Year Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setYearMenuOpen(!yearMenuOpen);
                  setProjectsMenuOpen(false);
                  setGroupByMenuOpen(false);
                  setFiltersMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg bg-background hover:bg-muted transition-colors"
              >
                <span>{year}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              
              {yearMenuOpen && (
                <div className="absolute top-full right-0 mt-1 min-w-[100px] bg-background border border-border rounded-lg shadow-lg z-50">
                  {['2025', '2026'].map(y => (
                    <div
                      key={y}
                      onClick={() => {
                        setYear(y);
                        setYearMenuOpen(false);
                      }}
                      className={cn(
                        "px-3 py-2.5 text-sm cursor-pointer first:rounded-t-lg last:rounded-b-lg",
                        year === y
                          ? "bg-brand-primary-muted text-brand-primary font-medium"
                          : "hover:bg-muted"
                      )}
                    >
                      {y}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Info Button */}
            <button
              onClick={() => setLegendOpen(!legendOpen)}
              className="w-9 h-9 flex items-center justify-center border border-border rounded-full bg-background hover:bg-muted transition-colors"
            >
              <Info className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        
        {/* Roadmap Container */}
        <div className="flex-1 flex overflow-hidden border-t border-border">
          {/* Left List Panel */}
          <div className="w-[36%] min-w-[340px] max-w-[480px] border-r border-border flex flex-col">
            <div className="h-10 px-4 flex items-center border-b border-border bg-background">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                PROGRAMS
              </span>
            </div>
            
            <div
              ref={listBodyRef}
              onScroll={handleListScroll}
              className="flex-1 overflow-y-auto"
            >
              {groupedPrograms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-4xl opacity-40 mb-3">📋</div>
                  <div className="text-sm text-muted-foreground">No programs match your filters</div>
                </div>
              ) : (
                groupedPrograms.map(group => {
                  const isCollapsed = collapsedGroups.has(group.key);
                  
                  return (
                    <React.Fragment key={group.key}>
                      {/* Group Header */}
                      <div
                        onClick={() => toggleGroup(group.key)}
                        className="h-11 px-3 pl-4 flex items-center gap-2 border-b border-border bg-muted/50 cursor-pointer hover:bg-muted"
                      >
                        <div className={cn(
                          "w-5 h-5 flex items-center justify-center text-muted-foreground text-xs transition-transform",
                          isCollapsed && "-rotate-90"
                        )}>
                          ▾
                        </div>
                        <div className="w-[3px] h-6 rounded bg-brand-primary" />
                        <div className="flex-1">
                          <div className="text-[13px] font-semibold text-foreground">{group.key}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {group.programs.length} program{group.programs.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                      </div>
                      
                      {/* Program Rows */}
                      {!isCollapsed && group.programs.map(program => {
                        const linkedCount = program.linkedProjects.length;
                        const isMyProject = program.linkedProjects.some(p => selectedProjects.has(p));
                        
                        return (
                          <div
                            key={program.id}
                            onMouseEnter={(e) => showTooltip(e, program)}
                            onMouseMove={moveTooltip}
                            onMouseLeave={hideTooltip}
                            className="h-14 px-3 pl-4 flex items-center gap-2.5 border-b border-border bg-background cursor-pointer hover:bg-muted"
                          >
                            {/* Icon */}
                            <div className="w-7 h-7 rounded-full border-2 border-brand-primary flex items-center justify-center flex-shrink-0">
                              <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium text-foreground truncate">
                                {program.title}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {formatDateRange(program.startDate, program.endDate)}
                              </div>
                            </div>
                            
                            {/* Project Impact */}
                            <div className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] flex-shrink-0",
                              isMyProject
                                ? "bg-brand-primary-muted text-brand-primary"
                                : "bg-muted text-muted-foreground"
                            )}>
                              <Home className="h-3 w-3" />
                              {linkedCount}
                            </div>
                            
                            {/* Owner */}
                            <div className="w-6 h-6 rounded-full bg-secondary-champagne flex items-center justify-center text-[10px] font-semibold text-secondary-bronze flex-shrink-0">
                              {getOwnerInitials(program.owner)}
                            </div>
                            
                            {/* Status */}
                            <div className={cn(
                              "px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide flex-shrink-0",
                              program.health === 'On Track' && "bg-brand-primary text-white",
                              program.health === 'At Risk' && "bg-secondary-bronze text-white",
                              program.health === 'Blocked' && "bg-destructive text-white"
                            )}>
                              {program.health.toUpperCase().replace(' ', '')}
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Right Timeline Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Timeline Header */}
            <div className="h-10 flex border-b border-border bg-background relative">
              {QUARTERS.map((q, i) => {
                const qStart = dateToPercent(q.start);
                const qEnd = dateToPercent(q.end);
                const showBadge = todayPercent >= qStart && todayPercent < qEnd;
                const badgePos = ((todayPercent - qStart) / (qEnd - qStart)) * 100;
                
                return (
                  <div
                    key={q.label}
                    className={cn(
                      "flex-1 min-w-[120px] flex items-center justify-center text-xs font-medium text-muted-foreground relative",
                      i < QUARTERS.length - 1 && "border-r border-border"
                    )}
                  >
                    {q.label}
                    {showBadge && (
                      <div
                        className="absolute top-1.5 bg-secondary-bronze text-white text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider z-10"
                        style={{ left: `${badgePos}%` }}
                      >
                        TODAY
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Timeline Body */}
            <div
              ref={timelineBodyRef}
              onScroll={handleTimelineScroll}
              className="flex-1 overflow-auto relative"
            >
              <div className="min-w-full relative">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {QUARTERS.map((q, i) => (
                    <div
                      key={q.label}
                      className={cn(
                        "flex-1 min-w-[120px]",
                        i < QUARTERS.length - 1 && "border-r border-border"
                      )}
                    />
                  ))}
                </div>
                
                {/* Today Line */}
                <div
                  className="absolute top-0 w-0.5 bg-secondary-bronze z-10 pointer-events-none"
                  style={{
                    left: `${todayPercent}%`,
                    height: `${groupedPrograms.reduce((acc, g) => {
                      const collapsed = collapsedGroups.has(g.key);
                      return acc + 44 + (collapsed ? 0 : g.programs.length * 56);
                    }, 0)}px`
                  }}
                />
                
                {/* Rows */}
                {groupedPrograms.map(group => {
                  const isCollapsed = collapsedGroups.has(group.key);
                  
                  return (
                    <React.Fragment key={group.key}>
                      {/* Group Row */}
                      <div className={cn(
                        "h-11 border-b border-border bg-muted/50",
                        isCollapsed && "hidden"
                      )} />
                      
                      {/* Program Rows */}
                      {!isCollapsed && group.programs.map(program => {
                        const startPct = dateToPercent(program.startDate);
                        const endPct = dateToPercent(program.endDate);
                        const width = endPct - startPct;
                        
                        return (
                          <div
                            key={program.id}
                            onMouseEnter={(e) => showTooltip(e, program)}
                            onMouseMove={moveTooltip}
                            onMouseLeave={hideTooltip}
                            className="h-14 border-b border-border bg-background relative hover:bg-muted cursor-pointer"
                          >
                            {/* Bar */}
                            <div
                              className="absolute top-1/2 -translate-y-1/2 h-1.5"
                              style={{ left: `${startPct}%`, width: `${width}%` }}
                            >
                              {/* Track */}
                              <div className="absolute inset-0 bg-brand-primary/20 rounded-sm" />
                              {/* Progress */}
                              <div
                                className="absolute left-0 top-0 h-full bg-brand-primary rounded-sm"
                                style={{ width: `${program.progress}%` }}
                              />
                            </div>
                            
                            {/* Milestones */}
                            {showMilestones && program.milestones.map((ms, i) => {
                              const msPct = dateToPercent(ms.date);
                              return (
                                <div
                                  key={i}
                                  className={cn(
                                    "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border-2 z-[3]",
                                    ms.status === 'complete' && "bg-brand-primary border-brand-primary",
                                    ms.status === 'current' && "bg-background border-brand-gold",
                                    ms.status === 'pending' && "bg-background border-secondary-champagne",
                                    ms.status === 'overdue' && "bg-destructive border-destructive"
                                  )}
                                  style={{ left: `${msPct}%` }}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Tooltip */}
        {tooltip.visible && tooltip.program && (
          <div
            className="fixed bg-background border border-border rounded-xl shadow-lg p-3.5 w-[300px] z-[1000] pointer-events-none"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {/* Header */}
            <div className="mb-2.5 pb-2.5 border-b border-border">
              <div className="text-[11px] font-semibold text-brand-primary mb-0.5">
                {tooltip.program.key}
              </div>
              <div className="text-sm font-semibold text-foreground">
                {tooltip.program.title}
              </div>
            </div>
            
            {/* Details */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Dates</span>
                <span className="font-medium text-foreground">
                  {formatDateRange(tooltip.program.startDate, tooltip.program.endDate)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Health</span>
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <div className={cn(
                    "w-3 h-3 rounded",
                    tooltip.program.health === 'On Track' && "bg-brand-primary",
                    tooltip.program.health === 'At Risk' && "bg-secondary-bronze",
                    tooltip.program.health === 'Blocked' && "bg-destructive"
                  )} />
                  {tooltip.program.health}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Owner</span>
                <span className="font-medium text-foreground">{tooltip.program.owner}</span>
              </div>
            </div>
            
            {/* Linked Projects */}
            <div className="mt-2.5 pt-2.5 border-t border-border">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Linked Projects
              </div>
              <div className="flex flex-wrap gap-1">
                {tooltip.program.linkedProjects.slice(0, 3).map(p => (
                  <span key={p} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-xl text-[11px] text-muted-foreground">
                    {getProjectName(p)}
                  </span>
                ))}
                {tooltip.program.linkedProjects.length > 3 && (
                  <span className="text-[11px] text-muted-foreground">
                    +{tooltip.program.linkedProjects.length - 3} more
                  </span>
                )}
              </div>
            </div>
            
            {/* LINKED FEATURES (Open only) — Critical change */}
            <div className="mt-2.5 pt-2.5 border-t border-border">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Linked Features
              </div>
              {(() => {
                const openFeatures = getOpenFeatures(tooltip.program);
                
                if (openFeatures.length === 0) {
                  return (
                    <div className="text-[11px] text-muted-foreground italic">
                      No open features
                    </div>
                  );
                }
                
                return (
                  <div className="max-h-[180px] overflow-auto pr-1.5 space-y-1">
                    {openFeatures.map(feature => (
                      <div key={feature.key} className="flex items-center gap-1.5 text-[11px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary flex-shrink-0" />
                        <span className="text-muted-foreground flex-shrink-0">{feature.key}</span>
                        <span className="text-foreground truncate flex-1">{feature.title}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-medium flex-shrink-0",
                          feature.status === 'Open' && "bg-muted text-muted-foreground",
                          feature.status === 'In Progress' && "bg-brand-gold/20 text-brand-gold"
                        )}>
                          {feature.status}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
        
        {/* Legend Panel - Two clear sections only */}
        {legendOpen && (
          <div className="fixed top-40 right-5 bg-background border border-border rounded-xl shadow-lg p-4 w-[200px] z-50">
            {/* Close button */}
            <button
              onClick={() => setLegendOpen(false)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            
            {/* Program Health Section */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Program Health
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-3.5 h-3.5 rounded-full bg-brand-primary flex-shrink-0" />
                  <span className="text-foreground">On Track</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-3.5 h-3.5 rounded-full bg-secondary-bronze flex-shrink-0" />
                  <span className="text-foreground">At Risk</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-3.5 h-3.5 rounded-full bg-destructive flex-shrink-0" />
                  <span className="text-foreground">Blocked</span>
                </div>
              </div>
            </div>
            
            {/* Divider */}
            <div className="border-t border-border mb-4" />
            
            {/* Milestones Section */}
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                Milestones
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-3 h-3 rotate-45 bg-brand-primary flex-shrink-0" />
                  <span className="text-foreground">Completed</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-3 h-3 rotate-45 border-2 border-brand-gold bg-background flex-shrink-0" />
                  <span className="text-foreground">Current</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="w-3 h-3 rotate-45 border-2 border-secondary-champagne bg-background flex-shrink-0" />
                  <span className="text-foreground">Pending</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProgramPageLayout>
  );
}
