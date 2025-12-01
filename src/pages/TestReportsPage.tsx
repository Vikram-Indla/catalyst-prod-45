import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export function TestReportsPage() {
  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-2xl border-border">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-brand-gold/10">
                <BarChart3 className="h-12 w-12 text-brand-gold" />
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground">Test Reports</CardTitle>
            <CardDescription className="text-base text-muted-foreground mt-2">
              Test reporting dashboard coming in Phase 3
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              This feature will provide comprehensive analytics and insights on test execution and quality metrics.
            </p>
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Expected features: Pass/fail rates, trend analysis, test coverage, defect tracking, and custom reports
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
