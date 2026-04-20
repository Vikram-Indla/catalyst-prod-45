import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Lozenge } from '@/components/ads';
import type { LozengeAppearance } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Requirement {
  id: string;
  title: string;
  priority?: string;
  module?: string;
}

interface TestCase {
  id: string;
  caseKey: string;
  title: string;
  priority: string;
  status: string;
}

interface AddTestsToCoverageDialogProps {
  open: boolean;
  requirement: Requirement | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Mock test cases - in real implementation, fetch from Supabase
const mockUnlinkedTestCases: TestCase[] = [
  { id: 'tc-1', caseKey: 'TC-101', title: 'Verify refund request submission', priority: 'high', status: 'active' },
  { id: 'tc-2', caseKey: 'TC-102', title: 'Validate refund amount calculation', priority: 'high', status: 'active' },
  { id: 'tc-3', caseKey: 'TC-103', title: 'Check refund status updates', priority: 'medium', status: 'active' },
  { id: 'tc-4', caseKey: 'TC-104', title: 'Test partial refund processing', priority: 'high', status: 'active' },
  { id: 'tc-5', caseKey: 'TC-105', title: 'Verify refund email notification', priority: 'medium', status: 'active' },
  { id: 'tc-6', caseKey: 'TC-106', title: 'Validate GDPR data export format', priority: 'critical', status: 'active' },
  { id: 'tc-7', caseKey: 'TC-107', title: 'Test user data anonymization', priority: 'critical', status: 'active' },
  { id: 'tc-8', caseKey: 'TC-108', title: 'Verify data retention policies', priority: 'high', status: 'active' },
  { id: 'tc-9', caseKey: 'TC-109', title: 'Check payment gateway integration', priority: 'critical', status: 'active' },
  { id: 'tc-10', caseKey: 'TC-110', title: 'Test transaction logging', priority: 'medium', status: 'active' },
];

const priorityAppearance: Record<string, LozengeAppearance> = {
  critical: 'removed',
  high: 'moved',
  medium: 'inprogress',
  low: 'default',
};

export function AddTestsToCoverageDialog({ 
  open, 
  requirement, 
  onOpenChange, 
  onSuccess 
}: AddTestsToCoverageDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTests = useMemo(() => {
    return mockUnlinkedTestCases.filter(tc =>
      tc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.caseKey.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleToggleTest = (testId: string) => {
    setSelectedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTests.size === filteredTests.length) {
      setSelectedTests(new Set());
    } else {
      setSelectedTests(new Set(filteredTests.map(tc => tc.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedTests.size === 0) {
      toast.error('Please select at least one test case');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call to link tests to requirement
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast.success(`${selectedTests.size} test(s) linked to ${requirement?.id}`);
      onSuccess();
      onOpenChange(false);
      setSelectedTests(new Set());
      setSearchQuery('');
    } catch (error) {
      toast.error('Failed to link test cases');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setSelectedTests(new Set());
      setSearchQuery('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Add Tests to Requirement
          </DialogTitle>
          <DialogDescription>
            {requirement && (
              <span className="flex items-center gap-2 mt-1">
                <Lozenge appearance="default">{requirement.id}</Lozenge>
                <span className="truncate">{requirement.title}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search test cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between px-1">
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              {selectedTests.size === filteredTests.length && filteredTests.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedTests.size} of {filteredTests.length} selected
            </span>
          </div>

          {/* Test Cases List */}
          <ScrollArea className="flex-1 h-[320px] border rounded-lg">
            <div className="p-2 space-y-1">
              {filteredTests.map(tc => (
                <div
                  key={tc.id}
                  onClick={() => handleToggleTest(tc.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTests.has(tc.id)
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/50 border border-transparent'
                  }`}
                >
                  <Checkbox
                    checked={selectedTests.has(tc.id)}
                    onCheckedChange={() => handleToggleTest(tc.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-primary font-medium">{tc.caseKey}</span>
                      <Lozenge appearance={priorityAppearance[tc.priority] ?? 'default'}>
                        {tc.priority}
                      </Lozenge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{tc.title}</p>
                  </div>
                  {selectedTests.has(tc.id) && (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
              ))}

              {filteredTests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No test cases found matching your search
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedTests.size === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                Link {selectedTests.size > 0 ? `${selectedTests.size} ` : ''}Test{selectedTests.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
