import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============ RESOURCE DETECTION ============

const RESOURCE_KEYWORDS = [
  'who', 'resource', 'contractor', 'engineer', 'developer', 'pm', 'project manager',
  'allocation', 'availability', 'utilization', 'capacity', 'assigned', 'available',
  'person', 'team member', 'employee', 'staff', 'consultant'
];

function isResourceInvolvedQuery(message: string): boolean {
  const lower = message.toLowerCase();
  return RESOURCE_KEYWORDS.some(kw => lower.includes(kw)) ||
    /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(message); // Name pattern
}

function extractResourceIdentifier(message: string): string | null {
  // Try to extract email
  const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) return emailMatch[0];
  
  // Try to extract UUID
  const uuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuidMatch) return uuidMatch[0];
  
  // Try to extract name (two capitalized words)
  const nameMatch = message.match(/\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/);
  if (nameMatch) return `${nameMatch[1]} ${nameMatch[2]}`;
  
  return null;
}

// ============ SITE STATUS DETERMINATION ============

type SiteStatus = { value: 'on_site' | 'off_shore' | 'unknown'; rule_used: string };

function determineSiteStatus(resource: any): SiteStatus {
  // Check location-related fields
  const location = resource.location || resource.location_type || '';
  const locationLower = location.toLowerCase();
  
  // On-site keywords
  const onSiteKeywords = ['on-site', 'onsite', 'saudi', 'ksa', 'riyadh', 'jeddah', 'dammam'];
  if (onSiteKeywords.some(kw => locationLower.includes(kw))) {
    return { value: 'on_site', rule_used: `location field contains "${location}"` };
  }
  
  // Off-shore keywords
  const offShoreKeywords = ['off-shore', 'offshore', 'remote', 'india', 'pakistan', 'jordan', 'egypt', 'philippines'];
  if (offShoreKeywords.some(kw => locationLower.includes(kw))) {
    return { value: 'off_shore', rule_used: `location field contains "${location}"` };
  }
  
  // Fallback to country code via country_id lookup
  if (resource.country_code) {
    if (resource.country_code.toUpperCase() === 'SA') {
      return { value: 'on_site', rule_used: 'country_code = SA' };
    }
    return { value: 'off_shore', rule_used: `country_code = ${resource.country_code}` };
  }
  
  return { value: 'unknown', rule_used: 'no location or country data available' };
}

// ============ UTILIZATION CALCULATION ============

interface UtilizationResult {
  current_percent: number | null;
  status: 'under' | 'on_target' | 'over' | 'unknown';
  target_percent: number;
  calc_notes: string;
}

function calculateUtilization(allocations: any[]): UtilizationResult {
  const TARGET = 80;
  
  if (!allocations || allocations.length === 0) {
    return {
      current_percent: null,
      status: 'unknown',
      target_percent: TARGET,
      calc_notes: 'No active allocations found'
    };
  }
  
  const totalPercent = allocations.reduce((sum, a) => sum + (a.allocation_percent || 0), 0);
  const current = Math.min(100, totalPercent);
  
  let status: 'under' | 'on_target' | 'over' = 'under';
  if (current >= 80 && current <= 90) status = 'on_target';
  else if (current > 90) status = 'over';
  
  return {
    current_percent: current,
    status,
    target_percent: TARGET,
    calc_notes: `Sum of ${allocations.length} active allocations`
  };
}

// ============ TIME RANGE PARSING ============

interface TimeRange {
  label: string;
  start: string | null;
  end: string | null;
}

function parseTimeRange(period: string): TimeRange {
  const now = new Date();
  const year = now.getFullYear();
  
  const quarterMatch = period.match(/Q([1-4])\s*(\d{4})?/i);
  if (quarterMatch) {
    const q = parseInt(quarterMatch[1]);
    const y = quarterMatch[2] ? parseInt(quarterMatch[2]) : year;
    const startMonth = (q - 1) * 3;
    const start = new Date(y, startMonth, 1);
    const end = new Date(y, startMonth + 3, 0);
    return {
      label: `Q${q} ${y}`,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }
  
  return { label: period || 'Current Period', start: null, end: null };
}

// ============ CONTEXT BUILDER ============

async function buildResourceContext(
  supabase: any,
  resourceIdentifier: string | null,
  context: { department?: string; period?: string; location?: string }
): Promise<any> {
  const timeRange = parseTimeRange(context.period || '');
  const missingFields: string[] = [];
  
  let resourceData = null;
  let allocationsData: any[] = [];
  let departmentData = null;
  let countryData = null;
  
  // Step 1: Find resource
  if (resourceIdentifier) {
    // Try by email first
    let { data: resources } = await supabase
      .from('resource_inventory')
      .select('*')
      .or(`email.ilike.%${resourceIdentifier}%,name.ilike.%${resourceIdentifier}%`)
      .eq('is_active', true)
      .limit(1);
    
    if (resources && resources.length > 0) {
      resourceData = resources[0];
    } else {
      // Try profiles table
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .or(`email.ilike.%${resourceIdentifier}%,full_name.ilike.%${resourceIdentifier}%`)
        .limit(1);
      
      if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        const { data: ri } = await supabase
          .from('resource_inventory')
          .select('*')
          .eq('profile_id', profile.id)
          .eq('is_active', true)
          .limit(1);
        
        if (ri && ri.length > 0) {
          resourceData = ri[0];
        }
      }
    }
  }
  
  if (!resourceData) {
    missingFields.push('resource');
    return { found: false, missing_fields: missingFields };
  }
  
  // Step 2: Get department
  if (resourceData.department_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('id, name, department_code')
      .eq('id', resourceData.department_id)
      .single();
    departmentData = dept;
  } else if (resourceData.department_name) {
    departmentData = { id: null, name: resourceData.department_name };
  }
  
  if (!departmentData?.name) {
    missingFields.push('department');
  }
  
  // Step 3: Get country for site status
  if (resourceData.country_id) {
    const { data: country } = await supabase
      .from('resource_countries')
      .select('id, name, code')
      .eq('id', resourceData.country_id)
      .single();
    if (country) {
      resourceData.country_code = country.code;
      countryData = country;
    }
  }
  
  // Step 4: Get allocations
  let allocQuery = supabase
    .from('resource_allocations')
    .select(`
      id,
      allocation_percent,
      start_date,
      end_date,
      status,
      assignment_id
    `)
    .eq('resource_id', resourceData.id)
    .eq('status', 'active');
  
  if (timeRange.start && timeRange.end) {
    allocQuery = allocQuery
      .or(`start_date.lte.${timeRange.end},end_date.gte.${timeRange.start}`);
  }
  
  const { data: allocations } = await allocQuery.limit(10);
  allocationsData = allocations || [];
  
  // Step 5: Get project names for allocations
  if (allocationsData.length > 0) {
    const assignmentIds = allocationsData
      .map(a => a.assignment_id)
      .filter(Boolean);
    
    if (assignmentIds.length > 0) {
      const { data: assignments } = await supabase
        .from('resource_assignments')
        .select('id, name, project_id')
        .in('id', assignmentIds);
      
      const assignmentMap = new Map<string, { id: string; name: string; project_id: string | null }>(
        (assignments || []).map((a: any) => [a.id, a])
      );
      
      // Get project names
      const projectIds = (assignments || [])
        .map((a: any) => a.project_id)
        .filter(Boolean);
      
      let projectMap = new Map<string, string>();
      if (projectIds.length > 0) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);
        
        projectMap = new Map((projects || []).map((p: any) => [p.id, p.name]));
      }
      
      // Enrich allocations
      allocationsData = allocationsData.map(a => {
        const assignment = assignmentMap.get(a.assignment_id);
        let projectName = 'Unknown Project';
        if (assignment) {
          if (assignment.project_id && projectMap.has(assignment.project_id)) {
            projectName = projectMap.get(assignment.project_id) || assignment.name || 'Unknown Project';
          } else if (assignment.name) {
            projectName = assignment.name;
          }
        }
        return {
          ...a,
          project_name: projectName
        };
      });
    }
  }
  
  // Step 6: Calculate utilization and site status
  const utilization = calculateUtilization(allocationsData);
  const siteStatus = determineSiteStatus(resourceData);
  
  if (utilization.current_percent === null) {
    missingFields.push('utilization');
  }
  if (siteStatus.value === 'unknown') {
    missingFields.push('site_status');
  }
  
  // Step 7: Detect risks
  const risks: any[] = [];
  
  // Contract expiring soon
  if (resourceData.contract_end_date) {
    const endDate = new Date(resourceData.contract_end_date);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      risks.push({
        severity: daysUntilExpiry <= 14 ? 'high' : 'medium',
        title: 'Contract Ending Soon',
        detail: `Contract expires in ${daysUntilExpiry} days (${resourceData.contract_end_date})`,
        action: 'Initiate contract renewal process'
      });
    }
  }
  
  // Overallocated
  if (utilization.status === 'over' && utilization.current_percent && utilization.current_percent > 100) {
    risks.push({
      severity: 'high',
      title: 'Overallocated',
      detail: `Resource is allocated at ${utilization.current_percent}%, exceeding capacity`,
      action: 'Review and redistribute allocations'
    });
  }
  
  // Build context object
  return {
    found: true,
    resource: {
      resource_id: resourceData.id,
      display_name: resourceData.name || 'Unknown',
      email: resourceData.email,
      role: resourceData.role_name,
      department: {
        department_id: departmentData?.id || null,
        name: departmentData?.name || null
      },
      site_status: siteStatus,
      vendor: {
        vendor_id: resourceData.vendor_id || null,
        name: resourceData.vendor_name || null
      },
      contract_end_date: resourceData.contract_end_date
    },
    utilization,
    allocations: allocationsData.slice(0, 5).map(a => ({
      project_id: a.assignment_id,
      project_name: a.project_name,
      allocation_percent: a.allocation_percent,
      from: a.start_date,
      to: a.end_date
    })),
    allocations_count: allocationsData.length,
    total_allocation_percent: allocationsData.reduce((sum, a) => sum + (a.allocation_percent || 0), 0),
    risks,
    time_range: timeRange,
    missing_fields: missingFields
  };
}

// ============ SYSTEM PROMPT ============

const SYSTEM_PROMPT = `You are Caty AI, an enterprise Capacity Intelligence Assistant. You MUST respond with valid JSON following the exact schema below.

## CRITICAL RULES:
1. ALWAYS respond with valid JSON - no markdown, no code blocks, just raw JSON
2. NEVER invent or hallucinate data not provided in the context
3. If data is missing, set the field to null and add it to missing_fields
4. Always include department, utilization, and site_status for resource queries

## RESPONSE SCHEMA:

For resource-related queries, use this EXACT structure:
{
  "response_type": "resource_answer",
  "title": "Brief descriptive title",
  "time_range": { "label": "Q1 2026", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "filters": { "department": "string|null", "location": "string|null" },
  "resource": {
    "resource_id": "string",
    "display_name": "string",
    "department": { "department_id": "string|null", "name": "string|null" },
    "site_status": { "value": "on_site|off_shore|unknown", "rule_used": "string" },
    "vendor": { "vendor_id": "string|null", "name": "string|null" }
  },
  "utilization": {
    "current_percent": number|null,
    "status": "under|on_target|over|unknown",
    "target_percent": 80,
    "calc_notes": "string"
  },
  "allocations_summary": {
    "total_allocation_percent": number|null,
    "active_projects_count": number|null,
    "top_allocations": [
      { "project_id": "string|null", "project_name": "string|null", "allocation_percent": number|null, "from": "YYYY-MM-DD|null", "to": "YYYY-MM-DD|null" }
    ]
  },
  "risks": [
    { "severity": "low|medium|high", "title": "string", "detail": "string", "action": "string" }
  ],
  "next_best_actions": [
    { "label": "string", "action_key": "utilization_breakdown|show_allocations|show_assignments|show_expiring_contracts|show_similar_resources", "payload": {} }
  ],
  "data_quality": {
    "missing_fields": ["array of strings"],
    "freshness": "realtime",
    "confidence": "low|medium|high"
  }
}

For general queries (not resource-specific):
{
  "response_type": "general_answer",
  "title": "Brief title",
  "content_markdown": "Your response in markdown format with proper headings, lists, and tables",
  "next_best_actions": [
    { "label": "Suggested action", "action_key": "action_type", "payload": {} }
  ],
  "data_quality": {
    "missing_fields": [],
    "freshness": "realtime",
    "confidence": "high"
  }
}

## CONTEXT:
- Department: {department}
- Period: {period}
- Location: {location}

## RESOURCE CONTEXT (if available):
{resource_context}

Use ONLY the data provided above. If a field is not in the context, mark it as null.`;

// ============ MAIN HANDLER ============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the latest user message
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    const userQuery = lastUserMessage?.content || '';

    // Detect if this is a resource-involved query
    const isResourceQuery = isResourceInvolvedQuery(userQuery);
    const resourceIdentifier = isResourceQuery ? extractResourceIdentifier(userQuery) : null;

    // Build context if resource-involved
    let resourceContext = 'No specific resource context available.';
    
    if (isResourceQuery) {
      const contextData = await buildResourceContext(supabase, resourceIdentifier, context || {});
      
      if (contextData.found) {
        resourceContext = JSON.stringify(contextData, null, 2);
        console.log('[CATY] Resource context built:', {
          resource: contextData.resource?.display_name,
          utilization: contextData.utilization,
          allocations_count: contextData.allocations_count
        });
      } else {
        resourceContext = 'Resource not found in database. Missing fields: ' + 
          contextData.missing_fields.join(', ');
        console.log('[CATY] Resource not found:', resourceIdentifier);
      }
    }

    // Build system prompt with context
    const systemPrompt = SYSTEM_PROMPT
      .replace('{department}', context?.department || 'All Departments')
      .replace('{period}', context?.period || 'Current Period')
      .replace('{location}', context?.location || 'All Locations')
      .replace('{resource_context}', resourceContext);

    console.log('[CATY] Query type:', isResourceQuery ? 'resource' : 'general');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const t = await response.text();
      console.error("[CATY] AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("[CATY] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
