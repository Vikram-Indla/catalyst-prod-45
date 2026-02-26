/**
 * 🚨 CATALYST ZERO-MOCK POLICY — THIS FILE HAS BEEN PURGED
 * 
 * All mock data has been removed per CATALYST_DATA_POLICY.md
 * All data must come from the database.
 * 
 * If you need test repository data, query tm_test_cases, tm_test_suites,
 * and tm_folders from the database.
 */

import { warnMockDataBan } from '@/components/guardrails/MockDataWarning';

// Fire a console error if anything tries to import from this file
warnMockDataBan('mockTestRepositoryData');

// Export empty arrays to prevent import crashes
export const mockFolders: any[] = [];
export const mockSuites: any[] = [];
export const mockTestCases: any[] = [];
export const mockTreeNodes: any[] = [];
