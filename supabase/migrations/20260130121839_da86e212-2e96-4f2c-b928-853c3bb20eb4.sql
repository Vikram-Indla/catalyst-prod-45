-- Create task_external_links table for storing external URLs linked to tasks
CREATE TABLE public.task_external_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.planner_tasks(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Create index for fast lookup by task_id
CREATE INDEX idx_task_external_links_task_id ON public.task_external_links(task_id);

-- Enable Row Level Security
ALTER TABLE public.task_external_links ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view task links" 
ON public.task_external_links 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can create task links" 
ON public.task_external_links 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can delete task links" 
ON public.task_external_links 
FOR DELETE 
TO authenticated
USING (true);