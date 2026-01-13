-- Add attachment_id column to tm_defect_links table
ALTER TABLE public.tm_defect_links
ADD COLUMN attachment_id uuid REFERENCES public.step_result_attachments(id) ON DELETE SET NULL;

-- Create index for the new column
CREATE INDEX idx_tm_defect_links_attachment_id ON public.tm_defect_links(attachment_id);

-- Add comment explaining the column
COMMENT ON COLUMN public.tm_defect_links.attachment_id IS 'Reference to evidence attachment that the defect was created from';