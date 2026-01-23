/**
 * License Allocation Section for Edit Assignment Modal
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSoftwareLicenses } from '../hooks/useSoftwareLicenses';
import { 
  useAssignmentLicenseAllocations, 
  useBulkUpdateAllocations,
  calculateAllocatedCost,
  getAllocationStatusInfo,
} from '../hooks/useLicenseAllocations';
import { formatSAR } from '../hooks/useResourceCost';
import type { SoftwareLicenseWithAllocation } from '../types';

interface LicenseAllocationSectionProps {
  assignmentId: string;
  onTotalCostChange?: (totalCost: number) => void;
}

interface AllocationEntry {
  license_id: string;
  allocation_percent: number;
}

export function LicenseAllocationSection({ 
  assignmentId, 
  onTotalCostChange 
}: LicenseAllocationSectionProps) {
  const { data: licenses = [] } = useSoftwareLicenses();
  const { data: existingAllocations = [] } = useAssignmentLicenseAllocations(assignmentId);
  const bulkUpdate = useBulkUpdateAllocations();

  // Local state for allocations (maps license_id to allocation_percent)
  const [allocations, setAllocations] = useState<Map<string, number>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize allocations from existing data
  useEffect(() => {
    const allocationMap = new Map<string, number>();
    existingAllocations.forEach(a => {
      allocationMap.set(a.license_id, a.allocation_percent);
    });
    setAllocations(allocationMap);
    setHasChanges(false);
  }, [existingAllocations]);

  // Calculate totals and validation warnings
  const { totalLicenseCost, warnings } = useMemo(() => {
    let totalCost = 0;
    const warningsList: { license: SoftwareLicenseWithAllocation; status: ReturnType<typeof getAllocationStatusInfo> }[] = [];

    licenses.forEach(license => {
      const myPercent = allocations.get(license.id) || 0;
      const myCost = calculateAllocatedCost(license.annual_cost, myPercent);
      totalCost += myCost;

      // Calculate total allocation for this license across all assignments
      // (current value in DB + my local change if different)
      const existingAlloc = existingAllocations.find(a => a.license_id === license.id);
      const existingPercent = existingAlloc?.allocation_percent || 0;
      const otherAssignmentsTotal = license.total_allocated - existingPercent;
      const newTotal = otherAssignmentsTotal + myPercent;

      if (myPercent > 0 && newTotal !== 100) {
        warningsList.push({
          license,
          status: getAllocationStatusInfo(newTotal),
        });
      }
    });

    return { totalLicenseCost: totalCost, warnings: warningsList };
  }, [licenses, allocations, existingAllocations]);

  // Notify parent of total cost changes
  useEffect(() => {
    onTotalCostChange?.(totalLicenseCost);
  }, [totalLicenseCost, onTotalCostChange]);

  const handleAllocationChange = (licenseId: string, value: string) => {
    const percent = Math.max(0, Math.min(100, parseFloat(value) || 0));
    setAllocations(prev => {
      const next = new Map(prev);
      next.set(licenseId, percent);
      return next;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    const allocationEntries: AllocationEntry[] = [];
    allocations.forEach((percent, licenseId) => {
      allocationEntries.push({ license_id: licenseId, allocation_percent: percent });
    });
    
    await bulkUpdate.mutateAsync({
      assignmentId,
      allocations: allocationEntries,
    });
    setHasChanges(false);
  };

  if (licenses.length === 0) {
    return (
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground text-center">
          No software licenses configured. Add licenses in the admin settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Box */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Allocate software license costs to this assignment. The total allocation per license 
          across all assignments should equal 100%.
        </AlertDescription>
      </Alert>

      {/* License Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Software License</TableHead>
              <TableHead className="text-right">Annual Cost</TableHead>
              <TableHead className="text-right w-[100px]">Allocation</TableHead>
              <TableHead className="text-right">Allocated Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {licenses.map(license => {
              const percent = allocations.get(license.id) || 0;
              const allocatedCost = calculateAllocatedCost(license.annual_cost, percent);
              
              return (
                <TableRow key={license.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{license.name}</span>
                      <span className="text-xs text-muted-foreground">{license.vendor}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatSAR(license.annual_cost)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={percent}
                        onChange={(e) => handleAllocationChange(license.id, e.target.value)}
                        className="w-16 text-right h-8"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatSAR(allocatedCost)}
                  </TableCell>
                </TableRow>
              );
            })}
            
            {/* Total Row */}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={3} className="text-right">
                Total License Cost
              </TableCell>
              <TableCell className="text-right text-lg">
                {formatSAR(totalLicenseCost)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Allocation Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map(({ license, status }) => (
            <div 
              key={license.id}
              className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                status.status === 'complete' 
                  ? 'bg-green-50 text-green-700'
                  : status.status === 'over'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-yellow-50 text-yellow-700'
              }`}
            >
              {status.status === 'complete' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <span>
                <strong>{license.name}:</strong> {status.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={bulkUpdate.isPending}>
            {bulkUpdate.isPending ? 'Saving...' : 'Save Allocations'}
          </Button>
        </div>
      )}
    </div>
  );
}
