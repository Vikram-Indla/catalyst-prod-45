/**
 * CATALYST TESTS - Link Test To Work Item
 * Modal for searching and linking existing test cases
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { useTestCases, useTestFolders } from '@/hooks/useTestManagement';
import { useLinkTestsToWorkItem, useWorkItemTestLinks } from '@/hooks/useWorkItemLinking';
import type { WorkItemType } from '@/types/workItemLinking.types';

interface LinkTestToWorkItemProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workItemId: string;
  workItemType: WorkItemType;
}

export const LinkTestToWorkItem: React.FC<LinkTestToWorkItemProps> = ({
  open,
  onOpenChange,
  workItemId,
  workItemType,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  const { data: allTests = [] } = useTestCases();
  const { data: existingLinks = [] } = useWorkItemTestLinks(workItemId, workItemType);
  const linkMutation = useLinkTestsToWorkItem();

  // Get IDs of already linked tests
  const linkedTestIds = new Set(existingLinks.map((link) => link.test_case_id));

  // Filter tests based on search and exclude already linked
  const filteredTests = allTests.filter((test) => {
    const matchesSearch =
      test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleToggleTest = (testId: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(testId)
        ? prev.filter((id) => id !== testId)
        : [...prev, testId]
    );
  };

  const handleLink = () => {
    linkMutation.mutate(
      {
        work_item_id: workItemId,
        work_item_type: workItemType,
        test_case_ids: selectedTestIds,
        link_type: 'covers',
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedTestIds([]);
          setSearchQuery('');
        },
      }
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-blue-500';
      case 'low':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Link Existing Test Cases</DialogTitle>
          <DialogDescription>
            Search and select test cases to link to this work item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search test cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto border rounded-lg">
            {filteredTests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No test cases found
              </div>
            ) : (
              <div className="divide-y">
                {filteredTests.map((test) => {
                  const isLinked = linkedTestIds.has(test.id);
                  const isSelected = selectedTestIds.includes(test.id);

                  return (
                    <div
                      key={test.id}
                      className={`p-4 hover:bg-accent/50 transition-colors ${
                        isLinked ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleTest(test.id)}
                          disabled={isLinked}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div>
                            <div className="font-medium">{test.title}</div>
                            {test.description && (
                              <div className="text-sm text-muted-foreground line-clamp-2">
                                {test.description}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Badge
                              className={`${getPriorityColor(test.priority)} text-white text-xs`}
                              variant="secondary"
                            >
                              {test.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {test.test_type}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {test.status}
                            </Badge>
                            {isLinked && (
                              <Badge variant="secondary" className="text-xs">
                                Already linked
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              {selectedTestIds.length} test case(s) selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleLink}
                disabled={selectedTestIds.length === 0 || linkMutation.isPending}
              >
                {linkMutation.isPending
                  ? 'Linking...'
                  : `Link Selected (${selectedTestIds.length})`}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
