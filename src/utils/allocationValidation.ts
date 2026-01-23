/**
 * Allocation Validation Utilities
 * Centralized validation for resource allocations against contract dates
 */

import { toast } from 'sonner';

/**
 * Validates that an allocation end date does not exceed the resource's contract end date
 * @param allocationEndDate - The end date of the allocation
 * @param contractEndDate - The contract end date of the resource (null means no restriction)
 * @param resourceName - Optional resource name for error message
 * @returns true if valid, false if invalid (and shows toast)
 */
export function validateAllocationAgainstContract(
  allocationEndDate: string | Date,
  contractEndDate: string | Date | null | undefined,
  resourceName?: string
): boolean {
  // No contract end date means no restriction
  if (!contractEndDate) return true;

  const allocEnd = new Date(allocationEndDate);
  const contractEnd = new Date(contractEndDate);

  // Normalize to compare dates only (no time component issues)
  allocEnd.setHours(0, 0, 0, 0);
  contractEnd.setHours(0, 0, 0, 0);

  if (allocEnd > contractEnd) {
    const formattedContractEnd = contractEnd.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    
    const message = resourceName
      ? `Invalid assignment: Allocation cannot exceed ${resourceName}'s contract end date (${formattedContractEnd})`
      : `Invalid assignment: Allocation cannot exceed contract end date (${formattedContractEnd})`;
    
    toast.error(message);
    return false;
  }

  return true;
}

/**
 * Validates that an allocation start date does not exceed the resource's contract end date
 * (If the start is already after contract end, the allocation is invalid)
 * @param allocationStartDate - The start date of the allocation
 * @param contractEndDate - The contract end date of the resource (null means no restriction)
 * @param resourceName - Optional resource name for error message
 * @returns true if valid, false if invalid (and shows toast)
 */
export function validateAllocationStartAgainstContract(
  allocationStartDate: string | Date,
  contractEndDate: string | Date | null | undefined,
  resourceName?: string
): boolean {
  if (!contractEndDate) return true;

  const allocStart = new Date(allocationStartDate);
  const contractEnd = new Date(contractEndDate);

  allocStart.setHours(0, 0, 0, 0);
  contractEnd.setHours(0, 0, 0, 0);

  if (allocStart > contractEnd) {
    const formattedContractEnd = contractEnd.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    
    const message = resourceName
      ? `Invalid assignment: Allocation start date is after ${resourceName}'s contract end date (${formattedContractEnd})`
      : `Invalid assignment: Allocation start date is after contract end date (${formattedContractEnd})`;
    
    toast.error(message);
    return false;
  }

  return true;
}

/**
 * Validates both start and end dates of an allocation against contract
 * @returns true if valid, false if invalid (and shows toast)
 */
export function validateAllocationDatesAgainstContract(
  allocationStartDate: string | Date,
  allocationEndDate: string | Date,
  contractEndDate: string | Date | null | undefined,
  resourceName?: string
): boolean {
  // First check if start is valid
  if (!validateAllocationStartAgainstContract(allocationStartDate, contractEndDate, resourceName)) {
    return false;
  }
  
  // Then check if end is valid
  return validateAllocationAgainstContract(allocationEndDate, contractEndDate, resourceName);
}
