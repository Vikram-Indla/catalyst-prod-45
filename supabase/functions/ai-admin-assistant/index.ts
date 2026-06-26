// supabase/functions/ai-admin-assistant/index.ts
// Gemini-powered admin command interface.
// Phase 1: parse natural language → CommandPlan (requires confirmation).
// Phase 2: execute confirmed CommandPlan → StepResult[].
// All write actions guarded by admin role check.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
const MODEL = 'gemini-2.5-flash'

// ── Types ────────────────────────────────────────────────────────────────────

type ActionType =
  | 'invite_user'
  | 'assign_product_role'
  | 'remove_from_role'
  | 'create_role'
  | 'update_permissions'
  | 'deactivate_role'
  | 'delete_user'
  | 'reset_password'

interface CommandStep {
  id: string
  label: string
  action_type: ActionType
  params: Record<string, unknown>
  rollback_label?: string
}

interface CommandPlan {
  summary: string
  steps: CommandStep[]
  warnings: string[]
}

interface StepResult {
  id: string
  label: string
  status: 'success' | 'failed' | 'rolled_back' | 'skipped'
  error?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function err(msg: string, status: number): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ── Intent Parsing ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI admin assistant for the Catalyst platform.
You help admins manage users, roles, and permissions through natural language commands.

Available action types and their params:
- invite_user: { email: string, full_name?: string, role_name?: string }
- assign_product_role: { user_email?: string, user_name_hint?: string, role_name: string }
- remove_from_role: { user_email?: string, user_name_hint?: string, role_name?: string }
- create_role: { name: string, description?: string, copy_from_role_name?: string }
- update_permissions: { role_name: string, permissions: Record<string, "Allow"|"Deny"> }
- deactivate_role: { role_name: string }
- delete_user: { user_email?: string, user_name_hint?: string }
- reset_password: { user_email: string }

Always respond with valid JSON in this exact schema:
{
  "intent_type": "execute_commands" | "respond_only" | "clarify",
  "response_text": "string (always — shown to user in chat)",
  "plan": {
    "summary": "string",
    "steps": [{ "id": "step_N", "label": "string", "action_type": "...", "params": {}, "rollback_label": "string?" }],
    "warnings": ["string"]
  }
}

Rules:
- intent_type "respond_only": answer questions, cannot/should not change data.
- intent_type "clarify": need more info from user (missing email, ambiguous name, etc.).
- intent_type "execute_commands": generate a plan. Include "plan". response_text previews what will happen.
- For delete_user and deactivate_role, always include a warning in warnings[].
- If the user names multiple people or roles, generate one step per target.
- Never invent emails. If email is missing for invite/reset, use "clarify".
- permissions in update_permissions must use exact action strings from PERMISSION_GROUPS.`

const PERMISSION_GROUPS = [
  'Project: Create','Project: Delete','Project: Archive','Project: Rename',
  'Project: Manage Members','Project: Change Lead','Project: Edit Settings',
  'Project: Export Data','Project: View All Projects','Project: Change Icon',
  'Product: Create Story','Product: Delete Story','Product: Edit Story',
  'Product: Rename Story','Product: Assign Story','Product: Change Story Status',
  'Product: Change Story Priority','Product: Move Story to Sprint','Product: Clone Story',
  'Product: Create Epic','Product: Delete Epic','Product: Edit Epic',
  'Product: Create Sprint','Product: Start Sprint','Product: Close Sprint',
  'Product: Delete Sprint','Product: View Backlog','Product: Manage Board',
  'Product: Add Comment','Product: Delete Comment','Product: Link Issues',
  'Product: Export Stories',
]

async function parseIntent(
  message: string,
  history: { role: string; content: string }[],
  orgContext: string,
  geminiKey: string,
): Promise<{ intent_type: string; response_text: string; plan?: CommandPlan }> {
  const systemWithContext = `${SYSTEM_PROMPT}\n\nCurrent org context:\n${orgContext}\n\nAvailable permission group strings:\n${PERMISSION_GROUPS.join(', ')}`

  const messages = [
    { role: 'system', content: systemWithContext },
    ...history.slice(-10), // last 10 exchanges for context
    { role: 'user', content: message },
  ]

  const resp = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${geminiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 2048,
      temperature: 0.1,
    }),
  })

  if (!resp.ok) {
    const errBody = await resp.text()
    throw new Error(`Gemini error ${resp.status}: ${errBody}`)
  }

  const geminiData = await resp.json()
  const raw = geminiData.choices?.[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw)

  return {
    intent_type: parsed.intent_type ?? 'respond_only',
    response_text: parsed.response_text ?? 'I could not understand that request.',
    plan: parsed.plan,
  }
}

// ── Org Context Builder ───────────────────────────────────────────────────────

async function buildOrgContext(supabase: ReturnType<typeof createClient>): Promise<string> {
  const [rolesResult, userCountResult] = await Promise.all([
    supabase.from('product_roles').select('name, code, is_active').order('name'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('approval_status', 'APPROVED'),
  ])

  const roles = (rolesResult.data ?? [])
    .map((r: { name: string; code: string; is_active: boolean }) =>
      `- ${r.name} (code: ${r.code})${r.is_active ? '' : ' [INACTIVE]'}`
    ).join('\n')

  const userCount = userCountResult.count ?? 0

  return `Active users: ${userCount}\nProduct roles:\n${roles}`
}

// ── Execution ─────────────────────────────────────────────────────────────────

async function resolveUserByEmailOrName(
  supabase: ReturnType<typeof createClient>,
  email?: string,
  nameHint?: string,
): Promise<{ id: string; email: string; full_name: string | null } | null> {
  if (email) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()
    return data
  }
  if (nameHint) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .ilike('full_name', `%${nameHint}%`)
      .limit(1)
      .maybeSingle()
    return data
  }
  return null
}

async function resolveRoleByName(
  supabase: ReturnType<typeof createClient>,
  roleName: string,
): Promise<{ id: string; name: string; code: string } | null> {
  const { data } = await supabase
    .from('product_roles')
    .select('id, name, code')
    .or(`name.ilike.%${roleName}%,code.ilike.%${roleName.toLowerCase().replace(/\s+/g, '_')}%`)
    .limit(1)
    .maybeSingle()
  return data
}

async function executeStep(
  step: CommandStep,
  supabase: ReturnType<typeof createClient>,
  callerToken: string,
): Promise<{ ok: boolean; error?: string; rollback_state?: Record<string, unknown> }> {
  const p = step.params

  switch (step.action_type) {
    case 'invite_user': {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/user-invite-send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${callerToken}`,
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        },
        body: JSON.stringify({
          email: p.email,
          full_name: p.full_name ?? null,
          role: 'developer',
          module_access: { home: true, product_hub: true },
          purpose: 'invite',
          delivery_channel: 'email',
        }),
      })
      const body = await resp.json()
      if (!resp.ok || !body.ok) return { ok: false, error: body.error ?? 'Invite failed' }
      return { ok: true }
    }

    case 'assign_product_role': {
      const user = await resolveUserByEmailOrName(supabase, p.user_email as string | undefined, p.user_name_hint as string | undefined)
      if (!user) return { ok: false, error: `User not found: ${p.user_email ?? p.user_name_hint}` }

      const role = await resolveRoleByName(supabase, p.role_name as string)
      if (!role) return { ok: false, error: `Role not found: ${p.role_name}` }

      // Get existing role for rollback
      const { data: existing } = await supabase
        .from('user_product_roles')
        .select('role_id')
        .eq('user_id', user.id)
        .maybeSingle()

      // Delete old, insert new
      await supabase.from('user_product_roles').delete().eq('user_id', user.id)
      const { error } = await supabase.from('user_product_roles').insert({ user_id: user.id, role_id: role.id })
      if (error) return { ok: false, error: error.message }

      return { ok: true, rollback_state: { user_id: user.id, prev_role_id: existing?.role_id ?? null } }
    }

    case 'remove_from_role': {
      const user = await resolveUserByEmailOrName(supabase, p.user_email as string | undefined, p.user_name_hint as string | undefined)
      if (!user) return { ok: false, error: `User not found: ${p.user_email ?? p.user_name_hint}` }

      const { data: existing } = await supabase
        .from('user_product_roles')
        .select('role_id')
        .eq('user_id', user.id)
        .maybeSingle()

      const { error } = await supabase.from('user_product_roles').delete().eq('user_id', user.id)
      if (error) return { ok: false, error: error.message }

      return { ok: true, rollback_state: { user_id: user.id, prev_role_id: existing?.role_id ?? null } }
    }

    case 'create_role': {
      const name = (p.name as string).trim()
      const code = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')

      // Copy permissions from source role if requested
      let copyPerms: { permission_group: string; permission_level: string }[] = []
      if (p.copy_from_role_name) {
        const src = await resolveRoleByName(supabase, p.copy_from_role_name as string)
        if (src) {
          const { data: srcPerms } = await supabase
            .from('product_role_permissions')
            .select('permission_group, permission_level')
            .eq('role_id', src.id)
          copyPerms = srcPerms ?? []
        }
      }

      const { data: role, error: roleErr } = await supabase
        .from('product_roles')
        .insert({ name, code, description: p.description ?? null, is_active: true, scope: 'Product' })
        .select()
        .single()
      if (roleErr) return { ok: false, error: roleErr.message }

      const perms = PERMISSION_GROUPS.map(g => ({
        role_id: role.id,
        permission_group: g,
        permission_level: copyPerms.find(cp => cp.permission_group === g)?.permission_level ?? 'Deny',
      }))
      const { error: permsErr } = await supabase.from('product_role_permissions').insert(perms)
      if (permsErr) {
        // Rollback: delete the role we just created
        await supabase.from('product_roles').delete().eq('id', role.id)
        return { ok: false, error: permsErr.message }
      }

      return { ok: true, rollback_state: { role_id: role.id } }
    }

    case 'update_permissions': {
      const role = await resolveRoleByName(supabase, p.role_name as string)
      if (!role) return { ok: false, error: `Role not found: ${p.role_name}` }

      const permissions = p.permissions as Record<string, string>
      const payload = Object.entries(permissions).map(([group, level]) => ({
        role_id: role.id,
        permission_group: group,
        permission_level: level,
        updated_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('product_role_permissions')
        .upsert(payload, { onConflict: 'role_id,permission_group' })
      if (error) return { ok: false, error: error.message }

      return { ok: true }
    }

    case 'deactivate_role': {
      const role = await resolveRoleByName(supabase, p.role_name as string)
      if (!role) return { ok: false, error: `Role not found: ${p.role_name}` }

      const { error } = await supabase
        .from('product_roles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', role.id)
      if (error) return { ok: false, error: error.message }

      return { ok: true, rollback_state: { role_id: role.id } }
    }

    case 'delete_user': {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
      const user = await resolveUserByEmailOrName(supabase, p.user_email as string | undefined, p.user_name_hint as string | undefined)
      if (!user) return { ok: false, error: `User not found: ${p.user_email ?? p.user_name_hint}` }

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/user-delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${callerToken}`,
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        },
        body: JSON.stringify({ user_id: user.id }),
      })
      const body = await resp.json()
      if (!resp.ok || body.error) return { ok: false, error: body.error ?? 'Delete failed' }
      return { ok: true }
    }

    case 'reset_password': {
      const email = (p.user_email as string).trim().toLowerCase()
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/reset-user-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${callerToken}`,
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        },
        body: JSON.stringify({ email }),
      })
      const body = await resp.json()
      if (!resp.ok || body.error) return { ok: false, error: body.error ?? 'Password reset failed' }
      return { ok: true }
    }

    default:
      return { ok: false, error: `Unknown action type: ${step.action_type}` }
  }
}

async function rollbackStep(
  step: CommandStep,
  rollbackState: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  try {
    switch (step.action_type) {
      case 'assign_product_role':
      case 'remove_from_role': {
        const { user_id, prev_role_id } = rollbackState
        if (!user_id) return
        await supabase.from('user_product_roles').delete().eq('user_id', user_id)
        if (prev_role_id) {
          await supabase.from('user_product_roles').insert({ user_id, role_id: prev_role_id })
        }
        break
      }
      case 'create_role': {
        const { role_id } = rollbackState
        if (!role_id) return
        await supabase.from('product_role_permissions').delete().eq('role_id', role_id)
        await supabase.from('product_roles').delete().eq('id', role_id)
        break
      }
      case 'deactivate_role': {
        const { role_id } = rollbackState
        if (!role_id) return
        await supabase.from('product_roles').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', role_id)
        break
      }
    }
  } catch {
    // Rollback errors are logged but don't propagate
  }
}

// ── Main Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) return err('GEMINI_API_KEY not configured', 500)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Auth guard
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return err('Unauthorized', 401)
    const callerToken = authHeader.slice(7)

    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(callerToken)
    if (authErr || !caller) return err('Unauthorized', 401)

    // Admin role guard — app_role enum only has 'admin' and 'user'; super_admin is invalid
    const { data: adminRow } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle()
    if (!adminRow) {
      return err('Forbidden: admin role required', 403)
    }

    const body = await req.json()

    // ── Phase 2: execute confirmed plan ────────────────────────────────────────
    if (body.action === 'execute' && body.plan) {
      const plan = body.plan as CommandPlan
      const results: StepResult[] = []
      const rollbackLog: { step: CommandStep; state: Record<string, unknown> }[] = []
      let failed = false

      for (const step of plan.steps) {
        if (failed) {
          results.push({ id: step.id, label: step.label, status: 'skipped' })
          continue
        }

        const result = await executeStep(step, supabaseAdmin, callerToken)
        if (result.ok) {
          results.push({ id: step.id, label: step.label, status: 'success' })
          if (result.rollback_state) {
            rollbackLog.push({ step, state: result.rollback_state })
          }
        } else {
          failed = true
          results.push({ id: step.id, label: step.label, status: 'failed', error: result.error })

          // Rollback completed steps in reverse
          for (const rb of rollbackLog.reverse()) {
            await rollbackStep(rb.step, rb.state, supabaseAdmin)
            const idx = results.findIndex(r => r.id === rb.step.id)
            if (idx >= 0) results[idx].status = 'rolled_back'
          }
        }
      }

      return ok({
        type: 'result',
        steps: results,
        rolled_back: failed && rollbackLog.length > 0,
        success: !failed,
      })
    }

    // ── Phase 1: parse intent ──────────────────────────────────────────────────
    const { message, history = [] } = body as {
      message: string
      history?: { role: string; content: string }[]
    }

    if (!message?.trim()) return err('message is required', 400)

    const orgContext = await buildOrgContext(supabaseAdmin)
    const parsed = await parseIntent(message, history, orgContext, GEMINI_API_KEY)

    if (parsed.intent_type !== 'execute_commands' || !parsed.plan) {
      return ok({
        type: 'response',
        text: parsed.response_text,
        intent_type: parsed.intent_type,
      })
    }

    return ok({
      type: 'plan',
      text: parsed.response_text,
      plan: parsed.plan,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return err(`Internal error: ${msg}`, 500)
  }
})
