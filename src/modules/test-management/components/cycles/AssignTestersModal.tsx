/**
 * Assign Testers Modal
 */

import React, { useState } from 'react';
import { Users } from 'lucide-react';
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

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url?: string;
  current_case_count?: number;
}

interface AssignTestersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  teamMembers: TeamMember[];
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
  teamMembers,
  onSubmit,
  isLoading,
}: AssignTestersModalProps) {
  const [mode, setMode] = useState<'single' | 'round-robin'>('single');
  const [singleUserId, setSingleUserId] = useState<string>('');
  const [roundRobinUserIds, setRoundRobinUserIds] = useState<Set<string>>(new Set());

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

  const getInitials = (name: string) => {
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
            Assign Testers
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <p className="text-sm text-muted-foreground">
            Assign {selectedCount} selected case(s) to:
          </p>

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
                      <SelectValue placeholder="Select a tester" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {getInitials(member.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.full_name}</span>
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
                    {teamMembers.map((member) => {
                      const isSelected = roundRobinUserIds.has(member.id);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-background cursor-pointer"
                          onClick={() => toggleRoundRobinUser(member.id)}
                        >
                          <Checkbox checked={isSelected} />
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex-1 text-sm">{member.full_name}</span>
                          {member.current_case_count !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              (currently: {member.current_case_count} cases)
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {roundRobinUserIds.size < 2 && (
                      <p className="text-xs text-muted-foreground">
                        Select at least 2 testers for round-robin
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || isLoading}
          >
            {isLoading ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
