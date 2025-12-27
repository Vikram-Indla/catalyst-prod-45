/**
 * Cleanup Section - Remove loaded mock data
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { MockRun } from '@/hooks/useMockDataRuns';

interface CleanupSectionProps {
  run: MockRun;
  onCleanup: (includeRelated: boolean) => Promise<void>;
  isLoading: boolean;
}

export function CleanupSection({ run, onCleanup, isLoading }: CleanupSectionProps) {
  const [includeRelated, setIncludeRelated] = useState(false);

  const isCleanedUp = run.status === 'cleaned';

  if (isCleanedUp) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-green-800 dark:text-green-200">Cleanup Complete</h3>
          <p className="text-sm text-green-600 dark:text-green-400 mt-2">
            All mock data from this run has been removed.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Completed: {run.current_step}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" />
          Cleanup Loaded Data
        </CardTitle>
        <CardDescription>
          Remove all data created by this mock data run
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Warning: This action cannot be undone
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              This will permanently remove all entities created by this run.
            </p>
          </div>
          <Badge variant="outline" className="bg-background">
            Run ID: {run.id.slice(0, 8)}...
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeRelated"
            checked={includeRelated}
            onCheckedChange={(checked) => setIncludeRelated(!!checked)}
          />
          <Label htmlFor="includeRelated" className="text-sm">
            Include attachments, comments, and history
          </Label>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Cleanup Loaded Data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all data created by this run.
                {includeRelated && (
                  <span className="block mt-2 font-medium text-destructive">
                    Including all attachments, comments, and history.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onCleanup(includeRelated)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirm Cleanup
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
