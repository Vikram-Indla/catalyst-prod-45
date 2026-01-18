/**
 * Bulk Link Tests Dialog
 * Two-panel interface for linking tests to requirements
 */
import { useState, useMemo, useCallback } from 'react';
import { Link, Search, Check, X, ChevronRight, FileText, TestTube2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { RequirementTableRow, TestLink } from '../types';
import { cn } from '@/lib/utils';

interface TestCase {
  id: string;
  key: string;
  title: string;
  type: string;
  priority: string;
}

interface LinkChange {
  requirementId: string;
  testCaseId: string;
  action: 'link' | 'unlink';
}

interface BulkLinkTestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirements: RequirementTableRow[];
  onSuccess?: () => void;
}

// Mock test cases - in production this would come from API
const mockTestCases: TestCase[] = [
  { id: 'tc1', key: 'TC-001', title: 'Login with valid credentials', type: 'Functional', priority: 'High' },
  { id: 'tc2', key: 'TC-002', title: 'Login with invalid password', type: 'Functional', priority: 'High' },
  { id: 'tc3', key: 'TC-003', title: 'Password reset flow', type: 'Functional', priority: 'Medium' },
  { id: 'tc4', key: 'TC-004', title: 'Session timeout handling', type: 'Functional', priority: 'Medium' },
  { id: 'tc5', key: 'TC-005', title: 'Multi-factor authentication', type: 'Security', priority: 'Critical' },
  { id: 'tc6', key: 'TC-006', title: 'API response time < 200ms', type: 'Performance', priority: 'High' },
  { id: 'tc7', key: 'TC-007', title: 'Concurrent user load test', type: 'Performance', priority: 'High' },
  { id: 'tc8', key: 'TC-008', title: 'Data export functionality', type: 'Functional', priority: 'Medium' },
  { id: 'tc9', key: 'TC-009', title: 'User profile update', type: 'Functional', priority: 'Low' },
  { id: 'tc10', key: 'TC-010', title: 'Notification preferences', type: 'Functional', priority: 'Low' },
];

export const BulkLinkTestsDialog = ({ 
  open, 
  onOpenChange, 
  requirements,
  onSuccess 
}: BulkLinkTestsDialogProps) => {
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null);
  const [reqSearch, setReqSearch] = useState('');
  const [testSearch, setTestSearch] = useState('');
  const [pendingChanges, setPendingChanges] = useState<LinkChange[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Get filtered requirements
  const filteredRequirements = useMemo(() => {
    if (!reqSearch) return requirements;
    const query = reqSearch.toLowerCase();
    return requirements.filter(
      r => r.key.toLowerCase().includes(query) || r.title.toLowerCase().includes(query)
    );
  }, [requirements, reqSearch]);

  // Get selected requirement
  const selectedRequirement = useMemo(() => 
    requirements.find(r => r.id === selectedRequirementId),
    [requirements, selectedRequirementId]
  );

  // Get linked test IDs for selected requirement (including pending changes)
  const linkedTestIds = useMemo(() => {
    if (!selectedRequirement) return new Set<string>();
    
    const baseLinks = new Set(selectedRequirement.linkedTests.map(t => t.testCaseId));
    
    // Apply pending changes
    pendingChanges
      .filter(c => c.requirementId === selectedRequirementId)
      .forEach(change => {
        if (change.action === 'link') {
          baseLinks.add(change.testCaseId);
        } else {
          baseLinks.delete(change.testCaseId);
        }
      });
    
    return baseLinks;
  }, [selectedRequirement, selectedRequirementId, pendingChanges]);

  // Get filtered test cases
  const filteredTestCases = useMemo(() => {
    if (!testSearch) return mockTestCases;
    const query = testSearch.toLowerCase();
    return mockTestCases.filter(
      t => t.key.toLowerCase().includes(query) || t.title.toLowerCase().includes(query)
    );
  }, [testSearch]);

  // Get counts for each requirement including pending changes
  const getRequirementTestCount = useCallback((reqId: string, baseCount: number) => {
    const changes = pendingChanges.filter(c => c.requirementId === reqId);
    const links = changes.filter(c => c.action === 'link').length;
    const unlinks = changes.filter(c => c.action === 'unlink').length;
    return baseCount + links - unlinks;
  }, [pendingChanges]);

  const handleToggleLink = (testCaseId: string) => {
    if (!selectedRequirementId) return;

    const isCurrentlyLinked = linkedTestIds.has(testCaseId);
    const existingChangeIdx = pendingChanges.findIndex(
      c => c.requirementId === selectedRequirementId && c.testCaseId === testCaseId
    );

    if (existingChangeIdx >= 0) {
      // Remove the pending change (reverting to original state)
      setPendingChanges(prev => prev.filter((_, i) => i !== existingChangeIdx));
    } else {
      // Add a new change
      setPendingChanges(prev => [
        ...prev,
        {
          requirementId: selectedRequirementId,
          testCaseId,
          action: isCurrentlyLinked ? 'unlink' : 'link',
        }
      ]);
    }
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.length === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const links = pendingChanges.filter(c => c.action === 'link').length;
      const unlinks = pendingChanges.filter(c => c.action === 'unlink').length;
      
      toast.success(`Saved ${links} new links and ${unlinks} removals`);
      setPendingChanges([]);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (pendingChanges.length > 0) {
      setPendingChanges([]);
      toast.info('Changes discarded');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Link className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Link Tests to Requirements</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Select a requirement and check tests to link or unlink
              </p>
            </div>
          </div>
          {pendingChanges.length > 0 && (
            <Badge variant="secondary" className="absolute top-6 right-12">
              {pendingChanges.length} pending change(s)
            </Badge>
          )}
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Requirements Panel */}
          <div className="w-1/2 border-r border-border flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search requirements..."
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredRequirements.map(req => {
                  const testCount = getRequirementTestCount(req.id, req.linkedTests.length);
                  const hasChanges = pendingChanges.some(c => c.requirementId === req.id);
                  
                  return (
                    <div
                      key={req.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                        selectedRequirementId === req.id 
                          ? "bg-primary/10 border border-primary/30" 
                          : "hover:bg-muted/50 border border-transparent",
                        hasChanges && "ring-1 ring-amber-500/50"
                      )}
                      onClick={() => setSelectedRequirementId(req.id)}
                    >
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{req.key}</span>
                          {hasChanges && (
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-foreground truncate">{req.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {testCount} tests
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Test Cases Panel */}
          <div className="w-1/2 flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search test cases..."
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  className="pl-9 h-9"
                  disabled={!selectedRequirementId}
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {selectedRequirementId ? (
                <div className="p-2 space-y-1">
                  {filteredTestCases.map(test => {
                    const isLinked = linkedTestIds.has(test.id);
                    const hasPendingChange = pendingChanges.some(
                      c => c.requirementId === selectedRequirementId && c.testCaseId === test.id
                    );
                    
                    return (
                      <div
                        key={test.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                          isLinked 
                            ? "bg-green-500/10 border border-green-500/30" 
                            : "hover:bg-muted/50 border border-transparent",
                          hasPendingChange && "ring-1 ring-amber-500/50"
                        )}
                        onClick={() => handleToggleLink(test.id)}
                      >
                        <Checkbox 
                          checked={isLinked}
                          onCheckedChange={() => handleToggleLink(test.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <TestTube2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{test.key}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5">
                              {test.type}
                            </Badge>
                            {hasPendingChange && (
                              <span className="text-xs text-amber-500">
                                (pending)
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground truncate">{test.title}</p>
                        </div>
                        {isLinked && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <FileText className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground">Select a requirement</p>
                  <p className="text-sm text-muted-foreground">to view and manage linked test cases</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {pendingChanges.length} pending change(s)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDiscard}>
                {pendingChanges.length > 0 ? 'Discard & Close' : 'Close'}
              </Button>
              <Button 
                onClick={handleSaveChanges} 
                disabled={pendingChanges.length === 0 || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
