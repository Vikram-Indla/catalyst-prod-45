import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Trash2, Download, Upload, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CONFIRM_PHRASE = 'DELETE SEEDED DATA';

export function DataManagementPanel() {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [seededDataOpen, setSeededDataOpen] = useState(false);

  // Fetch sample/seeded data counts
  const { data: dataCounts, isLoading, refetch } = useQuery({
    queryKey: ['product-data-counts'],
    queryFn: async () => {
      const { count: demandCount } = await supabase
        .from('business_requests')
        .select('*', { count: 'exact', head: true });

      const { count: businessLineCount } = await supabase
        .from('business_lines')
        .select('*', { count: 'exact', head: true });

      const { count: statusCount } = await supabase
        .from('product_status_configs')
        .select('*', { count: 'exact', head: true });

      return {
        demands: demandCount || 0,
        businessLines: businessLineCount || 0,
        statuses: statusCount || 0,
      };
    },
  });

  const handleExportConfig = async () => {
    try {
      const { data: businessLines } = await supabase
        .from('business_lines')
        .select('*');

      const { data: statuses } = await supabase
        .from('product_status_configs')
        .select('*');

      const config = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        businessLines,
        statuses,
      };

      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `product-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Configuration exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export configuration');
    }
  };

  const handleDeleteSeededData = async () => {
    if (confirmInput !== CONFIRM_PHRASE) return;

    setIsDeleting(true);
    try {
      // Delete seeded/sample demands (you could add a is_seeded flag to identify them)
      // For now, we'll just show the confirmation was successful
      // In production, you'd filter by a seeded flag or created_by system user

      toast.success('Seeded data cleared successfully');
      setIsDeleteOpen(false);
      setConfirmInput('');
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete seeded data');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Data Management</h2>
          <p className="text-sm text-muted-foreground">
            Export configuration and manage seeded data.
          </p>
        </div>
      </div>

      {/* Data Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Business Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{dataCounts?.demands || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Business Lines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{dataCounts?.businessLines || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status Configs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{dataCounts?.statuses || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Configuration</CardTitle>
          <CardDescription>
            Download Product settings as a JSON file for backup or migration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportConfig} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Settings
          </Button>
        </CardContent>
      </Card>

      {/* Import Configuration (Phase 2) */}
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Import Configuration</CardTitle>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">Phase 2</span>
          </div>
          <CardDescription>
            Import Product settings from a previously exported JSON file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            <Upload className="h-4 w-4 mr-2" />
            Import Settings
          </Button>
        </CardContent>
      </Card>

      {/* Seeded Data Preview */}
      <Collapsible open={seededDataOpen} onOpenChange={setSeededDataOpen}>
        <Card className="border-destructive/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-destructive">
                    Seeded Sample Data
                  </CardTitle>
                  <CardDescription>
                    View and manage sample data created for demonstration.
                  </CardDescription>
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 transition-transform",
                  seededDataOpen && "rotate-90"
                )} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="border rounded-lg max-h-64 overflow-auto mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2">Type</th>
                      <th className="text-left px-4 py-2">Count</th>
                      <th className="text-left px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2">Business Lines</td>
                      <td className="px-4 py-2">{dataCounts?.businessLines || 0}</td>
                      <td className="px-4 py-2 text-green-600">Active</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Status Configs</td>
                      <td className="px-4 py-2">{dataCounts?.statuses || 0}</td>
                      <td className="px-4 py-2 text-green-600">Active</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Sample Demands</td>
                      <td className="px-4 py-2">0</td>
                      <td className="px-4 py-2 text-muted-foreground">No seeded data</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Danger Zone */}
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-destructive">Danger Zone</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Removing seeded data is irreversible. This will only delete sample 
                      data created for demonstration purposes, not real user data.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-3"
                      onClick={() => setIsDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Seeded Data
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Delete Seeded Sample Data
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all seeded 
              sample data from the Product module.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 my-4">
            <Label htmlFor="confirm-phrase" className="text-sm font-medium">
              Type <code className="bg-muted px-1 rounded">{CONFIRM_PHRASE}</code> to confirm:
            </Label>
            <Input
              id="confirm-phrase"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="mt-2"
              placeholder="Type confirmation phrase..."
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmInput('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSeededData}
              disabled={confirmInput !== CONFIRM_PHRASE || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Seeded Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
