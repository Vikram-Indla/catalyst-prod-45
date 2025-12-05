/**
 * CATALYST TESTS - Cycle Planning Tab
 * Case assignments, execution order, dependencies, load balancing
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, GitBranch, Shuffle, GripVertical } from 'lucide-react';

interface CyclePlanningTabProps {
  cases: { case_id: string; version: number; assigned_to?: string }[];
  assignments: any[];
  dependencies: any[];
  onAssignmentsChange: (assignments: any[]) => void;
  onDependenciesChange: (dependencies: any[]) => void;
}

export function CyclePlanningTab({
  cases,
  assignments,
  dependencies,
  onAssignmentsChange,
  onDependenciesChange,
}: CyclePlanningTabProps) {
  const [selectedPredecessor, setSelectedPredecessor] = useState<string>('');

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email')
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch test case details
  const { data: caseDetails = [] } = useQuery({
    queryKey: ['case-details', cases.map((c) => c.case_id)],
    queryFn: async () => {
      if (cases.length === 0) return [];
      const { data, error } = await supabase
        .from('test_cases')
        .select('id, title, priority')
        .in('id', cases.map((c) => c.case_id));
      if (error) throw error;
      return data || [];
    },
    enabled: cases.length > 0,
  });

  const handleAssignCase = (caseId: string, userId: string) => {
    const newAssignments = cases
      .map((c) => c.case_id === caseId ? { ...c, assigned_to: userId || undefined } : c)
      .filter((c) => c.assigned_to)
      .map((c, index) => ({
        case_id: c.case_id,
        assigned_to: c.assigned_to,
        sort_order: index,
      }));
    onAssignmentsChange(newAssignments);
  };

  const handleAutoBalance = () => {
    if (users.length === 0 || cases.length === 0) return;

    const casesPerUser = Math.ceil(cases.length / users.length);
    const newAssignments = cases.map((c, index) => ({
      case_id: c.case_id,
      assigned_to: (users[Math.floor(index / casesPerUser)] as any)?.id,
      sort_order: index,
    })).filter(a => a.assigned_to);
    onAssignmentsChange(newAssignments);
  };

  const handleAddDependency = (successorId: string) => {
    if (!selectedPredecessor || selectedPredecessor === successorId) return;
    
    const newDep = {
      predecessor_case_id: selectedPredecessor,
      successor_case_id: successorId,
      dependency_type: 'finish_to_start',
    };
    onDependenciesChange([...dependencies, newDep]);
    setSelectedPredecessor('');
  };

  const handleRemoveDependency = (index: number) => {
    const updated = [...dependencies];
    updated.splice(index, 1);
    onDependenciesChange(updated);
  };

  // Calculate tester workload
  const testerWorkload = users.reduce((acc: Record<string, number>, user: any) => {
    const assigned = assignments.filter((a) => a.assigned_to === user.id).length;
    acc[user.id] = assigned;
    return acc;
  }, {});

  const getAssignedUser = (caseId: string) => {
    return assignments.find((a) => a.case_id === caseId)?.assigned_to;
  };

  if (cases.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Add test cases first to plan assignments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Workload Summary */}
      <Card className="border-border">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-gold" />
              Tester Workload
            </CardTitle>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleAutoBalance}
              className="h-7 text-xs"
            >
              <Shuffle className="h-3 w-3 mr-1" />
              Auto-Balance
            </Button>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-2">
            {users.slice(0, 8).map((user: any) => (
              <Badge key={user.id} variant="secondary" className="px-3 py-1">
                {user.email?.split('@')[0] || 'User'}
                <span className="ml-2 bg-brand-gold/20 px-1.5 rounded text-brand-gold">
                  {testerWorkload[user.id] || 0}
                </span>
              </Badge>
            ))}
            {users.length === 0 && (
              <span className="text-sm text-muted-foreground">No users available</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Case Assignments */}
        <Card className="border-border">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-gold" />
              Case Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[280px]">
              <div className="p-2 space-y-1">
                {caseDetails.map((tc: any) => (
                  <div
                    key={tc.id}
                    className="flex items-center gap-2 p-2 rounded-md border border-border bg-card"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <span className="text-sm truncate flex-1">{tc.title}</span>
                    <Select
                      value={getAssignedUser(tc.id) || ''}
                      onValueChange={(value) => handleAssignCase(tc.id, value)}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue placeholder="Assign" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.email?.split('@')[0] || 'User'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Dependencies */}
        <Card className="border-border">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-brand-gold" />
              Dependencies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Predecessor</Label>
                <Select value={selectedPredecessor} onValueChange={setSelectedPredecessor}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select case" />
                  </SelectTrigger>
                  <SelectContent>
                    {caseDetails.map((tc: any) => (
                      <SelectItem key={tc.id} value={tc.id}>
                        {tc.title?.substring(0, 20)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Successor</Label>
                <Select value="" onValueChange={handleAddDependency}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select case" />
                  </SelectTrigger>
                  <SelectContent>
                    {caseDetails.map((tc: any) => (
                      <SelectItem key={tc.id} value={tc.id}>
                        {tc.title?.substring(0, 20)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {dependencies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No dependencies defined
                  </p>
                ) : (
                  dependencies.map((dep, index) => {
                    const pred = caseDetails.find((c: any) => c.id === dep.predecessor_case_id);
                    const succ = caseDetails.find((c: any) => c.id === dep.successor_case_id);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-sm"
                      >
                        <span className="truncate flex-1">{(pred as any)?.title?.substring(0, 15)}...</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="truncate flex-1">{(succ as any)?.title?.substring(0, 15)}...</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 ml-auto text-destructive"
                          onClick={() => handleRemoveDependency(index)}
                        >
                          ×
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
