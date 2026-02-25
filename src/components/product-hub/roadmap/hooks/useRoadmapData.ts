/**
 * Product Roadmap — Mock data hook (Stage B: no DB queries yet)
 */
import { useMemo } from 'react';
import type { RoadmapInitiative, RoadmapStats } from '../types/roadmap.types';

const MOCK_INITIATIVES: RoadmapInitiative[] = [
  // ── Projects (5) ──
  { id: '1',  initiativeKey: 'MIM-001', title: 'نظام إدارة الوثائق الإلكترونية - Electronic Document Management System', titleAr: 'نظام إدارة الوثائق الإلكترونية', titleEn: 'Electronic Document Management System', type: 'project', priority: 'P0', status: 'Active', progress: 65, startDate: '2026-01-15', endDate: '2026-06-30', ownerName: 'Dr. Ahmed Al-Rashid', ownerInitials: 'AA', ownerColor: '#2563EB', starred: true, milestones: [{ id: 'm1', title: 'Phase 1 Complete', targetDate: '2026-03-15', completed: true }] },
  { id: '2',  initiativeKey: 'MIM-002', title: 'بوابة الخدمات المواطنين - Citizen Services Portal', titleAr: 'بوابة الخدمات المواطنين', titleEn: 'Citizen Services Portal', type: 'project', priority: 'P1', status: 'Active', progress: 40, startDate: '2026-02-01', endDate: '2026-08-15', ownerName: 'Eng. Fatima Al-Harbi', ownerInitials: 'FH', ownerColor: '#0D9488', starred: false, milestones: [] },
  { id: '3',  initiativeKey: 'MIM-003', title: 'منصة التكامل المؤسسي - Enterprise Integration Platform', titleAr: 'منصة التكامل المؤسسي', titleEn: 'Enterprise Integration Platform', type: 'project', priority: 'P1', status: 'Planned', progress: 0, startDate: '2026-04-01', endDate: '2026-10-31', ownerName: 'Mr. Khalid Al-Saeed', ownerInitials: 'KS', ownerColor: '#D97706', starred: false, milestones: [] },
  { id: '4',  initiativeKey: 'MIM-004', title: 'نظام تحليلات البيانات - Data Analytics Platform', titleAr: 'نظام تحليلات البيانات', titleEn: 'Data Analytics Platform', type: 'project', priority: 'P0', status: 'Active', progress: 80, startDate: '2025-11-01', endDate: '2026-04-30', ownerName: 'Ms. Nora Al-Otaibi', ownerInitials: 'NO', ownerColor: '#7C3AED', starred: true, milestones: [{ id: 'm2', title: 'Beta Launch', targetDate: '2026-03-01', completed: false }] },
  { id: '5',  initiativeKey: 'MIM-005', title: 'إطار الحوكمة السحابية - Cloud Governance Framework', titleAr: 'إطار الحوكمة السحابية', titleEn: 'Cloud Governance Framework', type: 'project', priority: 'P2', status: 'Planned', progress: 0, startDate: '2026-05-01', endDate: '2026-12-31', ownerName: 'Dr. Ahmed Al-Rashid', ownerInitials: 'AA', ownerColor: '#2563EB', starred: false, milestones: [] },
  // ── Enhancements (5) ──
  { id: '6',  initiativeKey: 'MIM-006', title: 'تحسين أداء البوابة - Portal Performance Enhancement', titleAr: 'تحسين أداء البوابة', titleEn: 'Portal Performance Enhancement', type: 'enhancement', priority: 'P1', status: 'Active', progress: 55, startDate: '2026-01-10', endDate: '2026-04-15', ownerName: 'Eng. Fatima Al-Harbi', ownerInitials: 'FH', ownerColor: '#0D9488', starred: false, milestones: [] },
  { id: '7',  initiativeKey: 'MIM-007', title: 'ترقية نظام المصادقة - Authentication System Upgrade', titleAr: 'ترقية نظام المصادقة', titleEn: 'Authentication System Upgrade', type: 'enhancement', priority: 'P0', status: 'Active', progress: 30, startDate: '2026-02-15', endDate: '2026-05-30', ownerName: 'Mr. Khalid Al-Saeed', ownerInitials: 'KS', ownerColor: '#D97706', starred: true, milestones: [] },
  { id: '8',  initiativeKey: 'MIM-008', title: 'تكامل الدفع الإلكتروني - E-Payment Integration', titleAr: 'تكامل الدفع الإلكتروني', titleEn: 'E-Payment Integration', type: 'enhancement', priority: 'P1', status: 'Planned', progress: 0, startDate: '2026-03-01', endDate: '2026-06-30', ownerName: 'Ms. Nora Al-Otaibi', ownerInitials: 'NO', ownerColor: '#7C3AED', starred: false, milestones: [] },
  { id: '9',  initiativeKey: 'MIM-009', title: 'تحسين واجهة المستخدم - UI/UX Modernization', titleAr: 'تحسين واجهة المستخدم', titleEn: 'UI/UX Modernization', type: 'enhancement', priority: 'P2', status: 'Active', progress: 70, startDate: '2025-12-01', endDate: '2026-03-31', ownerName: 'Dr. Ahmed Al-Rashid', ownerInitials: 'AA', ownerColor: '#2563EB', starred: false, milestones: [] },
  { id: '10', initiativeKey: 'MIM-010', title: 'تقارير متقدمة - Advanced Reporting Module', titleAr: 'تقارير متقدمة', titleEn: 'Advanced Reporting Module', type: 'enhancement', priority: 'P1', status: 'Planned', progress: 0, startDate: '2026-06-01', endDate: '2026-09-30', ownerName: 'Eng. Fatima Al-Harbi', ownerInitials: 'FH', ownerColor: '#0D9488', starred: false, milestones: [] },
  // ── Improvements (5) ──
  { id: '11', initiativeKey: 'MIM-011', title: 'تحسين أمن البيانات - Data Security Hardening', titleAr: 'تحسين أمن البيانات', titleEn: 'Data Security Hardening', type: 'improvement', priority: 'P0', status: 'Active', progress: 45, startDate: '2026-01-05', endDate: '2026-03-31', ownerName: 'Mr. Khalid Al-Saeed', ownerInitials: 'KS', ownerColor: '#D97706', starred: true, milestones: [] },
  { id: '12', initiativeKey: 'MIM-012', title: 'تسريع قاعدة البيانات - Database Performance Tuning', titleAr: 'تسريع قاعدة البيانات', titleEn: 'Database Performance Tuning', type: 'improvement', priority: 'P1', status: 'Active', progress: 60, startDate: '2026-02-01', endDate: '2026-04-30', ownerName: 'Ms. Nora Al-Otaibi', ownerInitials: 'NO', ownerColor: '#7C3AED', starred: false, milestones: [] },
  { id: '13', initiativeKey: 'MIM-013', title: 'أتمتة العمليات - Process Automation', titleAr: 'أتمتة العمليات', titleEn: 'Process Automation', type: 'improvement', priority: 'P2', status: 'Planned', progress: 0, startDate: '2026-04-15', endDate: '2026-07-31', ownerName: 'Dr. Ahmed Al-Rashid', ownerInitials: 'AA', ownerColor: '#2563EB', starred: false, milestones: [] },
  { id: '14', initiativeKey: 'MIM-014', title: 'تحسين إمكانية الوصول - Accessibility Compliance', titleAr: 'تحسين إمكانية الوصول', titleEn: 'Accessibility Compliance', type: 'improvement', priority: 'P1', status: 'Active', progress: 25, startDate: '2026-03-01', endDate: '2026-06-15', ownerName: 'Eng. Fatima Al-Harbi', ownerInitials: 'FH', ownerColor: '#0D9488', starred: false, milestones: [] },
  { id: '15', initiativeKey: 'MIM-015', title: 'ترحيل البنية التحتية - Infrastructure Migration', titleAr: 'ترحيل البنية التحتية', titleEn: 'Infrastructure Migration', type: 'improvement', priority: 'P0', status: 'Planned', progress: 0, startDate: '2026-07-01', endDate: '2026-11-30', ownerName: 'Mr. Khalid Al-Saeed', ownerInitials: 'KS', ownerColor: '#D97706', starred: false, milestones: [] },
];

export function useRoadmapData() {
  const initiatives = MOCK_INITIATIVES;
  const isLoading = false;
  const error = null;

  const stats = useMemo<RoadmapStats>(() => {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return {
      totalOnRoadmap: initiatives.length,
      totalInitiatives: initiatives.length + 8, // pretend 8 more not on roadmap
      activeCount: initiatives.filter(i => i.status === 'Active').length,
      validationCount: initiatives.filter(i => i.status === 'Planned').length,
      projectCount: initiatives.filter(i => i.type === 'project').length,
      enhancementCount: initiatives.filter(i => i.type === 'enhancement').length,
      improvementCount: initiatives.filter(i => i.type === 'improvement').length,
      currentQuarter: `Q${q} ${now.getFullYear()}`,
    };
  }, [initiatives]);

  return { initiatives, stats, isLoading, error };
}
