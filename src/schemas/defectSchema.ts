import { z } from 'zod';

export const defectSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(500),
  description: z.string().optional().nullable(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  assigned_to: z.string().uuid().optional().nullable(),
  component: z.string().optional().nullable(),
  environment: z.string().optional().nullable(),
  affected_version: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  folder_id: z.string().uuid().optional().nullable(),
  steps_to_reproduce: z.string().optional().nullable(),
  expected_result: z.string().optional().nullable(),
  actual_result: z.string().optional().nullable(),
});

export type DefectFormValues = z.infer<typeof defectSchema>;
