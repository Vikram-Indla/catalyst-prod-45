import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TestTube } from 'lucide-react';

export function TestCyclesPage() {
  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-2xl border-border">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-brand-gold/10">
                <TestTube className="h-12 w-12 text-brand-gold" />
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground">Test Cycles</CardTitle>
            <CardDescription className="text-base text-muted-foreground mt-2">
              Test cycle management coming in Phase 3
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              This feature will allow you to organize test cases into cycles for systematic execution and tracking.
            </p>
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Expected features: Cycle creation, test case assignment, execution tracking, and progress reporting
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
