import { Theme, Owner, Objective } from '../types/objective-roadmap';

export const sampleThemes: Theme[] = [
  { id: 'THM-001', name: 'Digital Transformation', color: '#5C7C5C' },
  { id: 'THM-002', name: 'Customer Experience', color: '#8B7355' },
  { id: 'THM-003', name: 'Operational Excellence', color: '#C69C6D' },
  { id: 'THM-004', name: 'Risk & Compliance', color: '#6B7280' },
];

export const sampleOwners: Owner[] = [
  { id: 'sarah-chen', name: 'Sarah Chen', initials: 'SC' },
  { id: 'ahmed-hassan', name: 'Ahmed Hassan', initials: 'AH' },
  { id: 'maria-santos', name: 'Maria Santos', initials: 'MS' },
  { id: 'james-wilson', name: 'James Wilson', initials: 'JW' },
  { id: 'priya-sharma', name: 'Priya Sharma', initials: 'PS' },
];

export const sampleObjectives: Objective[] = [
  {
    id: 'OBJ-001',
    name: 'Accelerate Digital Processing',
    themeId: 'THM-001',
    ownerId: 'sarah-chen',
    startDate: new Date('2025-01-15'),
    endDate: new Date('2025-12-31'),
    progress: 35,
    status: 'at-risk',
    keyResults: [
      { id: 'KR-001', title: 'Reduce processing time to <48hrs', dueDate: new Date('2025-03-30'), progress: 62, status: 'in-progress' },
      { id: 'KR-002', title: 'Automate 80% of validation checks', dueDate: new Date('2025-06-15'), progress: 28, status: 'in-progress' },
      { id: 'KR-003', title: 'Achieve 95% SLA compliance', dueDate: new Date('2025-09-15'), progress: 12, status: 'in-progress' },
      { id: 'KR-004', title: 'Deploy AI-assisted review system', dueDate: new Date('2025-11-30'), progress: 0, status: 'not-started' }
    ]
  },
  {
    id: 'OBJ-002',
    name: 'Modernize Core Banking Infrastructure',
    themeId: 'THM-001',
    ownerId: 'ahmed-hassan',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-10-31'),
    progress: 52,
    status: 'on-track',
    keyResults: [
      { id: 'KR-005', title: 'Migrate 100% of legacy systems', dueDate: new Date('2025-04-30'), progress: 80, status: 'in-progress' },
      { id: 'KR-006', title: 'Reduce system downtime by 50%', dueDate: new Date('2025-07-15'), progress: 45, status: 'in-progress' },
      { id: 'KR-007', title: 'Implement real-time monitoring', dueDate: new Date('2025-09-30'), progress: 30, status: 'in-progress' }
    ]
  },
  {
    id: 'OBJ-003',
    name: 'Build Data Analytics Platform',
    themeId: 'THM-001',
    ownerId: 'maria-santos',
    startDate: new Date('2025-02-15'),
    endDate: new Date('2025-11-30'),
    progress: 28,
    status: 'on-track',
    keyResults: [
      { id: 'KR-008', title: 'Launch self-service BI dashboard', dueDate: new Date('2025-05-15'), progress: 55, status: 'in-progress' },
      { id: 'KR-009', title: 'Train 200 analysts', dueDate: new Date('2025-08-31'), progress: 20, status: 'in-progress' },
      { id: 'KR-010', title: 'Achieve 90% data quality score', dueDate: new Date('2025-10-31'), progress: 10, status: 'in-progress' }
    ]
  },
  {
    id: 'OBJ-004',
    name: 'Enhance Customer Engagement',
    themeId: 'THM-002',
    ownerId: 'james-wilson',
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-09-30'),
    progress: 45,
    status: 'on-track',
    keyResults: [
      { id: 'KR-011', title: 'Increase NPS by 15 points', dueDate: new Date('2025-06-30'), progress: 60, status: 'in-progress' },
      { id: 'KR-012', title: 'Reduce response time to <2hrs', dueDate: new Date('2025-08-15'), progress: 40, status: 'in-progress' },
      { id: 'KR-013', title: 'Launch mobile app v2', dueDate: new Date('2025-09-30'), progress: 35, status: 'in-progress' }
    ]
  },
  {
    id: 'OBJ-005',
    name: 'Improve Customer Onboarding',
    themeId: 'THM-002',
    ownerId: 'priya-sharma',
    startDate: new Date('2025-03-01'),
    endDate: new Date('2025-08-31'),
    progress: 38,
    status: 'on-track',
    keyResults: [
      { id: 'KR-014', title: 'Reduce onboarding time by 40%', dueDate: new Date('2025-05-31'), progress: 55, status: 'in-progress' },
      { id: 'KR-015', title: 'Achieve 90% completion rate', dueDate: new Date('2025-07-31'), progress: 30, status: 'in-progress' },
      { id: 'KR-016', title: 'Launch digital KYC', dueDate: new Date('2025-08-31'), progress: 20, status: 'in-progress' }
    ]
  },
  {
    id: 'OBJ-006',
    name: 'Enhance Mobile Banking Experience',
    themeId: 'THM-002',
    ownerId: 'sarah-chen',
    startDate: new Date('2025-04-01'),
    endDate: new Date('2025-11-30'),
    progress: 22,
    status: 'at-risk',
    keyResults: [
      { id: 'KR-017', title: 'Increase app rating to 4.5 stars', dueDate: new Date('2025-07-31'), progress: 35, status: 'in-progress' },
      { id: 'KR-018', title: 'Launch 5 new features', dueDate: new Date('2025-09-30'), progress: 20, status: 'in-progress' },
      { id: 'KR-019', title: 'Reduce app load time by 50%', dueDate: new Date('2025-11-30'), progress: 10, status: 'in-progress' }
    ]
  },
  {
    id: 'OBJ-007',
    name: 'Optimize Operational Efficiency',
    themeId: 'THM-003',
    ownerId: 'ahmed-hassan',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    progress: 41,
    status: 'at-risk',
    keyResults: [
      { id: 'KR-020', title: 'Reduce operational costs by 20%', dueDate: new Date('2025-06-30'), progress: 55, status: 'in-progress' },
      { id: 'KR-021', title: 'Automate 60% of manual processes', dueDate: new Date('2025-09-30'), progress: 40, status: 'in-progress' },
      { id: 'KR-022', title: 'Achieve Six Sigma certification', dueDate: new Date('2025-12-31'), progress: 28, status: 'in-progress' }
    ]
  },
  {
    id: 'OBJ-008',
    name: 'Streamline Regulatory Reporting',
    themeId: 'THM-003',
    ownerId: 'maria-santos',
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-10-31'),
    progress: 33,
    status: 'on-track',
    keyResults: [
      { id: 'KR-023', title: 'Reduce report generation time by 70%', dueDate: new Date('2025-05-31'), progress: 50, status: 'in-progress' },
      { id: 'KR-024', title: 'Achieve 100% regulatory compliance', dueDate: new Date('2025-08-31'), progress: 35, status: 'in-progress' },
      { id: 'KR-025', title: 'Implement automated audit trails', dueDate: new Date('2025-10-31'), progress: 15, status: 'in-progress' }
    ]
  },
  {
    id: 'OBJ-009',
    name: 'Enhance Supply Chain Resilience',
    themeId: 'THM-003',
    ownerId: 'james-wilson',
    startDate: new Date('2025-03-15'),
    endDate: new Date('2025-09-30'),
    progress: 25,
    status: 'on-track',
    keyResults: [
      { id: 'KR-026', title: 'Diversify supplier base by 30%', dueDate: new Date('2025-06-30'), progress: 40, status: 'in-progress' },
      { id: 'KR-027', title: 'Reduce supply chain disruptions by 50%', dueDate: new Date('2025-09-30'), progress: 10, status: 'in-progress' }
    ]
  },
  {
    id: 'OBJ-010',
    name: 'Strengthen Risk Management Framework',
    themeId: 'THM-004',
    ownerId: 'priya-sharma',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    progress: 30,
    status: 'on-track',
    keyResults: [
      { id: 'KR-028', title: 'Implement enterprise risk dashboard', dueDate: new Date('2025-04-30'), progress: 70, status: 'in-progress' },
      { id: 'KR-029', title: 'Conduct 100% of scheduled risk assessments', dueDate: new Date('2025-09-30'), progress: 25, status: 'in-progress' },
      { id: 'KR-030', title: 'Reduce risk incidents by 40%', dueDate: new Date('2025-12-31'), progress: 15, status: 'in-progress' }
    ]
  },
  {
    id: 'OBJ-011',
    name: 'Enhance Cybersecurity Posture',
    themeId: 'THM-004',
    ownerId: 'sarah-chen',
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-11-30'),
    progress: 42,
    status: 'on-track',
    keyResults: [
      { id: 'KR-031', title: 'Achieve ISO 27001 certification', dueDate: new Date('2025-06-30'), progress: 65, status: 'in-progress' },
      { id: 'KR-032', title: 'Zero critical security incidents', dueDate: new Date('2025-11-30'), progress: 50, status: 'in-progress' },
      { id: 'KR-033', title: 'Complete 100% employee security training', dueDate: new Date('2025-08-31'), progress: 35, status: 'in-progress' }
    ]
  },
  {
    id: 'OBJ-012',
    name: 'Implement Compliance Automation',
    themeId: 'THM-004',
    ownerId: 'ahmed-hassan',
    startDate: new Date('2025-04-01'),
    endDate: new Date('2025-12-31'),
    progress: 18,
    status: 'on-track',
    keyResults: [
      { id: 'KR-034', title: 'Automate 80% compliance checks', dueDate: new Date('2025-08-31'), progress: 25, status: 'in-progress' },
      { id: 'KR-035', title: 'Reduce compliance review time by 60%', dueDate: new Date('2025-11-30'), progress: 15, status: 'in-progress' },
      { id: 'KR-036', title: 'Deploy RegTech platform', dueDate: new Date('2025-12-31'), progress: 10, status: 'in-progress' }
    ]
  },
  {
    id: 'OBJ-013',
    name: 'Launch AI-Powered Customer Support',
    themeId: 'THM-002',
    ownerId: 'maria-santos',
    startDate: new Date('2025-05-01'),
    endDate: new Date('2025-12-31'),
    progress: 15,
    status: 'on-track',
    keyResults: [
      { id: 'KR-037', title: 'Deploy AI chatbot handling 50% queries', dueDate: new Date('2025-09-30'), progress: 20, status: 'in-progress' },
      { id: 'KR-038', title: 'Achieve 85% customer satisfaction with AI', dueDate: new Date('2025-12-31'), progress: 10, status: 'not-started' }
    ]
  },
  {
    id: 'OBJ-014',
    name: 'Expand Digital Services Portfolio',
    themeId: 'THM-001',
    ownerId: 'james-wilson',
    startDate: new Date('2025-03-01'),
    endDate: new Date('2025-10-31'),
    progress: 28,
    status: 'on-track',
    keyResults: [
      { id: 'KR-039', title: 'Launch 3 new digital products', dueDate: new Date('2025-07-31'), progress: 35, status: 'in-progress' },
      { id: 'KR-040', title: 'Achieve 100K digital service users', dueDate: new Date('2025-10-31'), progress: 20, status: 'in-progress' }
    ]
  },
  {
    id: 'OBJ-015',
    name: 'Establish Innovation Lab',
    themeId: 'THM-001',
    ownerId: 'priya-sharma',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-12-31'),
    progress: 10,
    status: 'on-track',
    keyResults: [
      { id: 'KR-041', title: 'Set up physical innovation space', dueDate: new Date('2025-08-31'), progress: 15, status: 'in-progress' },
      { id: 'KR-042', title: 'Launch 2 pilot projects', dueDate: new Date('2025-11-30'), progress: 5, status: 'not-started' },
      { id: 'KR-043', title: 'Establish 5 startup partnerships', dueDate: new Date('2025-12-31'), progress: 10, status: 'not-started' }
    ]
  }
];
