// Bulk Operations Configuration for Demands (Business Requests)
// NOTE: Process steps are loaded dynamically - the config provides structure only
import { BulkOperationConfig } from '../types';
import { DELIVERY_PLATFORM_OPTIONS } from '@/types/business-request';

// Quarter options for bulk edit - dynamically generated
const currentYear = new Date().getFullYear();
const QUARTER_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const year = currentYear + Math.floor(i / 4);
  const quarter = (i % 4) + 1;
  return { value: `Q${quarter} ${year}`, label: `Q${quarter} ${year}` };
});

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
      // Process step options loaded dynamically via useProcessStepOptions hook at runtime
      options: [],
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
      dbColumn: 'department_id',
      // Department options are loaded dynamically - this field will be populated at runtime
      // See ZERO-SEED policy: departments come ONLY from admin-configured data
      options: [], // Populated dynamically by bulk edit component via useDepartments hook
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
    // Process step options loaded dynamically via useProcessStepOptions hook at runtime
    options: [],
  },
};
