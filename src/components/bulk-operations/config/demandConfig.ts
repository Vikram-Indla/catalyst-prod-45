// Bulk Operations Configuration for Demands (Business Requests)
import { BulkOperationConfig } from '../types';
import { PROCESS_STEPS, DELIVERY_PLATFORM_OPTIONS, DEPARTMENT_OPTIONS } from '@/types/business-request';

// Quarter options for bulk edit
const QUARTER_OPTIONS = [
  { value: 'Q1 2024', label: 'Q1 2024' },
  { value: 'Q2 2024', label: 'Q2 2024' },
  { value: 'Q3 2024', label: 'Q3 2024' },
  { value: 'Q4 2024', label: 'Q4 2024' },
  { value: 'Q1 2025', label: 'Q1 2025' },
  { value: 'Q2 2025', label: 'Q2 2025' },
  { value: 'Q3 2025', label: 'Q3 2025' },
  { value: 'Q4 2025', label: 'Q4 2025' },
  { value: 'Q1 2026', label: 'Q1 2026' },
  { value: 'Q2 2026', label: 'Q2 2026' },
  { value: 'Q3 2026', label: 'Q3 2026' },
  { value: 'Q4 2026', label: 'Q4 2026' },
];

export const demandBulkConfig: BulkOperationConfig = {
  entityType: 'demand',
  entityLabel: 'Demand',
  entityLabelPlural: 'Demands',
  allowedOperations: ['edit', 'transition', 'delete'],
  editableFields: [
    {
      id: 'process_step',
      label: 'Process Step',
      type: 'select',
      dbColumn: 'process_step',
      options: PROCESS_STEPS.map(s => ({ value: s.value, label: s.label })),
    },
    {
      id: 'delivery_platform',
      label: 'Delivery Platform',
      type: 'select',
      dbColumn: 'delivery_platform',
      options: DELIVERY_PLATFORM_OPTIONS.map(p => ({ value: p.value, label: p.label.en })),
    },
    {
      id: 'department',
      label: 'Department',
      type: 'select',
      dbColumn: 'department',
      options: DEPARTMENT_OPTIONS.map(d => ({ value: d.value, label: d.label.en })),
    },
    {
      id: 'planned_quarter',
      label: 'Quarter',
      type: 'select',
      dbColumn: 'planned_quarter',
      options: QUARTER_OPTIONS,
    },
    {
      id: 'business_owner',
      label: 'Business Owner',
      type: 'user',
      dbColumn: 'business_owner',
    },
    {
      id: 'requestor',
      label: 'Assignee',
      type: 'user',
      dbColumn: 'requestor',
    },
    {
      id: 'end_date',
      label: 'Target Date',
      type: 'date',
      dbColumn: 'end_date',
    },
  ],
  transitionField: {
    id: 'process_step',
    label: 'Target Status',
    type: 'select',
    dbColumn: 'process_step',
    options: PROCESS_STEPS.map(s => ({ value: s.value, label: s.label })),
  },
};
