/**
 * Availability Calendar Component
 * Team availability heatmap for the next 14 days
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip } from '@/components/ads';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import { useAvailabilityCalendar, useDateHeaders } from '@/hooks/workload';
import { format } from 'date-fns';

interface AvailabilityCalendarProps {
  teamId: string;
}

const workloadColors = {
  low: CATALYST_V5.tealLight,
  medium: CATALYST_V5.primaryLight,
  high: CATALYST_V5.warningLight,
  overloaded: CATALYST_V5.dangerLight,
};

export function AvailabilityCalendar({ teamId }: AvailabilityCalendarProps) {
  const startDate = new Date();
  const { data: rows, isLoading } = useAvailabilityCalendar(teamId, startDate, 14);
  const headers = useDateHeaders(startDate, 14);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-48 animate-pulse bg-gray-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={{ color: CATALYST_V5.slate[900] }}>
          Team Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="flex border-b pb-2 mb-2" style={{ borderColor: CATALYST_V5.slate[200] }}>
            <div className="w-32 flex-shrink-0" />
            {headers.map((h, i) => (
              <div
                key={i}
                className="flex-1 text-center px-1"
                style={{
                  borderLeft: h.isToday ? `2px solid ${CATALYST_V5.primary}` : undefined,
                  borderRight: h.isToday ? `2px solid ${CATALYST_V5.primary}` : undefined,
                }}
              >
                <p className="text-xs font-medium" style={{ color: h.isToday ? CATALYST_V5.primary : CATALYST_V5.slate[500] }}>
                  {h.dayName}
                </p>
                <p className="text-sm" style={{ color: h.isToday ? CATALYST_V5.primary : CATALYST_V5.slate[700] }}>
                  {h.label}
                </p>
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {rows?.map((row) => (
            <div key={row.userId} className="flex items-center py-1">
              <div className="w-32 flex-shrink-0 flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                  style={{ backgroundColor: CATALYST_V5.primaryLight, color: CATALYST_V5.primary }}
                >
                  {row.initials}
                </div>
                <span className="text-sm truncate" style={{ color: CATALYST_V5.slate[700] }}>
                  {row.userName.split(' ')[0]}
                </span>
              </div>
              {row.cells.map((cell, i) => (
                <Tooltip
                  key={i}
                  content={
                    <>
                      <p className="font-medium">{row.userName}</p>
                      <p>{format(new Date(cell.date), 'MMM d, yyyy')}</p>
                      <p>{cell.isAvailable ? `${cell.availableHours}h available` : 'Unavailable'}</p>
                      {cell.testsDue > 0 && <p>{cell.testsDue} tests due</p>}
                      {cell.notes && <p className="text-xs italic">{cell.notes}</p>}
                    </>
                  }
                >
                  <div
                    className="flex-1 h-8 mx-0.5 rounded flex items-center justify-center text-xs cursor-pointer"
                    style={{
                      backgroundColor: cell.isAvailable ? workloadColors[cell.workloadLevel] : CATALYST_V5.slate[200],
                      backgroundImage: !cell.isAvailable ? 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 6px)' : undefined,
                    }}
                  >
                    {cell.isAvailable && cell.testsDue > 0 && (
                      <span style={{ color: CATALYST_V5.slate[700] }}>{cell.testsDue}</span>
                    )}
                  </div>
                </Tooltip>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
