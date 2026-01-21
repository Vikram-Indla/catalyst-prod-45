/**
 * Automation Hooks - Barrel Export
 * Module 5A-1: Connectors
 * Module 5A-2: Result Import & Mapping
 * Module 5A-3: Automation Status Tracking
 */

// Module 5A-1: Connectors
export { 
  useConnectors, 
  useConnectorMutations, 
  useConnectorTest 
} from './useConnectors';

// Module 5A-2: Result Import & Mapping
export { 
  useResultImport, 
  useTestMapping, 
  useImportHistory 
} from './useResultImport';

// Module 5A-3: Automation Status Tracking
export {
  useAutomationSyncStatus,
  useTestAutomationHistory
} from './useAutomationTracking';
