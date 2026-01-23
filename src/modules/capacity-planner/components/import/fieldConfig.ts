/**
 * Field configuration for Capacity Import
 */

import type { ImportField } from './types';

export const RESOURCE_IMPORT_FIELDS: ImportField[] = [
  {
    key: 'name',
    label: 'Name',
    dbColumn: 'name',
    type: 'text',
    required: true,
  },
  {
    key: 'role_name',
    label: 'Role',
    dbColumn: 'role_name',
    type: 'text',
    required: false,
  },
  {
    key: 'department_id',
    label: 'Department',
    dbColumn: 'department_id',
    type: 'select',
    required: false,
    lookupTable: 'capacity_departments',
  },
  {
    key: 'assignment_id',
    label: 'Assignment',
    dbColumn: 'assignment_id',
    type: 'select',
    required: false,
    lookupTable: 'resource_assignments',
  },
  {
    key: 'vendor_id',
    label: 'Vendor',
    dbColumn: 'vendor_id',
    type: 'select',
    required: false,
    lookupTable: 'resource_vendors',
  },
  {
    key: 'country_id',
    label: 'Country',
    dbColumn: 'country_id',
    type: 'select',
    required: false,
    lookupTable: 'resource_countries',
  },
  {
    key: 'location_id',
    label: 'Location',
    dbColumn: 'location_id',
    type: 'select',
    required: false,
    lookupTable: 'resource_locations',
  },
  {
    key: 'contract_start_date',
    label: 'Contract Start',
    dbColumn: 'contract_start_date',
    type: 'date',
    required: false,
  },
  {
    key: 'contract_end_date',
    label: 'Contract End',
    dbColumn: 'contract_end_date',
    type: 'date',
    required: false,
  },
  {
    key: 'default_capacity_percent',
    label: 'Capacity %',
    dbColumn: 'default_capacity_percent',
    type: 'number',
    required: false,
  },
  {
    key: 'is_active',
    label: 'Active',
    dbColumn: 'is_active',
    type: 'boolean',
    required: false,
  },
  {
    key: 'notes',
    label: 'Notes',
    dbColumn: 'notes',
    type: 'text',
    required: false,
  },
];

/**
 * Get the unique key field for matching existing records
 */
export const UNIQUE_KEY_FIELD = 'name';

/**
 * Get field by key
 */
export function getFieldByKey(key: string): ImportField | undefined {
  return RESOURCE_IMPORT_FIELDS.find(f => f.key === key);
}

/**
 * Get all lookup fields
 */
export function getLookupFields(): ImportField[] {
  return RESOURCE_IMPORT_FIELDS.filter(f => f.lookupTable);
}
