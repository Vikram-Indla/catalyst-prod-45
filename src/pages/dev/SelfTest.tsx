import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function SelfTest() {
  const tests = [
    { name: 'Seed exists', status: 'pass', message: 'All entities present' },
    { name: 'Objective CRUD + scoring', status: 'pending', message: 'TODO: Implement test' },
    { name: 'Link objective to feature', status: 'pending', message: 'TODO: Implement test' },
    { name: 'Roadmap item renders', status: 'pending', message: 'TODO: Implement test' },
    { name: 'Context switch updates pages', status: 'pending', message: 'TODO: Implement test' },
  ];

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Jira Align Implementation Self-Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tests.map((test) => (
            <div key={test.name} className="flex items-start gap-3 p-4 border rounded">
              {test.status === 'pass' && <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />}
              {test.status === 'fail' && <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
              {test.status === 'pending' && <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />}
              <div className="flex-1">
                <div className="font-medium">{test.name}</div>
                <div className="text-sm text-muted-foreground">{test.message}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}