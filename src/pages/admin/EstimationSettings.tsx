import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Estimation Settings Page - Configure estimation methods and scales
 * Source: Administration guide PDF, Page 25
 */
export default function EstimationSettings() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configure Estimation Settings</h1>
            <p className="text-muted-foreground mt-2">
              Configure estimation scales and methods for work items.
            </p>
          </div>
          <Button variant="default" className="bg-brand-gold hover:bg-brand-gold-hover">
            Save Settings
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Estimation Configuration</CardTitle>
            <CardDescription>
              Configure estimation scales, WSJF parameters, and calculation methods.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO: Estimation scale dropdowns (Fibonacci, T-shirt, Linear, etc.), WSJF configuration, story point mapping (needs confirmation - source: pg 25-27)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
