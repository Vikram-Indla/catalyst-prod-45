import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CapacityBooking {
  id: string;
  resource_id: string;
  booking_type: 'ticket' | 'task' | 'leave';
  business_request_id: string | null;
  summary: string | null;
  start_date: string;
  end_date: string;
  status: string | null;
  priority: string | null;
  quarter: string | null;
  rank: number | null;
  kickoff_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  business_request?: {
    id: string;
    request_key: string | null;
    title: string;
  } | null;
  resource?: {
    id: string;
    name: string;
    role_code: string | null;
  } | null;
}

export function useCapacityBookings() {
  return useQuery({
    queryKey: ['capacity-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capacity_bookings')
        .select(`
          *,
          business_request:business_requests(id, request_key, title),
          resource:resource_inventory(id, name, role_code)
        `)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return (data || []) as CapacityBooking[];
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      resource_id: string;
      booking_type: 'ticket' | 'task' | 'leave';
      business_request_id?: string | null;
      summary?: string | null;
      start_date: string;
      end_date: string;
      status?: string;
      priority?: string;
      quarter?: string;
      rank?: number;
      kickoff_date?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from('capacity_bookings')
        .insert({
          ...data,
          created_by: user.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Booking created');
      queryClient.invalidateQueries({ queryKey: ['capacity-bookings'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create booking: ${error.message}`);
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      start_date?: string;
      end_date?: string;
      summary?: string;
      status?: string;
      priority?: string;
      quarter?: string;
      rank?: number;
      kickoff_date?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('capacity_bookings')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast.success('Booking updated');
      queryClient.invalidateQueries({ queryKey: ['capacity-bookings'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update booking: ${error.message}`);
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('capacity_bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Booking deleted');
      queryClient.invalidateQueries({ queryKey: ['capacity-bookings'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete booking: ${error.message}`);
    },
  });
}
