/**
 * Rebalance Workload Hook
 * Handles workload rebalancing mutations
 */

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TeamMemberWorkload, RebalanceTransfer, RebalancePreview } from '@/types/workload.types';

export function useRebalanceWorkload() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      cycleId, 
      transfers 
    }: { cycleId: string; transfers: RebalanceTransfer[] }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, this would update the database
      console.log('Applying transfers:', transfers);
      
      return { success: true, transferCount: transfers.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-workload'] });
      queryClient.invalidateQueries({ queryKey: ['cycle-distribution'] });
      toast.success(`Rebalanced ${data.transferCount} tests successfully`);
    },
    onError: (error) => {
      toast.error('Failed to rebalance workload');
    },
  });
}

export function useRebalancePreview(members: TeamMemberWorkload[]) {
  const [manualTransfers, setManualTransfers] = useState<RebalanceTransfer[]>([]);
  
  const autoBalancePreview = useMemo((): RebalancePreview => {
    if (!members.length) {
      return { 
        transfers: [], 
        beforeDistribution: [], 
        afterDistribution: [],
        improvementScore: 0 
      };
    }
    
    const availableMembers = members.filter(m => m.isAvailable);
    if (availableMembers.length === 0) {
      return { 
        transfers: [], 
        beforeDistribution: [], 
        afterDistribution: [],
        improvementScore: 0 
      };
    }
    
    const totalTests = availableMembers.reduce((sum, m) => sum + m.totalAssigned, 0);
    const targetPerMember = Math.floor(totalTests / availableMembers.length);
    
    const transfers: RebalanceTransfer[] = [];
    
    // Simple algorithm: move tests from overloaded to underutilized
    const overloaded = availableMembers
      .filter(m => m.totalAssigned > targetPerMember + 2)
      .sort((a, b) => b.totalAssigned - a.totalAssigned);
    
    const underutilized = availableMembers
      .filter(m => m.totalAssigned < targetPerMember - 1)
      .sort((a, b) => a.totalAssigned - b.totalAssigned);
    
    let transferId = 1;
    for (const from of overloaded) {
      const excess = from.totalAssigned - targetPerMember;
      for (let i = 0; i < Math.min(excess, 3); i++) {
        const to = underutilized.find(m => 
          !transfers.some(t => t.toUserId === m.id && transfers.filter(t => t.toUserId === m.id).length >= 2)
        );
        if (to) {
          transfers.push({
            testId: `test-${transferId++}`,
            testTitle: `Test Case ${transferId}`,
            fromUserId: from.id,
            fromUserName: from.name,
            toUserId: to.id,
            toUserName: to.name,
          });
        }
      }
    }
    
    // Calculate before/after distributions
    const beforeDistribution = availableMembers.map(m => ({
      userId: m.id,
      name: m.name,
      count: m.totalAssigned,
    }));
    
    const afterCounts = new Map<string, number>();
    availableMembers.forEach(m => afterCounts.set(m.id, m.totalAssigned));
    
    transfers.forEach(t => {
      afterCounts.set(t.fromUserId, (afterCounts.get(t.fromUserId) || 0) - 1);
      afterCounts.set(t.toUserId, (afterCounts.get(t.toUserId) || 0) + 1);
    });
    
    const afterDistribution = availableMembers.map(m => ({
      userId: m.id,
      name: m.name,
      count: afterCounts.get(m.id) || 0,
    }));
    
    // Calculate improvement score
    const beforeVariance = calculateVariance(beforeDistribution.map(d => d.count));
    const afterVariance = calculateVariance(afterDistribution.map(d => d.count));
    const improvementScore = beforeVariance > 0 
      ? Math.round(((beforeVariance - afterVariance) / beforeVariance) * 100)
      : 0;
    
    return { transfers, beforeDistribution, afterDistribution, improvementScore };
  }, [members, manualTransfers]);
  
  const addManualTransfer = (transfer: RebalanceTransfer) => {
    setManualTransfers(prev => [...prev, transfer]);
  };
  
  const removeManualTransfer = (testId: string) => {
    setManualTransfers(prev => prev.filter(t => t.testId !== testId));
  };
  
  const clearManualTransfers = () => {
    setManualTransfers([]);
  };
  
  return {
    preview: autoBalancePreview,
    manualTransfers,
    addManualTransfer,
    removeManualTransfer,
    clearManualTransfers,
  };
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
}
