/**
 * Tester Assignment Component
 * Multi-select component for assigning testers to execution runs
 */

import React, { useState, useMemo } from 'react';
import { Check, X, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserRef } from '../types/test-execution';

interface TesterAssignmentProps {
  selectedTesters: string[];
  onSelectionChange: (testerIds: string[]) => void;
  projectId?: string;
  maxTesters?: number;
  disabled?: boolean;
}

export const TesterAssignment: React.FC<TesterAssignmentProps> = ({
  selectedTesters,
  onSelectionChange,
  projectId,
  maxTesters = 10,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch available testers (approved users)
  const { data: testers = [], isLoading } = useQuery({
    queryKey: ['available-testers', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name');

      if (error) throw error;

      return (data || []).map((u) => ({
        id: u.id,
        name: u.full_name || 'Unknown',
        avatar: u.avatar_url,
      })) as UserRef[];
    },
  });

  // Filter testers by search
  const filteredTesters = useMemo(() => {
    if (!search.trim()) return testers;
    const q = search.toLowerCase();
    return testers.filter((t) => t.name.toLowerCase().includes(q));
  }, [testers, search]);

  // Get selected tester objects
  const selectedTesterObjects = useMemo(() => {
    return testers.filter((t) => selectedTesters.includes(t.id));
  }, [testers, selectedTesters]);

  const toggleTester = (testerId: string) => {
    if (selectedTesters.includes(testerId)) {
      onSelectionChange(selectedTesters.filter((id) => id !== testerId));
    } else if (selectedTesters.length < maxTesters) {
      onSelectionChange([...selectedTesters, testerId]);
    }
  };

  const removeTester = (testerId: string) => {
    onSelectionChange(selectedTesters.filter((id) => id !== testerId));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-2">
      {/* Selected testers display */}
      {selectedTesterObjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTesterObjects.map((tester) => (
            <Badge
              key={tester.id}
              variant="secondary"
              className="flex items-center gap-1.5 pr-1"
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={tester.avatar || undefined} />
                <AvatarFallback className="text-[8px]">
                  {getInitials(tester.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">{tester.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTester(tester.id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Tester selector popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="w-full justify-start text-muted-foreground"
          >
            <Users className="mr-2 h-4 w-4" />
            {selectedTesters.length === 0
              ? 'Assign testers...'
              : `${selectedTesters.length} tester(s) assigned`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search testers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>
          <ScrollArea className="h-[200px]">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading testers...
              </div>
            ) : filteredTesters.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No testers found
              </div>
            ) : (
              <div className="p-1">
                {filteredTesters.map((tester) => {
                  const isSelected = selectedTesters.includes(tester.id);
                  const isDisabled = !isSelected && selectedTesters.length >= maxTesters;

                  return (
                    <button
                      key={tester.id}
                      type="button"
                      onClick={() => toggleTester(tester.id)}
                      disabled={isDisabled}
                      className={`
                        w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left
                        ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}
                        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={tester.avatar || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(tester.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm truncate">{tester.name}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          {selectedTesters.length >= maxTesters && (
            <div className="p-2 border-t text-xs text-muted-foreground text-center">
              Maximum {maxTesters} testers allowed
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
