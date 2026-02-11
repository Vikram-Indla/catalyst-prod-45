/**
 * Shared Quality Library
 * 
 * Centralized hooks and utilities shared between TestHub and ReleaseHub.
 * 
 * Ownership:
 * - Defects: TestHub owns full CRUD, ReleaseHub reads
 * - Quality Gates: ReleaseHub owns full CRUD, TestHub reads
 * - Readiness: ReleaseHub owns
 */

export * from './hooks';
export * from './utils';
