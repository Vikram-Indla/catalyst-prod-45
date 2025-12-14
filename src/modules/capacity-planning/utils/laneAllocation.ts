import { CapacityBooking } from '../hooks/useCapacityBookings';
import { isAfter, isBefore, startOfDay, addDays } from 'date-fns';

export interface LaneBooking extends CapacityBooking {
  lane: number;
}

export interface ResourceWithLanes {
  resourceId: string;
  bookings: LaneBooking[];
  laneCount: number;
  hasOverlaps: boolean;
  overlapCount: number;
}

/**
 * Greedy lane allocation algorithm for overlapping bookings
 * Places each booking in the first available lane where it doesn't overlap
 */
export function allocateLanes(
  bookings: CapacityBooking[],
  startDate: Date,
  endDate: Date
): LaneBooking[] {
  if (bookings.length === 0) return [];

  // Filter to only include bookings that overlap with the visible range
  const visibleBookings = bookings.filter(b => {
    const bStart = startOfDay(new Date(b.start_date));
    const bEnd = startOfDay(new Date(b.end_date));
    const rangeStart = startOfDay(startDate);
    const rangeEnd = startOfDay(endDate);
    
    return !(isAfter(bStart, rangeEnd) || isBefore(bEnd, rangeStart));
  });

  // Sort by start date
  const sorted = [...visibleBookings].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  // Track the end date of each lane
  const laneEnds: Date[] = [];
  
  const result: LaneBooking[] = sorted.map(booking => {
    const bookingStart = startOfDay(new Date(booking.start_date));
    
    // Find the first lane where this booking fits
    let assignedLane = -1;
    for (let i = 0; i < laneEnds.length; i++) {
      if (!isAfter(laneEnds[i], bookingStart)) {
        assignedLane = i;
        break;
      }
    }

    // If no lane fits, create a new one
    if (assignedLane === -1) {
      assignedLane = laneEnds.length;
      laneEnds.push(startOfDay(new Date(booking.end_date)));
    } else {
      laneEnds[assignedLane] = startOfDay(new Date(booking.end_date));
    }

    return {
      ...booking,
      lane: assignedLane,
    };
  });

  return result;
}

/**
 * Group bookings by resource and allocate lanes for each resource
 */
export function groupBookingsByResourceWithLanes(
  bookings: CapacityBooking[],
  startDate: Date,
  endDate: Date
): Map<string, ResourceWithLanes> {
  const resourceMap = new Map<string, CapacityBooking[]>();
  
  // Group bookings by resource
  bookings.forEach(booking => {
    const existing = resourceMap.get(booking.resource_id) || [];
    existing.push(booking);
    resourceMap.set(booking.resource_id, existing);
  });

  // Allocate lanes for each resource
  const result = new Map<string, ResourceWithLanes>();
  
  resourceMap.forEach((resourceBookings, resourceId) => {
    const laneBookings = allocateLanes(resourceBookings, startDate, endDate);
    const laneCount = laneBookings.reduce((max, b) => Math.max(max, b.lane + 1), 0);
    const hasOverlaps = laneCount > 1;
    
    // Count actual overlaps
    let overlapCount = 0;
    if (hasOverlaps) {
      for (let i = 0; i < laneBookings.length; i++) {
        for (let j = i + 1; j < laneBookings.length; j++) {
          const a = laneBookings[i];
          const b = laneBookings[j];
          const aStart = new Date(a.start_date);
          const aEnd = new Date(a.end_date);
          const bStart = new Date(b.start_date);
          const bEnd = new Date(b.end_date);
          
          if (!(isAfter(aStart, bEnd) || isBefore(aEnd, bStart))) {
            overlapCount++;
          }
        }
      }
    }

    result.set(resourceId, {
      resourceId,
      bookings: laneBookings,
      laneCount,
      hasOverlaps,
      overlapCount,
    });
  });

  return result;
}

/**
 * Get the overlap info for a specific resource
 */
export function getOverlapInfo(
  bookings: CapacityBooking[],
  startDate: Date,
  endDate: Date
): { overlappingIds: string[] }[] {
  const overlaps: { overlappingIds: string[] }[] = [];
  
  for (let i = 0; i < bookings.length; i++) {
    const a = bookings[i];
    const aStart = new Date(a.start_date);
    const aEnd = new Date(a.end_date);
    const overlappingIds: string[] = [];

    for (let j = 0; j < bookings.length; j++) {
      if (i === j) continue;
      const b = bookings[j];
      const bStart = new Date(b.start_date);
      const bEnd = new Date(b.end_date);
      
      if (!(isAfter(aStart, bEnd) || isBefore(aEnd, bStart))) {
        overlappingIds.push(b.id);
      }
    }

    if (overlappingIds.length > 0) {
      overlaps.push({ overlappingIds });
    }
  }

  return overlaps;
}

/**
 * Calculate availability metrics for a resource
 */
export function calculateAvailability(
  bookings: CapacityBooking[],
  startDate: Date,
  daysToCheck: number = 14
): {
  freeDays: number;
  utilizationPercent: number;
  nextFreeDate: Date | null;
  largestFreeWindow: number;
} {
  const endDate = addDays(startDate, daysToCheck);
  
  // Create a set of booked days
  const bookedDays = new Set<string>();
  
  bookings.forEach(booking => {
    const bStart = new Date(booking.start_date);
    const bEnd = new Date(booking.end_date);
    
    let current = isBefore(bStart, startDate) ? startDate : bStart;
    while (!isAfter(current, bEnd) && !isAfter(current, endDate)) {
      bookedDays.add(current.toISOString().split('T')[0]);
      current = addDays(current, 1);
    }
  });

  // Calculate metrics
  let freeDays = 0;
  let nextFreeDate: Date | null = null;
  let currentFreeWindow = 0;
  let largestFreeWindow = 0;
  
  let current = startDate;
  for (let i = 0; i < daysToCheck; i++) {
    const dateKey = current.toISOString().split('T')[0];
    if (!bookedDays.has(dateKey)) {
      freeDays++;
      currentFreeWindow++;
      if (!nextFreeDate) {
        nextFreeDate = current;
      }
      if (currentFreeWindow > largestFreeWindow) {
        largestFreeWindow = currentFreeWindow;
      }
    } else {
      currentFreeWindow = 0;
    }
    current = addDays(current, 1);
  }

  const utilizationPercent = Math.round(((daysToCheck - freeDays) / daysToCheck) * 100);

  return {
    freeDays,
    utilizationPercent,
    nextFreeDate,
    largestFreeWindow,
  };
}
