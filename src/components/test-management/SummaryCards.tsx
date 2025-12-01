import React from 'react';
import { CheckCircle2, XCircle, FileText, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SummaryCardsProps {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalTests,
  passedTests,
  failedTests,
  passRate,
}) => {
  const cards = [
    {
      title: 'Total Tests',
      value: totalTests,
      icon: FileText,
      color: 'text-foreground',
      bgColor: 'bg-muted',
    },
    {
      title: 'Passed Tests',
      value: passedTests,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Failed Tests',
      value: failedTests,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Pass Rate',
      value: `${passRate}%`,
      icon: TrendingUp,
      color: passRate >= 80 ? 'text-green-600' : passRate >= 60 ? 'text-yellow-600' : 'text-red-600',
      bgColor: passRate >= 80 ? 'bg-green-50' : passRate >= 60 ? 'bg-yellow-50' : 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
                <p className="text-4xl font-bold text-foreground">{card.value}</p>
              </div>
              <div className={`p-3 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
