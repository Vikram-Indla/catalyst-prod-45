
-- Work item type icon configuration table
-- Stores official Jira-style SVG icons for each issue type
CREATE TABLE public.ph_issue_type_icons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_type TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  bg_color TEXT NOT NULL,
  svg_path TEXT NOT NULL,
  svg_viewbox TEXT NOT NULL DEFAULT '0 0 16 16',
  category TEXT NOT NULL DEFAULT 'standard',
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ph_issue_type_icons ENABLE ROW LEVEL SECURITY;

-- Everyone can read icons
CREATE POLICY "Anyone can read issue type icons"
  ON public.ph_issue_type_icons FOR SELECT USING (true);

-- Insert official Jira issue type icons (exact SVG paths from Atlassian)

-- Epic: Purple lightning bolt (#904EE2)
INSERT INTO public.ph_issue_type_icons (issue_type, label, color, bg_color, svg_path, category, sort_order) VALUES
('Epic', 'Epic', '#FFFFFF', '#904EE2',
 'M5.9233,3.7566 L5.9213,3.7526 C5.9673,3.6776 6.0003,3.5946 6.0003,3.4996 C6.0003,3.2236 5.7763,2.9996 5.5003,2.9996 L3.0003,2.9996 L3.0003,0.4996 C3.0003,0.2236 2.7763,-0.0004 2.5003,-0.0004 C2.3283,-0.0004 2.1853,0.0916 2.0953,0.2226 C2.0673,0.2636 2.0443,0.3056 2.0293,0.3526 L0.0813,4.2366 L0.0833,4.2396 C0.0353,4.3166 0.0003,4.4026 0.0003,4.4996 C0.0003,4.7766 0.2243,4.9996 0.5003,4.9996 L3.0003,4.9996 L3.0003,7.4996 C3.0003,7.7766 3.2243,7.9996 3.5003,7.9996 C3.6793,7.9996 3.8293,7.9006 3.9183,7.7586 L3.9213,7.7596 L3.9343,7.7336 C3.9453,7.7126 3.9573,7.6936 3.9653,7.6716 L5.9233,3.7566 Z',
 'standard', 1);

-- Story: Green bookmark (#63BA3C)
INSERT INTO public.ph_issue_type_icons (issue_type, label, color, bg_color, svg_path, category, sort_order) VALUES
('Story', 'Story', '#FFFFFF', '#63BA3C',
 'M9,3 L5,3 C4.448,3 4,3.448 4,4 L4,10.5 C4,10.776 4.224,11 4.5,11 C4.675,11 4.821,10.905 4.91,10.769 L4.914,10.77 L6.84,8.54 C6.92,8.434 7.08,8.434 7.16,8.54 L9.086,10.77 L9.09,10.769 C9.179,10.905 9.325,11 9.5,11 C9.776,11 10,10.776 10,10.5 L10,4 C10,3.448 9.552,3 9,3',
 'standard', 2);

-- Task: Blue checkmark (#4BADE8)
INSERT INTO public.ph_issue_type_icons (issue_type, label, color, bg_color, svg_path, category, sort_order) VALUES
('Task', 'Task', '#FFFFFF', '#4BADE8',
 'STROKE:M6,9.5 L10,4.5|M6,9.5 L4,7.5',
 'standard', 3);

-- Sub-task: Blue overlapping squares (#4BAEE8)
INSERT INTO public.ph_issue_type_icons (issue_type, label, color, bg_color, svg_path, category, sort_order) VALUES
('Sub-task', 'Sub-task', '#FFFFFF', '#4BAEE8',
 'RECTS:3,3,5,5,0.8|6,6,5,5,0.8,filled',
 'standard', 4);

-- Defect/Bug: Red circle (#E5493A)
INSERT INTO public.ph_issue_type_icons (issue_type, label, color, bg_color, svg_path, category, sort_order) VALUES
('Defect', 'Defect', '#FFFFFF', '#E5493A',
 'M10,7 C10,8.657 8.657,10 7,10 C5.343,10 4,8.657 4,7 C4,5.343 5.343,4 7,4 C8.657,4 10,5.343 10,7',
 'standard', 5);

-- Bug (alias for Defect)
INSERT INTO public.ph_issue_type_icons (issue_type, label, color, bg_color, svg_path, category, sort_order) VALUES
('Bug', 'Bug', '#FFFFFF', '#E5493A',
 'M10,7 C10,8.657 8.657,10 7,10 C5.343,10 4,8.657 4,7 C4,5.343 5.343,4 7,4 C8.657,4 10,5.343 10,7',
 'standard', 5);

-- QA Bug (same as Bug)
INSERT INTO public.ph_issue_type_icons (issue_type, label, color, bg_color, svg_path, category, sort_order) VALUES
('QA Bug', 'QA Bug', '#FFFFFF', '#E5493A',
 'M10,7 C10,8.657 8.657,10 7,10 C5.343,10 4,8.657 4,7 C4,5.343 5.343,4 7,4 C8.657,4 10,5.343 10,7',
 'standard', 5);

-- Production Incident: Orange/red warning (#FF5630)
INSERT INTO public.ph_issue_type_icons (issue_type, label, color, bg_color, svg_path, category, sort_order) VALUES
('Production Incident', 'Incident', '#FFFFFF', '#FF5630',
 'M7.5,3 L12,11 L3,11 Z|M7.5,6 L7.5,8.5|M7.5,9.5 L7.5,10',
 'standard', 6);

-- Business Request: Teal (#00B8D9)
INSERT INTO public.ph_issue_type_icons (issue_type, label, color, bg_color, svg_path, category, sort_order) VALUES
('Business Request', 'Business Request', '#FFFFFF', '#00B8D9',
 'M9,3 L5,3 C4.448,3 4,3.448 4,4 L4,10.5 C4,10.776 4.224,11 4.5,11 C4.675,11 4.821,10.905 4.91,10.769 L4.914,10.77 L6.84,8.54 C6.92,8.434 7.08,8.434 7.16,8.54 L9.086,10.77 L9.09,10.769 C9.179,10.905 9.325,11 9.5,11 C9.776,11 10,10.776 10,10.5 L10,4 C10,3.448 9.552,3 9,3',
 'standard', 7);

-- Change Request: Orange (#FF991F)
INSERT INTO public.ph_issue_type_icons (issue_type, label, color, bg_color, svg_path, category, sort_order) VALUES
('Change Request', 'Change Request', '#FFFFFF', '#FF991F',
 'M9,3 L5,3 C4.448,3 4,3.448 4,4 L4,10.5 C4,10.776 4.224,11 4.5,11 C4.675,11 4.821,10.905 4.91,10.769 L4.914,10.77 L6.84,8.54 C6.92,8.434 7.08,8.434 7.16,8.54 L9.086,10.77 L9.09,10.769 C9.179,10.905 9.325,11 9.5,11 C9.776,11 10,10.776 10,10.5 L10,4 C10,3.448 9.552,3 9,3',
 'standard', 8);

-- Sub-task types: Frontend, Backend, Integration, BRD Task, API Requirement, Entity FIGMA, Figma, Business Gap
INSERT INTO public.ph_issue_type_icons (issue_type, label, color, bg_color, svg_path, category, sort_order) VALUES
('Frontend', 'Frontend', '#FFFFFF', '#4BAEE8', 'RECTS:3,3,5,5,0.8|6,6,5,5,0.8,filled', 'subtask', 10),
('Backend', 'Backend', '#FFFFFF', '#4BAEE8', 'RECTS:3,3,5,5,0.8|6,6,5,5,0.8,filled', 'subtask', 11),
('Integration', 'Integration', '#FFFFFF', '#4BAEE8', 'RECTS:3,3,5,5,0.8|6,6,5,5,0.8,filled', 'subtask', 12),
('BRD Task', 'BRD Task', '#FFFFFF', '#4BAEE8', 'RECTS:3,3,5,5,0.8|6,6,5,5,0.8,filled', 'subtask', 13),
('API Requirement', 'API Requirement', '#FFFFFF', '#4BAEE8', 'RECTS:3,3,5,5,0.8|6,6,5,5,0.8,filled', 'subtask', 14),
('Entity FIGMA', 'Entity FIGMA', '#FFFFFF', '#4BAEE8', 'RECTS:3,3,5,5,0.8|6,6,5,5,0.8,filled', 'subtask', 15),
('Figma', 'Figma', '#FFFFFF', '#4BAEE8', 'RECTS:3,3,5,5,0.8|6,6,5,5,0.8,filled', 'subtask', 16),
('Business Gap', 'Business Gap', '#FFFFFF', '#00B8D9', 'M9,3 L5,3 C4.448,3 4,3.448 4,4 L4,10.5 C4,10.776 4.224,11 4.5,11 C4.675,11 4.821,10.905 4.91,10.769 L4.914,10.77 L6.84,8.54 C6.92,8.434 7.08,8.434 7.16,8.54 L9.086,10.77 L9.09,10.769 C9.179,10.905 9.325,11 9.5,11 C9.776,11 10,10.776 10,10.5 L10,4 C10,3.448 9.552,3 9,3', 'subtask', 17);
