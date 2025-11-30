import { AdminGuard } from '@/components/admin/AdminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Terminology Page - Configure SAFe/DAD/LeSS terminology sets
 * Source: Administration guide PDF, Page 14-15
 */
export default function Terminology() {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Terminology</h1>
          <p className="text-muted-foreground mt-2">
            Configure terminology sets (SAFe, DAD, LeSS) to match your processes and external tools.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Terminology Configuration</CardTitle>
            <CardDescription>
              Terminology Shown dropdown: System Default, SAFe 2.5, SAFe 3.0, SAFe 4.0, DAD, LeSS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              TODO: Terminology Shown dropdown, editable fields for general/top menu/date labels/release vehicle/financial terminology, Update Terminology button (needs confirmation - source: pg 14-15)
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Important: Must sign out and sign back in to see updates.
            </p>
            <p className="text-xs text-muted-foreground">
              Customize Pyramid Display: Select areas to display in Strategy Room pyramid (Mission, Vision, Values, North Star, Long Term Goal/Strategy, Yearly Goal). Update Pyramid button.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Record Terminology</CardTitle>
            <CardDescription>
              Configure person record terminology separately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              TODO: Editable fields for user record labels, Update Terminology button (needs confirmation - source: pg 15)
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
