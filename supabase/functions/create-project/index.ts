import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { name, key, department, description, user_id } = await req.json()

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      name, key: key.toUpperCase(), department, description: description || null,
      status: 'active', status_category: 'todo', health_status: 'on_track',
      owner_id: user_id, created_by: user_id, lead_id: user_id,
      program_id: '00000000-0000-0000-0000-000000000001', project_type: 'kanban',
      total_epics: 0, total_stories: 0, total_tasks: 0,
      work_items_todo: 0, work_items_in_progress: 0, work_items_done: 0,
      completion_percentage: 0,
    })
    .select('id, name, key, description, department, created_at')
    .single()

  if (error) {
    const status = (error.code === '23505') ? 409 : 500
    const body = (error.code === '23505') ? { error: 'key_not_unique' } : { error: error.message }
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  await supabase.from('hi_statuses').insert([
    { name: 'Backlog',      color: '#64748B', color_text: '#475569', is_default: true,  is_terminal: false, sort_order: 1, project_id: project.id },
    { name: 'To Do',        color: '#2563EB', color_text: '#1D4ED8', is_default: false, is_terminal: false, sort_order: 2, project_id: project.id },
    { name: 'In Progress',  color: '#0D9488', color_text: '#0A8277', is_default: false, is_terminal: false, sort_order: 3, project_id: project.id },
    { name: 'In Review',    color: '#D97706', color_text: '#AF6003', is_default: false, is_terminal: false, sort_order: 4, project_id: project.id },
    { name: 'Done',         color: '#16A34A', color_text: '#11853D', is_default: false, is_terminal: true,  sort_order: 5, project_id: project.id },
    { name: 'Blocked',      color: '#DC2626', color_text: '#D92525', is_default: false, is_terminal: false, sort_order: 6, project_id: project.id },
  ])

  await supabase.from('hi_project_sequences').upsert(
    { project_id: project.id, last_number: 0 },
    { onConflict: 'project_id', ignoreDuplicates: true }
  )
  await supabase.from('project_members').upsert(
    { project_id: project.id, user_id, role: 'admin', added_by: user_id },
    { onConflict: 'project_id,user_id', ignoreDuplicates: true }
  )

  return new Response(JSON.stringify(project), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
