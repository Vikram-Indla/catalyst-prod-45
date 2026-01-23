/**
 * License Gantt Chart - Visual timeline of license renewals
 */

import React, { useMemo } from 'react';
import { format, startOfYear, endOfYear, differenceInDays, addMonths, isBefore, isAfter } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatSAR } from '../hooks/useResourceCost';
import type { SoftwareLicenseWithAllocation } from '../types';

interface LicenseGanttChartProps {
  licenses: SoftwareLicenseWithAllocation[];
}

export function LicenseGanttChart({ licenses }: LicenseGanttChartProps) {
  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date(currentYear, 0, 1));
  const yearEnd = endOfYear(new Date(currentYear, 0, 1));
  const totalDays = differenceInDays(yearEnd, yearStart);

  // Generate month labels
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = addMonths(yearStart, i);
      return {
        label: format(date, 'MMM'),
        position: (i / 12) * 100,
      };
    });
  }, [yearStart]);

  // Filter licenses with renewal dates and sort by renewal date
  const licensesWithRenewals = useMemo(() => {
    return licenses
      .filter(l => l.renewal_date)
      .sort((a, b) => new Date(a.renewal_date!).getTime() - new Date(b.renewal_date!).getTime());
  }, [licenses]);

  // Calculate bar position and width for each license
  const getBarStyle = (startDate: string | null, renewalDate: string) => {
    const renewal = new Date(renewalDate);
    const today = new Date();
    
    // Bar starts from start_date (or year start if before, or today if no start_date)
    let barStart: Date;
    if (startDate) {
      const start = new Date(startDate);
      barStart = isBefore(start, yearStart) ? yearStart : start;
    } else {
      barStart = isBefore(today, yearStart) ? yearStart : today;
    }
    
    // Bar ends at renewal date (capped at year end)
    const barEnd = isAfter(renewal, yearEnd) ? yearEnd : renewal;
    
    // If renewal is before bar start, show a small indicator at the renewal date
    if (isBefore(renewal, barStart)) {
      const renewalPosition = Math.max(0, (differenceInDays(renewal, yearStart) / totalDays) * 100);
      return {
        left: `${renewalPosition}%`,
        width: '4px',
        isExpired: true,
      };
    }
    
    const startPosition = (differenceInDays(barStart, yearStart) / totalDays) * 100;
    const endPosition = (differenceInDays(barEnd, yearStart) / totalDays) * 100;
    const width = endPosition - startPosition;
    
    return {
      left: `${Math.max(0, startPosition)}%`,
      width: `${Math.max(2, width)}%`,
      isExpired: false,
    };
  };

  // Get color based on how soon renewal is
  const getBarColor = (renewalDate: string) => {
    const renewal = new Date(renewalDate);
    const today = new Date();
    const daysUntil = differenceInDays(renewal, today);
    
    if (daysUntil < 0) return 'bg-red-400'; // Expired
    if (daysUntil <= 30) return 'bg-red-500'; // Critical
    if (daysUntil <= 90) return 'bg-amber-500'; // Warning
    return 'bg-blue-500'; // OK
  };

  if (licensesWithRenewals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">License Renewal Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No licenses with renewal dates to display
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">License Renewal Timeline — {currentYear}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Month headers */}
          <div className="flex items-center mb-4">
            <div className="w-40 flex-shrink-0" /> {/* Spacer for license names */}
            <div className="flex-1 relative h-6 border-b border-border">
              {months.map((month) => (
                <div
                  key={month.label}
                  className="absolute text-xs text-muted-foreground"
                  style={{ left: `${month.position}%` }}
                >
                  {month.label}
                </div>
              ))}
            </div>
          </div>

          {/* License rows */}
          {licensesWithRenewals.map((license) => {
            const barStyle = getBarStyle(license.start_date, license.renewal_date!);
            const barColor = getBarColor(license.renewal_date!);
            const monthlyCost = license.annual_cost / 12;

            return (
              <div key={license.id} className="flex items-center gap-2 py-1.5">
                {/* License name */}
                <div className="w-40 flex-shrink-0 truncate text-sm font-medium" title={license.name}>
                  {license.name}
                </div>
                
                {/* Timeline bar */}
                <div className="flex-1 relative h-7 bg-muted/30 rounded">
                  {/* Month grid lines */}
                  {months.map((month) => (
                    <div
                      key={month.label}
                      className="absolute top-0 bottom-0 w-px bg-border/50"
                      style={{ left: `${month.position}%` }}
                    />
                  ))}
                  
                  {/* The bar */}
                  <div
                    className={`absolute top-1 bottom-1 ${barColor} rounded flex items-center justify-center transition-all`}
                    style={{
                      left: barStyle.left,
                      width: barStyle.width,
                      minWidth: barStyle.isExpired ? '4px' : '60px',
                    }}
                  >
                    {!barStyle.isExpired && (
                      <span className="text-[10px] font-medium text-white truncate px-1">
                        {formatSAR(monthlyCost)}/mo
                      </span>
                    )}
                  </div>

                  {/* Today marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-foreground/60"
                    style={{
                      left: `${(differenceInDays(new Date(), yearStart) / totalDays) * 100}%`,
                    }}
                  />
                </div>

                {/* Renewal date */}
                <div className="w-20 flex-shrink-0 text-xs text-muted-foreground text-right">
                  {format(new Date(license.renewal_date!), 'MMM d')}
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>90+ days</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span>30-90 days</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>&lt;30 days</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-400" />
              <span>Expired</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="w-0.5 h-3 bg-foreground/60" />
              <span>Today</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
