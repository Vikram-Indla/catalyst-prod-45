import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/**
 * Configure Progress Bars Page - Progress alert thresholds configuration
 * Source: Administration guide PDF, Page 23
 */
export default function ProgressBars() {
  const timeElapsedValues = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  const defaultLateThresholds = [0, 0, 0, 0, 0, 20, 35, 50, 70];
  const defaultWarningThresholds = [0, 0, 0, 10, 20, 35, 50, 65, 80];

  const handleSave = () => {
    toast.success('Progress bar thresholds saved successfully');
  };

  return (
    <AdminGuard>
      <div className="h-full w-full flex flex-col bg-background">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Progress Bars Configuration</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Set progress alert thresholds for Late (red) and Warning (yellow) indicators
              </p>
            </div>
            <Button onClick={handleSave} className="bg-brand-gold hover:bg-brand-gold-hover">
              Save Configuration
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress Alert Thresholds</CardTitle>
                <CardDescription>
                  Configure Late (%) and Warning (%) thresholds based on time elapsed. Work items will show red or yellow progress bars when they fall behind these thresholds.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Threshold</TableHead>
                        {timeElapsedValues.map((value) => (
                          <TableHead key={value} className="text-center">
                            {value}%
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium text-red-600">Late (%)</TableCell>
                        {timeElapsedValues.map((_, index) => (
                          <TableCell key={index}>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={defaultLateThresholds[index]}
                              className="w-16 text-center"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-yellow-600">Warning (%)</TableCell>
                        {timeElapsedValues.map((_, index) => (
                          <TableCell key={index}>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={defaultWarningThresholds[index]}
                              className="w-16 text-center"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">How it works:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <span className="text-red-600 font-medium">Late (Red)</span>: Work item progress is significantly behind schedule</li>
                    <li>• <span className="text-yellow-600 font-medium">Warning (Yellow)</span>: Work item progress is slightly behind schedule</li>
                    <li>• Example: At 50% time elapsed, if progress is below 20%, show red; if below 35%, show yellow</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progress Calculation Settings</CardTitle>
                <CardDescription>
                  Configure how progress is calculated for different work item types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Epic Progress Calculation</Label>
                  <p className="text-sm text-muted-foreground">
                    Roll-up from child features and stories
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Feature Progress Calculation</Label>
                  <p className="text-sm text-muted-foreground">
                    Based on story points completed vs. total
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Story Progress Calculation</Label>
                  <p className="text-sm text-muted-foreground">
                    Based on task completion
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
