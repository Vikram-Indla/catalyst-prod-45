import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Users, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResourceInventoryItem } from '@/hooks/useResourceInventory';
import { CapacityBooking } from '../hooks/useCapacityBookings';
import { differenceInDays, isAfter, isBefore, startOfDay } from 'date-fns';

interface InsightsPanelProps {
  resources: ResourceInventoryItem[];
  bookings: CapacityBooking[];
  visible: boolean;
}

interface InsightCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function InsightCard({ title, icon, children, defaultOpen = true }: InsightCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-background rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }}>
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-semibold text-muted-foreground uppercase">{title}</span>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function InsightsPanel({ resources, bookings, visible }: InsightsPanelProps) {
  const today = startOfDay(new Date());

  const stats = useMemo(() => {
    const activeBookings = bookings.filter(b => 
      !isAfter(new Date(b.start_date), today) && !isBefore(new Date(b.end_date), today)
    );

    const upcomingBookings = bookings.filter(b => 
      isAfter(new Date(b.start_date), today)
    );

    const overdueBookings = bookings.filter(b => 
      isBefore(new Date(b.end_date), today) && b.status !== 'completed'
    );

    const availableResources = resources.filter(r => {
      const hasActiveBooking = bookings.some(b => 
        b.resource_id === r.id &&
        !isAfter(new Date(b.start_date), today) && 
        !isBefore(new Date(b.end_date), today)
      );
      return !hasActiveBooking;
    });

    const bookingsByType = {
      ticket: bookings.filter(b => b.booking_type === 'ticket').length,
      task: bookings.filter(b => b.booking_type === 'task').length,
      leave: bookings.filter(b => b.booking_type === 'leave').length,
    };

    return {
      totalResources: resources.length,
      activeBookings: activeBookings.length,
      upcomingBookings: upcomingBookings.length,
      overdueBookings: overdueBookings.length,
      availableResources: availableResources.length,
      bookingsByType,
    };
  }, [resources, bookings, today]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [bookings]);

  if (!visible) return null;

  return (
    <aside 
      className="w-[280px] flex-shrink-0 border-l bg-muted/30 p-4 space-y-4 overflow-y-auto hidden lg:block"
      style={{ borderColor: 'hsl(var(--border))' }}
    >
      {/* Summary Stats */}
      <InsightCard 
        title="Overview" 
        icon={<Users className="h-4 w-4 text-secondary-green" />}
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-md p-2">
            <div className="text-lg font-bold text-secondary-green">{stats.totalResources}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Resources</div>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <div className="text-lg font-bold text-brand-gold">{stats.activeBookings}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Active</div>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <div className="text-lg font-bold text-blue-600">{stats.upcomingBookings}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Upcoming</div>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <div className="text-lg font-bold text-green-600">{stats.availableResources}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Available</div>
          </div>
        </div>
      </InsightCard>

      {/* Booking Types */}
      <InsightCard 
        title="By Type" 
        icon={<Calendar className="h-4 w-4 text-brand-gold" />}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-gold" />
              <span className="text-sm">Tickets</span>
            </div>
            <span className="text-sm font-medium">{stats.bookingsByType.ticket}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="text-sm">Tasks</span>
            </div>
            <span className="text-sm font-medium">{stats.bookingsByType.task}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-sm">Leave</span>
            </div>
            <span className="text-sm font-medium">{stats.bookingsByType.leave}</span>
          </div>
        </div>
      </InsightCard>

      {/* Alerts */}
      {stats.overdueBookings > 0 && (
        <InsightCard 
          title="Alerts" 
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
        >
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">
              {stats.overdueBookings} overdue booking{stats.overdueBookings > 1 ? 's' : ''}
            </span>
          </div>
        </InsightCard>
      )}

      {/* Recent Activity */}
      <InsightCard 
        title="Recent" 
        icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
        defaultOpen={false}
      >
        {recentBookings.length > 0 ? (
          <div className="space-y-2">
            {recentBookings.map(booking => (
              <div 
                key={booking.id}
                className="p-2 bg-muted/50 rounded-md hover:bg-brand-gold/10 cursor-pointer transition-colors"
              >
                <div className="text-sm font-medium truncate">
                  {booking.booking_type === 'ticket' 
                    ? booking.business_request?.request_key || booking.business_request?.title
                    : booking.summary || 'Leave'}
                </div>
                <div className="text-[10px] text-muted-foreground capitalize">
                  {booking.booking_type} • {booking.status || 'planned'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">No recent activity</p>
        )}
      </InsightCard>
    </aside>
  );
}
