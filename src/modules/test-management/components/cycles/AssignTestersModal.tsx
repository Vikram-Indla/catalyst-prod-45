/**
 * Assign Testers Modal
 * Only shows users with qa_tester role
 */

import React, { useState } from 'react';
import { Users, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQATesters } from '@/hooks/test-management';

interface AssignTestersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  // teamMembers prop kept for backwards compatibility but not used - QA testers fetched internally
  teamMembers?: { id: string; full_name: string; avatar_url?: string; current_case_count?: number }[];
  onSubmit: (data: {
    mode: 'single' | 'round-robin';
    userId?: string;
    userIds?: string[];
  }) => void;
  isLoading?: boolean;
}

export function AssignTestersModal({
  open,
  onOpenChange,
  selectedCount,
  onSubmit,
  isLoading,
}: AssignTestersModalProps) {
  const [mode, setMode] = useState<'single' | 'round-robin'>('single');
  const [singleUserId, setSingleUserId] = useState<string>('');
  const [roundRobinUserIds, setRoundRobinUserIds] = useState<Set<string>>(new Set());

  // Fetch QA testers only (users with qa_tester role)
  const { data: qaTesters = [], isLoading: testersLoading, error } = useQATesters();

  const toggleRoundRobinUser = (userId: string) => {
    setRoundRobinUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (mode === 'single') {
      onSubmit({ mode: 'single', userId: singleUserId });
    } else {
      onSubmit({ mode: 'round-robin', userIds: Array.from(roundRobinUserIds) });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'UN';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isValid = mode === 'single' 
    ? !!singleUserId 
    : roundRobinUserIds.size >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign QA Testers
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <p className="text-sm text-muted-foreground">
            Assign {selectedCount} selected case(s) to QA testers:
          </p>

          {testersLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading QA testers...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              Failed to load QA testers
            </div>
          ) : qaTesters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-warning" />
              <p className="font-medium">No QA Testers Found</p>
              <p className="text-sm">Users must have the QA Tester role to be assigned test cases.</p>
            </div>
          ) : (
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'single' | 'round-robin')}>
              {/* Single Assignee */}
              <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="single" id="single" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="single" className="cursor-pointer font-medium">
                    Single assignee
                  </Label>
                  {mode === 'single' && (
                    <Select value={singleUserId} onValueChange={setSingleUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a QA tester" />
                      </SelectTrigger>
                      <SelectContent>
                        {qaTesters.map((tester) => (
                          <SelectItem key={tester.id} value={tester.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={tester.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-primary/15 text-primary">
                                  {getInitials(tester.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{tester.full_name || tester.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Round Robin */}
              <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="round-robin" id="round-robin" className="mt-1" />
                <div className="flex-1 space-y-3">
                  <Label htmlFor="round-robin" className="cursor-pointer font-medium">
                    Round-robin (distribute evenly among)
                  </Label>
                  {mode === 'round-robin' && (
                    <div className="space-y-2">
                      {qaTesters.map((tester) => {
                        const isSelected = roundRobinUserIds.has(tester.id);
                        return (
                          <div
                            key={tester.id}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-background cursor-pointer"
                            onClick={() => toggleRoundRobinUser(tester.id)}
                          >
                            <Checkbox checked={isSelected} />
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={tester.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-primary/15 text-primary">
                                {getInitials(tester.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="flex-1 text-sm">{tester.full_name || tester.email}</span>
                          </div>
                        );
                      })}
                      {roundRobinUserIds.size < 2 && (
                        <p className="text-xs text-muted-foreground">
                          Select at least 2 QA testers for round-robin
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || isLoading || testersLoading || qaTesters.length === 0}
          >
            {isLoading ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
