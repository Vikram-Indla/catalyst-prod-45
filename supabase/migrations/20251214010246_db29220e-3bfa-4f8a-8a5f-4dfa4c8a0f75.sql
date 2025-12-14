-- Create capacity_bookings table for storing resource assignments
CREATE TABLE public.capacity_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.resource_inventory(id) ON DELETE CASCADE,
  booking_type TEXT NOT NULL CHECK (booking_type IN ('ticket', 'task', 'leave')),
  business_request_id UUID REFERENCES public.business_requests(id) ON DELETE SET NULL,
  summary TEXT, -- For ad-hoc tasks or leave reason
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'planned',
  priority TEXT DEFAULT 'medium',
  quarter TEXT,
  rank INTEGER,
  kickoff_date DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create capacity_view_config table for storing user view preferences
CREATE TABLE public.capacity_view_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  resource_ids UUID[] DEFAULT '{}',
  time_span TEXT DEFAULT '2weeks' CHECK (time_span IN ('2weeks', '5weeks')),
  view_mode TEXT DEFAULT 'gantt' CHECK (view_mode IN ('gantt', 'list')),
  group_by TEXT DEFAULT 'none',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.capacity_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacity_view_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for capacity_bookings (all authenticated users can view and manage)
CREATE POLICY "Authenticated users can view all bookings"
  ON public.capacity_bookings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create bookings"
  ON public.capacity_bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update bookings"
  ON public.capacity_bookings FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete bookings"
  ON public.capacity_bookings FOR DELETE
  TO authenticated
  USING (true);

-- RLS policies for capacity_view_config (users manage their own config)
CREATE POLICY "Users can view their own view config"
  ON public.capacity_view_config FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own view config"
  ON public.capacity_view_config FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own view config"
  ON public.capacity_view_config FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own view config"
  ON public.capacity_view_config FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_capacity_bookings_updated_at
  BEFORE UPDATE ON public.capacity_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_capacity_view_config_updated_at
  BEFORE UPDATE ON public.capacity_view_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();