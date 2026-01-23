/**
 * Budget Module - Main Exports
 */

// Types
export * from './types';

// Hooks
export * from './hooks/useResourceCost';
export * from './hooks/useSoftwareLicenses';
export * from './hooks/useLicenseAllocations';

// Components
export { SoftwareLicensesPage } from './components/SoftwareLicensesPage';
export { LicenseDialog } from './components/LicenseDialog';
export { ResourceCostSection } from './components/ResourceCostSection';
export { LicenseAllocationSection } from './components/LicenseAllocationSection';
