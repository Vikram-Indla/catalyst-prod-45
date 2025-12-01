/**
 * CATALYST TESTS - Linked Test Cases List
 * Tabbed view showing linked tests with priority, status, and actions
 */

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Play, Unlink as UnlinkIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useWorkItemTestLinks, useUnlinkTestFromWorkItem } from '@/hooks/useWorkItemLinking';
import type { WorkItemType } from '@/types/workItemLinking.types';

interface LinkedTestCasesListProps {
  workItemId: string;
  workItemType: WorkItemType;
  showAllVersions?: boolean;
}

export const LinkedTestCasesList: React.FC<LinkedTestCasesListProps> = ({
  workItemId,
  workItemType,
  showAllVersions = false,
}) => {
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  const { data: links = [], isLoading } = useWorkItemTestLinks(workItemId, workItemType);
  const unlinkMutation = useUnlinkTestFromWorkItem();

  const handleUnlinkClick = (linkId: string) => {
    setSelectedLinkId(linkId);
    setUnlinkDialogOpen(true);
  };

  const handleConfirmUnlink = () => {
    if (selectedLinkId) {
      unlinkMutation.mutate({
        linkId: selectedLinkId,
        workItemId,
        workItemType,
      });
    }
    setUnlinkDialogOpen(false);
    setSelectedLinkId(null);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return '✅';
      case 'deprecated':
        return '❌';
      case 'draft':
        return '📄';
      default:
        return '📋';
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading linked tests...</div>;
  }

  return (
    <>
      <Tabs defaultValue="cases" className="w-full">
        <TabsList>
          <TabsTrigger value="cases">Cases ({links.length})</TabsTrigger>
          <TabsTrigger value="cycles">Cycles (0)</TabsTrigger>
          <TabsTrigger value="defects">Defects (0)</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="mt-4">
          {links.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No test cases linked
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[80px_100px_1fr_auto] gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                <div>Priority</div>
                <div>Status</div>
                <div>Test Case</div>
                <div>Actions</div>
              </div>

              {links.map((link) => {
                const testCase = link.test_case;
                if (!testCase) return null;

                return (
                  <div
                    key={link.id}
                    className="grid grid-cols-[80px_100px_1fr_auto] gap-4 px-4 py-3 hover:bg-accent/50 rounded-md items-center"
                  >
                    <div>
                      <Badge
                        className={`${getPriorityColor(testCase.priority)} text-white`}
                        variant="secondary"
                      >
                        {testCase.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{getStatusIcon(testCase.status)}</span>
                      <span className="text-sm capitalize">{testCase.status}</span>
                    </div>
                    <div>
                      <div className="font-medium">{testCase.title}</div>
                      {testCase.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {testCase.description}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" title="Execute test">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" title="View details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnlinkClick(link.id)}
                        title="Unlink test"
                      >
                        <UnlinkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cycles">
          <div className="text-center py-6 text-sm text-muted-foreground">
            No test cycles linked
          </div>
        </TabsContent>

        <TabsContent value="defects">
          <div className="text-center py-6 text-sm text-muted-foreground">
            No defects linked
          </div>
        </TabsContent>
      </Tabs>

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Test Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink this test case? This action can be undone by
              linking it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnlink}>Unlink</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
