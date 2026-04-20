/**
 * Bulk Move Dialog
 * Moves selected test cases to a different release
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FolderInput, Check, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import type { LozengeAppearance } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Release {
  id: string;
  name: string;
  version: string;
  status: 'planning' | 'active' | 'released';
  testCaseCount: number;
}

interface BulkMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  currentRelease?: string;
  onMove: (releaseId: string) => void;
}

// Mock releases - in real app, fetch from API
const RELEASES: Release[] = [
  { id: '1', name: 'Investment Portal', version: 'REL-26.01.01', status: 'active', testCaseCount: 47 },
  { id: '2', name: 'Licensing Module', version: 'REL-26.01.02', status: 'planning', testCaseCount: 23 },
  { id: '3', name: 'Security Patch', version: 'REL-25.12.01', status: 'released', testCaseCount: 12 },
  { id: '4', name: 'Mobile App v2', version: 'REL-26.02.01', status: 'planning', testCaseCount: 0 },
  { id: '5', name: 'Performance Update', version: 'REL-26.01.03', status: 'active', testCaseCount: 8 },
];

const statusAppearance: Record<Release['status'], LozengeAppearance> = {
  planning: 'inprogress',
  active: 'success',
  released: 'default',
};

export function BulkMoveDialog({
  open,
  onOpenChange,
  selectedCount,
  currentRelease,
  onMove,
}: BulkMoveDialogProps) {
  const [selectedRelease, setSelectedRelease] = useState<string | null>(null);

  const handleMove = () => {
    if (selectedRelease) {
      onMove(selectedRelease);
      onOpenChange(false);
      setSelectedRelease(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-muted rounded-lg">
              <FolderInput className="w-5 h-5" />
            </div>
            Move to Release
          </DialogTitle>
          <DialogDescription>
            Move {selectedCount} test case{selectedCount > 1 ? 's' : ''} to another release
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[320px] -mx-6 px-6">
          <div className="space-y-2">
            {RELEASES.map((release, index) => {
              const isCurrent = release.version === currentRelease;
              return (
                <motion.button
                  key={release.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => !isCurrent && setSelectedRelease(release.id)}
                  disabled={isCurrent}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 rounded-lg text-left transition-all",
                    "border",
                    isCurrent && "opacity-50 cursor-not-allowed bg-muted/30",
                    !isCurrent && "hover:bg-muted/70 cursor-pointer",
                    selectedRelease === release.id && "bg-primary/10 ring-2 ring-primary border-primary"
                  )}
                >
                  <div className="p-2 bg-muted rounded-lg shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{release.name}</span>
                      {isCurrent && (
                        <Lozenge appearance="default">Current</Lozenge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">{release.version}</span>
                      <Lozenge appearance={statusAppearance[release.status]}>
                        {release.status}
                      </Lozenge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {release.testCaseCount} test cases
                    </div>
                  </div>
                  {selectedRelease === release.id && (
                    <Check className="w-4 h-4 text-primary mt-1" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={!selectedRelease}>
            Move {selectedCount} Test Case{selectedCount > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
