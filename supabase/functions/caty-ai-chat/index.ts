import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============ FINANCIAL DOMAIN HARD BAN ============

const BANNED_FINANCIAL_TERMS = [
  'payment', 'paid', 'unpaid', 'budget', 'cost', 'ctc', 'salary', 'invoice',
  'po', 'spend', 'burn', 'rate', 'rates', 'pricing', 'commercial', 'procurement',
  'money', 'fee', 'fees', 'revenue', 'income', 'expense', 'billing', 'bill',
  'compensation', 'payroll', 'wage', 'wages', 'bonus', 'bonuses', 'allowance'
];

function isFinancialQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return BANNED_FINANCIAL_TERMS.some(term => lower.includes(term));
}

// Must match the required exact rejection message
const FINANCIAL_REJECTION_MESSAGE = `<div class="caty-bubble">
  <p>This question is outside the Capacity Planning domain. Financial information is intentionally not supported.</p>
</div>`;

// ============ QUERY INTENT DETECTION ============

type QueryIntent = 'resource_lookup' | 'vendor_filter' | 'department_filter' | 'role_filter' | 
  'location_filter' | 'contract_window' | 'utilization' | 'assignment_staffing' | 'mixed';

interface QueryPlan {
  intent: QueryIntent;
  entities: {
    resource_name?: string;
    department_name?: string;
    vendor_name?: string;
    role_name?: string;
    location?: string;
    assignment_name?: string;
  };
  time_window: {
    type: 'none' | 'relative' | 'range';
    days?: number;
    start?: string | null;
    end?: string | null;
    label: string;
  };
  filters: {
    department_id?: string | null;
    vendor_id?: string | null;
    location?: string | null;
    job_role?: string | null;
    assignment_id?: string | null;
  };
  sort: Array<{ field: string; dir: 'asc' | 'desc' }>;
  limit: number;
  fallback_level: number;
}

interface QueryResult {
  row_count: number;
  rows: any[];
  applied_filters: Record<string, any>;
  window: { start: string | null; end: string | null; label: string };
  debug: {
    timezone: string;
    rls_blocked: boolean;
    datatype_warnings: string[];
    queries_executed: string[];
    fallbacks_executed: string[];
  };
}

// ============ INTENT DETECTION ============

function extractResourceName(message: string): string | null {
  const trimmed = message.trim();
  
  // Try proper name pattern (case-insensitive matching, then normalize)
  // Pattern: FirstName LastName (e.g., "Vikram Indla", "vikram indla", "VIKRAM INDLA")
  const nameMatch = trimmed.match(/^([a-zA-Z]+)\s+([a-zA-Z]+)$/i);
  if (nameMatch) {
    // Normalize to title case
    const first = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
    const last = nameMatch[2].charAt(0).toUpperCase() + nameMatch[2].slice(1).toLowerCase();
    return `${first} ${last}`;
  }
  
  // Try proper name pattern anywhere in message
  const embeddedNameMatch = message.match(/\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/);
  if (embeddedNameMatch) return `${embeddedNameMatch[1]} ${embeddedNameMatch[2]}`;
  
  // Try single-word names after key phrases
  const singlePatterns = [
    /(?:who is|show|find|about|when is|look up|lookup)\s+(\w{3,})/i,
    /(\w{3,})(?:'s|\s+contract|\s+allocation|\s+availability)/i,
  ];
  
  for (const pattern of singlePatterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const name = match[1].toLowerCase();
      // Avoid treating generic nouns as resource names
      const exclude = [
        'with', 'for', 'from', 'into', 'over', 'under', 'within', 'between',
        'the', 'all', 'my', 'our', 'any', 'some', 'this', 'that',
        'department', 'dept', 'team', 'vendor', 'role',
        'resource', 'resources',
        'contract', 'contracts', 'expiring', 'expiry', 'expiration', 'upcoming',
        'offshore', 'onsite',
      ];
      if (!exclude.includes(name)) return match[1];
    }
  }
  
  // Short input fallback (1-3 words, looks like a name)
  const words = trimmed.split(/\s+/);
  if (words.length <= 3 && trimmed.length >= 3) {
    const aggregateWords = [
      'summary', 'total', 'count', 'average', 'show', 'list', 'all',
      'department', 'vendor', 'offshore', 'onsite',
      'expiring', 'expiry', 'expiration', 'contract', 'contracts',
      'utilization', 'allocation', 'capacity',
      'resource', 'resources', 'team', 'teams',
    ];
    if (!aggregateWords.some(kw => message.toLowerCase().includes(kw))) {
      // Looks like a name - return it normalized
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }
  
  return null;
}

function detectQueryIntent(message: string, extractedName: string | null): QueryIntent {
  const lower = message.toLowerCase();

  // If we extracted a name and the message is short, this is a resource lookup
  if (extractedName) {
    const words = message.trim().split(/\s+/);
    // Direct name query (1-3 words, no aggregate keywords)
    if (words.length <= 3) {
      return 'resource_lookup';
    }
    // Name with context phrase
    if (/(?:who is|about|when is|look up|lookup|show|find)\s+/i.test(lower)) {
      return 'resource_lookup';
    }
  }

  // Contract/expiry intent
  if (lower.includes('expir') || lower.includes('expiration') || lower.includes('contract') || lower.includes('ending')) {
    return 'contract_window';
  }

  // Generic list queries
  if (/(?:show|find|list)\s+(?:all\s+)?resources\b/i.test(lower)) return 'mixed';

  // Check for proper name patterns (fallback)
  if (/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(message)) return 'resource_lookup';
  if (/(?:who is|about|when is|look up|lookup)\s+\w+/i.test(lower)) return 'resource_lookup';
  
  if (lower.includes('vendor')) return 'vendor_filter';
  if (lower.includes('department') || lower.includes('dept')) return 'department_filter';
  if (lower.includes('role') || lower.includes('developer') || lower.includes('engineer') || lower.includes('pm')) return 'role_filter';
  if (lower.includes('offshore') || lower.includes('onsite') || lower.includes('location')) return 'location_filter';
  if (lower.includes('utilization') || lower.includes('capacity') || lower.includes('allocation')) return 'utilization';
  if (lower.includes('assignment') || lower.includes('project') || lower.includes('staffing')) return 'assignment_staffing';
  
  return 'mixed';
}

function parseTimeWindow(query: string): { type: 'none' | 'relative' | 'range'; days?: number; start?: string; end?: string; label: string } {
  const lower = query.toLowerCase();
  const now = new Date();
  const year = now.getFullYear();
  
  // Full year
  if (lower.includes('full year') || lower.includes('yearly') || lower.includes('annual')) {
    return { type: 'range', start: `${year}-01-01`, end: `${year}-12-31`, label: `Full Year ${year}` };
  }
  
  // Half year
  const halfMatch = lower.match(/h([12])\s*(\d{4})?/i);
  if (halfMatch) {
    const h = parseInt(halfMatch[1]);
    const y = halfMatch[2] ? parseInt(halfMatch[2]) : year;
    return h === 1 
      ? { type: 'range', start: `${y}-01-01`, end: `${y}-06-30`, label: `H1 ${y}` }
      : { type: 'range', start: `${y}-07-01`, end: `${y}-12-31`, label: `H2 ${y}` };
  }
  
  // Quarter
  const quarterMatch = lower.match(/q([1-4])\s*(\d{4})?/i);
  if (quarterMatch) {
    const q = parseInt(quarterMatch[1]);
    const y = quarterMatch[2] ? parseInt(quarterMatch[2]) : year;
    const startMonth = (q - 1) * 3;
    const start = new Date(y, startMonth, 1);
    const end = new Date(y, startMonth + 3, 0);
    return { 
      type: 'range', 
      start: start.toISOString().split('T')[0], 
      end: end.toISOString().split('T')[0],
      label: `Q${q} ${y}`
    };
  }
  
  // Relative time words
  if (lower.includes('soon') || lower.includes('upcoming') || lower.includes('next')) {
    return { type: 'relative', days: 30, label: 'Next 30 days' };
  }
  
  if (lower.includes('this month')) {
    const start = new Date(year, now.getMonth(), 1);
    const end = new Date(year, now.getMonth() + 1, 0);
    return { type: 'range', start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0], label: 'This Month' };
  }
  
  // Year mention
  const yearMatch = lower.match(/\b(202[5-9])\b/);
  if (yearMatch) {
    const y = parseInt(yearMatch[1]);
    return { type: 'range', start: `${y}-01-01`, end: `${y}-12-31`, label: `Full Year ${y}` };
  }
  
  return { type: 'none', label: 'Current Period' };
}

function buildQueryPlan(message: string, context: any): QueryPlan {
  // Extract name FIRST, then determine intent based on that
  const resourceName = extractResourceName(message);
  const intent = detectQueryIntent(message, resourceName);
  const timeWindow = parseTimeWindow(message);
  
  return {
    intent,
    entities: {
      resource_name: resourceName || undefined,
      department_name: context?.department && !context.department.toLowerCase().includes('all') ? context.department : undefined,
      location: context?.location && !context.location.toLowerCase().includes('all') ? context.location : undefined,
    },
    time_window: timeWindow,
    filters: {
      department_id: null,
      vendor_id: null,
      location: null,
      job_role: null,
      assignment_id: null,
    },
    sort: [{ field: 'relevance', dir: 'desc' }],
    limit: 200,
    fallback_level: 0,
  };
}

// ============ SITE STATUS DETERMINATION ============

function determineSiteStatus(resource: any, locationName?: string): { value: 'on_site' | 'off_shore' | 'unknown'; rule_used: string } {
  const location = locationName || resource.location || resource.location_type || '';
  const locationLower = location.toLowerCase();
  
  const onSiteKeywords = ['on-site', 'onsite', 'saudi', 'ksa', 'riyadh', 'jeddah', 'dammam'];
  if (onSiteKeywords.some(kw => locationLower.includes(kw))) {
    return { value: 'on_site', rule_used: `location: "${location}"` };
  }
  
  const offShoreKeywords = ['off-shore', 'offshore', 'remote', 'india', 'pakistan', 'jordan', 'egypt', 'philippines'];
  if (offShoreKeywords.some(kw => locationLower.includes(kw))) {
    return { value: 'off_shore', rule_used: `location: "${location}"` };
  }
  
  if (resource.country_code) {
    if (resource.country_code.toUpperCase() === 'SA') {
      return { value: 'on_site', rule_used: 'country_code = SA' };
    }
    return { value: 'off_shore', rule_used: `country_code = ${resource.country_code}` };
  }
  
  return { value: 'unknown', rule_used: 'no location/country data' };
}

// ============ UTILIZATION CALCULATION ============

function calculateUtilization(allocations: any[]): { current_percent: number | null; status: 'under' | 'on_target' | 'over' | 'unknown'; calc_notes: string } {
  if (!allocations || allocations.length === 0) {
    return { current_percent: null, status: 'unknown', calc_notes: 'No active allocations' };
  }
  
  const totalPercent = allocations.reduce((sum, a) => sum + (a.allocation_percent || 0), 0);
  const current = Math.round(totalPercent);
  
  let status: 'under' | 'on_target' | 'over' = 'under';
  if (current >= 80 && current <= 100) status = 'on_target';
  else if (current > 100) status = 'over';
  
  return {
    current_percent: current,
    status,
    calc_notes: `Sum of ${allocations.length} allocations`
  };
}

// ============ FALLBACK SEQUENCE EXECUTOR ============

async function executeWithFallbacks(
  supabase: any,
  queryPlan: QueryPlan,
  context: any,
  userQuery: string
): Promise<QueryResult> {
  const debug = {
    timezone: 'Asia/Riyadh',
    rls_blocked: false,
    datatype_warnings: [] as string[],
    queries_executed: [] as string[],
    fallbacks_executed: [] as string[],
  };
  
  const today = new Date().toISOString().split('T')[0];
  let rows: any[] = [];
  let appliedFilters: Record<string, any> = {};
  
  // ============ PRIMARY QUERY ============
  if (queryPlan.intent === 'resource_lookup' && queryPlan.entities.resource_name) {
    debug.queries_executed.push('resource_lookup_primary');
    const result = await executeResourceLookup(supabase, queryPlan.entities.resource_name, context, today);
    rows = result.rows;
    appliedFilters = result.filters;
    
    // FALLBACK LEVEL 1: Try fuzzy match
    if (rows.length === 0) {
      debug.fallbacks_executed.push('fuzzy_name_match');
      queryPlan.fallback_level = 1;
      const fuzzyResult = await executeFuzzyResourceLookup(supabase, queryPlan.entities.resource_name);
      rows = fuzzyResult.rows;
      appliedFilters = { ...appliedFilters, fuzzy: true };
    }
    
    // FALLBACK LEVEL 2: Try partial match
    if (rows.length === 0) {
      debug.fallbacks_executed.push('partial_name_match');
      queryPlan.fallback_level = 2;
      const partialResult = await executePartialResourceLookup(supabase, queryPlan.entities.resource_name);
      rows = partialResult.rows;
      appliedFilters = { ...appliedFilters, partial: true };
    }
    
    // FALLBACK LEVEL 3: Return similar names
    if (rows.length === 0) {
      debug.fallbacks_executed.push('similar_names');
      queryPlan.fallback_level = 3;
      const similarResult = await getSimilarNames(supabase, queryPlan.entities.resource_name);
      rows = similarResult.rows;
      appliedFilters = { ...appliedFilters, similar_names: true };
    }
  } else {
    // AGGREGATE QUERY
    debug.queries_executed.push('aggregate_primary');
    const result = await executeAggregateQuery(supabase, queryPlan, context, userQuery, today);
    rows = result.rows;
    appliedFilters = result.filters;
    
    // FALLBACK LEVEL 1: Expand time window
    if (rows.length === 0 && queryPlan.time_window.type !== 'none') {
      debug.fallbacks_executed.push('expand_time_window');
      queryPlan.fallback_level = 1;
      const expandedResult = await executeAggregateQuery(supabase, { ...queryPlan, time_window: { type: 'relative', days: 180, label: 'Next 180 days' } }, context, userQuery, today);
      rows = expandedResult.rows;
    }
    
    // FALLBACK LEVEL 2: Remove filters
    if (rows.length === 0) {
      debug.fallbacks_executed.push('remove_filters');
      queryPlan.fallback_level = 2;
      const noFilterResult = await executeAggregateQuery(supabase, { ...queryPlan, filters: {} }, { department: 'All', location: 'All' }, userQuery, today);
      rows = noFilterResult.rows;
    }
    
    // FALLBACK LEVEL 3: Return closest data
    if (rows.length === 0) {
      debug.fallbacks_executed.push('nearest_data');
      queryPlan.fallback_level = 3;
      const nearestResult = await getNearestData(supabase, queryPlan, today);
      rows = nearestResult.rows;
      appliedFilters = { ...appliedFilters, nearest_match: true };
    }
  }
  
  // FALLBACK LEVEL 4: Diagnostics
  if (rows.length === 0) {
    debug.fallbacks_executed.push('diagnostics');
    queryPlan.fallback_level = 4;
    const diagnostics = await runDiagnostics(supabase);
    rows = [{ _diagnostic: true, ...diagnostics }];
  }
  
  return {
    row_count: rows.length,
    rows,
    applied_filters: appliedFilters,
    window: {
      start: queryPlan.time_window.start || null,
      end: queryPlan.time_window.end || null,
      label: queryPlan.time_window.label,
    },
    debug,
  };
}

// ============ INDIVIDUAL RESOURCE LOOKUP ============

async function executeResourceLookup(supabase: any, name: string, context: any, today: string): Promise<{ rows: any[]; filters: Record<string, any> }> {
  const { data: resources } = await supabase
    .from('resource_inventory')
    .select('*')
    .or(`name.ilike.%${name}%,email.ilike.%${name}%`)
    .eq('is_active', true)
    .limit(5);
  
  if (!resources || resources.length === 0) {
    return { rows: [], filters: { name_search: name } };
  }
  
  const enrichedResources = await enrichResources(supabase, resources, today);
  return { rows: enrichedResources, filters: { name_search: name } };
}

async function executeFuzzyResourceLookup(supabase: any, name: string): Promise<{ rows: any[] }> {
  // Try starts-with
  const { data: resources } = await supabase
    .from('resource_inventory')
    .select('*')
    .ilike('name', `${name}%`)
    .eq('is_active', true)
    .limit(5);
  
  return { rows: resources || [] };
}

async function executePartialResourceLookup(supabase: any, name: string): Promise<{ rows: any[] }> {
  // Try each word
  const words = name.split(/\s+/);
  for (const word of words) {
    if (word.length >= 3) {
      const { data: resources } = await supabase
        .from('resource_inventory')
        .select('*')
        .ilike('name', `%${word}%`)
        .eq('is_active', true)
        .limit(5);
      
      if (resources && resources.length > 0) {
        return { rows: resources };
      }
    }
  }
  return { rows: [] };
}

async function getSimilarNames(supabase: any, name: string): Promise<{ rows: any[] }> {
  // Return all resources sorted by name similarity (first 10)
  const { data: resources } = await supabase
    .from('resource_inventory')
    .select('id, name, role_name, department_name')
    .eq('is_active', true)
    .order('name')
    .limit(10);
  
  return { 
    rows: (resources || []).map((r: any) => ({ 
      ...r, 
      _similar_suggestion: true,
      _search_term: name 
    })) 
  };
}

// ============ AGGREGATE QUERY ============

async function executeAggregateQuery(
  supabase: any,
  queryPlan: QueryPlan,
  context: any,
  userQuery: string,
  today: string
): Promise<{ rows: any[]; filters: Record<string, any> }> {
  const queryLower = userQuery.toLowerCase();
  const askingExpiring = queryLower.includes('expir') || queryLower.includes('contract') || queryLower.includes('ending');
  
  // Determine date range for expiring contracts
  let expiryStart = today;
  let expiryEnd: string;
  
  if (queryPlan.time_window.start && queryPlan.time_window.end) {
    expiryStart = queryPlan.time_window.start;
    expiryEnd = queryPlan.time_window.end;
  } else {
    const days = queryPlan.time_window.days || 90;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    expiryEnd = endDate.toISOString().split('T')[0];
  }
  
  // Build resource query
  let resourceQuery = supabase
    .from('resource_inventory')
    .select('id, name, department_id, department_name, vendor_id, vendor_name, country_id, location_id, contract_end_date, contract_start_date, role_name')
    .eq('is_active', true);
  
  // Apply department filter
  const deptName = context?.department || 'All';
  if (deptName && !deptName.toLowerCase().includes('all')) {
    const { data: depts } = await supabase
      .from('capacity_departments')
      .select('id, name')
      .ilike('name', `%${deptName.replace('Department', '').trim()}%`)
      .limit(1);
    
    if (depts?.[0]) {
      resourceQuery = resourceQuery.eq('department_id', depts[0].id);
    }
  }
  
  const { data: resources, error } = await resourceQuery;
  
  if (error || !resources || resources.length === 0) {
    return { rows: [], filters: { department: deptName } };
  }
  
  const enrichedResources = await enrichResources(supabase, resources, today);
  
  // Filter for expiring contracts if asked
  if (askingExpiring) {
    const expiringResources = enrichedResources.filter((r: any) => {
      if (!r.contract_end_date) return false;
      const endDate = r.contract_end_date.split('T')[0];
      return endDate >= expiryStart && endDate <= expiryEnd;
    });
    
    // Sort by expiry date
    expiringResources.sort((a: any, b: any) => {
      const dateA = a.contract_end_date || '9999-12-31';
      const dateB = b.contract_end_date || '9999-12-31';
      return dateA.localeCompare(dateB);
    });
    
    return { 
      rows: expiringResources.slice(0, queryPlan.limit), 
      filters: { department: deptName, expiry_window: `${expiryStart} to ${expiryEnd}` } 
    };
  }
  
  return { rows: enrichedResources.slice(0, queryPlan.limit), filters: { department: deptName } };
}

async function getNearestData(supabase: any, queryPlan: QueryPlan, today: string): Promise<{ rows: any[] }> {
  // Get next 10 expiring contracts regardless of time window
  const { data: resources } = await supabase
    .from('resource_inventory')
    .select('id, name, department_name, vendor_name, contract_end_date, role_name')
    .eq('is_active', true)
    .gte('contract_end_date', today)
    .order('contract_end_date', { ascending: true })
    .limit(10);
  
  return { 
    rows: (resources || []).map((r: any) => ({ 
      ...r, 
      _nearest_match: true,
      _label: 'Next upcoming expiries (beyond requested window)'
    })) 
  };
}

// ============ DIAGNOSTICS ============

async function runDiagnostics(supabase: any): Promise<Record<string, any>> {
  const today = new Date().toISOString().split('T')[0];
  
  const [
    { count: totalResources },
    { count: withContractEnd },
    { count: currentAllocations },
    { count: totalAssignments }
  ] = await Promise.all([
    supabase.from('resource_inventory').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('resource_inventory').select('*', { count: 'exact', head: true }).eq('is_active', true).not('contract_end_date', 'is', null),
    supabase.from('resource_allocations').select('*', { count: 'exact', head: true }).lte('start_date', today).gte('end_date', today),
    supabase.from('resource_assignments').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ]);
  
  return {
    total_resources_visible: totalResources || 0,
    resources_with_contract_end: withContractEnd || 0,
    current_month_allocations: currentAllocations || 0,
    total_assignments: totalAssignments || 0,
    data_exists: (totalResources || 0) > 0,
    possible_issue: (totalResources || 0) === 0 ? 'RLS or tenant scope may be blocking rows' : 'No matching records for query criteria',
  };
}

// ============ RESOURCE ENRICHMENT ============

async function enrichResources(supabase: any, resources: any[], today: string): Promise<any[]> {
  const resourceIds = resources.map((r: any) => r.id);
  
  // Fetch vendors
  const vendorIds = [...new Set(resources.map((r: any) => r.vendor_id).filter(Boolean))];
  let vendorMap = new Map<string, string>();
  if (vendorIds.length > 0) {
    const { data: vendors } = await supabase.from('resource_vendors').select('id, name').in('id', vendorIds);
    vendorMap = new Map((vendors || []).map((v: any) => [v.id, v.name]));
  }
  
  // Fetch departments
  const deptIds = [...new Set(resources.map((r: any) => r.department_id).filter(Boolean))];
  let deptMap = new Map<string, string>();
  if (deptIds.length > 0) {
    const { data: depts } = await supabase.from('capacity_departments').select('id, name').in('id', deptIds);
    deptMap = new Map((depts || []).map((d: any) => [d.id, d.name]));
  }
  
  // Fetch locations
  const locationIds = [...new Set(resources.map((r: any) => r.location_id).filter(Boolean))];
  let locationMap = new Map<string, string>();
  let onSiteLocationIds = new Set<string>();
  if (locationIds.length > 0) {
    const { data: locations } = await supabase.from('resource_locations').select('id, name').in('id', locationIds);
    (locations || []).forEach((loc: any) => {
      locationMap.set(loc.id, loc.name);
      const locName = (loc.name || '').toLowerCase();
      if (locName.includes('onsite') || locName.includes('on-site') || locName.includes('on site')) {
        onSiteLocationIds.add(loc.id);
      }
    });
  }
  
  // Fetch countries
  const countryIds = [...new Set(resources.map((r: any) => r.country_id).filter(Boolean))];
  let countryMap = new Map<string, { code: string; name: string }>();
  if (countryIds.length > 0) {
    const { data: countries } = await supabase.from('resource_countries').select('id, code, name').in('id', countryIds);
    countryMap = new Map((countries || []).map((c: any) => [c.id, { code: c.code, name: c.name }]));
  }
  
  // Fetch allocations (today only for utilization)
  const { data: allocations } = await supabase
    .from('resource_allocations')
    .select('resource_id, allocation_percent, assignment_id')
    .in('resource_id', resourceIds)
    .lte('start_date', today)
    .gte('end_date', today)
    .in('status', ['active', 'committed', 'forecast']);
  
  // Fetch assignment names
  const assignmentIds = [...new Set((allocations || []).map((a: any) => a.assignment_id).filter(Boolean))];
  let assignmentMap = new Map<string, string>();
  if (assignmentIds.length > 0) {
    const { data: assignments } = await supabase.from('resource_assignments').select('id, name').in('id', assignmentIds);
    assignmentMap = new Map((assignments || []).map((a: any) => [a.id, a.name]));
  }
  
  // Build resource allocation map
  const resourceAllocMap = new Map<string, { total: number; assignments: string[] }>();
  (allocations || []).forEach((a: any) => {
    const existing = resourceAllocMap.get(a.resource_id) || { total: 0, assignments: [] };
    existing.total += a.allocation_percent || 0;
    const assignmentName = assignmentMap.get(a.assignment_id);
    if (assignmentName && !existing.assignments.includes(assignmentName)) {
      existing.assignments.push(assignmentName);
    }
    resourceAllocMap.set(a.resource_id, existing);
  });
  
  // Enrich resources
  return resources.map((r: any) => {
    const allocData = resourceAllocMap.get(r.id) || { total: 0, assignments: [] };
    const locationName = locationMap.get(r.location_id);
    const isOnSite = r.location_id && onSiteLocationIds.has(r.location_id);
    const country = countryMap.get(r.country_id);
    
    const util = calculateUtilization([{ allocation_percent: allocData.total }]);
    
    return {
      resource_id: r.id,
      rid: r.resource_id || r.id,
      name: r.name,
      role: r.role_name || 'Unspecified',
      department: {
        id: r.department_id,
        name: deptMap.get(r.department_id) || r.department_name || 'Unknown',
      },
      vendor: {
        id: r.vendor_id,
        name: vendorMap.get(r.vendor_id) || r.vendor_name || 'No Vendor',
      },
      location: isOnSite ? 'Onsite' : 'Offshore',
      site_status: determineSiteStatus(r, locationName),
      country: country?.name || 'Unknown',
      country_code: country?.code || null,
      contract_start_date: r.contract_start_date,
      contract_end_date: r.contract_end_date,
      allocation_percent: allocData.total,
      utilization_percent: util.current_percent !== null ? (100 - allocData.total) : null,
      utilization_status: util.status,
      assignments: allocData.assignments,
    };
  });
}

// ============ SYSTEM PROMPT ============

const SYSTEM_PROMPT = `You are CATY AI™, the Resource Capacity Assistant for Catalyst.

##############################################
# CRITICAL: OUTPUT STRUCTURE
##############################################

YOUR OUTPUT MUST BE IN THIS EXACT ORDER:
1. MAIN CONTENT (Profile Card OR Data Card) - THIS MUST COME FIRST
2. DATA PROVENANCE (small footer at the very end)

NEVER output provenance without main content first!
NEVER output raw JSON, debug info, or metadata as the main response!

##############################################
# ABSOLUTE RULES
##############################################

1. TABLE-BOUND ONLY: Use data from DATABASE CONTEXT only. Never hallucinate.
2. ZERO FINANCIAL DOMAIN: NEVER mention payment, budget, cost, CTC, salary, invoice.
3. USE DATABASE CONTEXT data for all answers.
4. NEVER SAY "NO DATA" without diagnostics proof.

##############################################
# RESPONSE DECISION TREE
##############################################

IF DATABASE CONTEXT has exactly 1 resource:
  → Output PROFILE CARD (no intro text, no preamble)

IF DATABASE CONTEXT has 2+ resources:
  → Output DATA CARD with RESOURCE ROWS

IF DATABASE CONTEXT has 0 resources but has diagnostics:
  → Output DIAGNOSTICS bubble

IF DATABASE CONTEXT has _similar_suggestion records:
  → Output "no exact match" bubble + DATA CARD

##############################################
# HTML TEMPLATES (USE EXACTLY!)
##############################################

PROFILE CARD (single resource - output this IMMEDIATELY, no intro!):
<div class="caty-profile-card">
  <div class="caty-profile-header">
    <div class="caty-profile-avatar">[INITIALS - 2 letters from name]</div>
    <div class="caty-profile-identity">
      <div class="caty-profile-name">[FULL NAME from resource]</div>
      <div class="caty-profile-role">[role] • [department.name]</div>
    </div>
  </div>
  <div class="caty-profile-details">
    <div class="caty-profile-row">
      <span class="caty-profile-label">Vendor</span>
      <span class="caty-profile-value">[vendor.name]</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Location</span>
      <span class="caty-profile-value">[location - Onsite/Offshore]</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Allocation</span>
      <span class="caty-profile-value">[allocation_percent]%</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Utilization</span>
      <span class="caty-profile-value">[utilization_percent]%</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Contract Start</span>
      <span class="caty-profile-value">[contract_start_date or N/A]</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Contract End</span>
      <span class="caty-profile-value">[contract_end_date or N/A]</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Assignments</span>
      <span class="caty-profile-value">[assignments array joined or None]</span>
    </div>
  </div>
</div>

DATA CARD (2+ resources):
<div class="caty-data-card">
  <div class="caty-data-card-header info">
    <span class="caty-data-card-title">[DESCRIPTIVE TITLE]</span>
    <span class="caty-data-card-badge">[COUNT]</span>
  </div>
  <div class="caty-data-card-body">
    [RESOURCE ROWS HERE]
  </div>
</div>

RESOURCE ROW (inside data card body):
<div class="caty-data-row">
  <div class="caty-data-avatar-box">[INITIALS]</div>
  <div class="caty-data-info">
    <div class="caty-data-name">[NAME]</div>
    <div class="caty-data-meta">[role] • [department.name] • [vendor.name]</div>
    <div class="caty-data-assignments">[contract_end_date] • [assignments]</div>
  </div>
  <div class="caty-data-tags">
    <span class="caty-tag location">[location]</span>
    <span class="caty-tag util">[allocation_percent]%</span>
  </div>
</div>

PROVENANCE FOOTER (ALWAYS last, after main content):
<div class="caty-provenance">
  <div class="caty-prov-row"><span>Tables:</span> ['resources']</div>
  <div class="caty-prov-row"><span>Filters:</span> [applied_filters from metadata]</div>
  <div class="caty-prov-row"><span>Window:</span> [window.label from metadata]</div>
  <div class="caty-prov-row"><span>Rows:</span> [row_count from metadata]</div>
  <div class="caty-prov-row"><span>Fallbacks:</span> [fallbacks_executed array]</div>
  <div class="caty-prov-row"><span>Confidence:</span> [High if fallback_level=0, Medium if 1-2, Low if 3+]</div>
</div>

##############################################
# CONTEXT
##############################################
- Department: {department}
- Period: {period}  
- Location: {location}

##############################################
# DATABASE CONTEXT (your data source!)
##############################################
{resource_context}

##############################################
# EXECUTION METADATA (for provenance footer)
##############################################
{execution_metadata}

IMPORTANT REMINDERS:
- Output valid HTML only, no markdown
- For single resource: Profile Card first, then provenance
- For multiple resources: Data Card first, then provenance
- NEVER output only provenance without main content!`;

// ============ DIRECT RESPONSE GENERATORS ============

function generateProfileCardHtml(resource: any, metadata: any): string {
  const initials = resource.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const contractStart = resource.contract_start_date || 'N/A';
  const contractEnd = resource.contract_end_date || 'N/A';
  const assignmentsList = resource.assignments?.length > 0 ? resource.assignments.join(', ') : 'None';
  const allocation = resource.allocation_percent ?? 0;
  const utilization = resource.utilization_percent ?? (100 - allocation);
  
  // NOTE: Data Provenance section removed per user request — no raw JSON/debug data shown
  
  return `<div class="caty-profile-card">
  <div class="caty-profile-header">
    <div class="caty-profile-avatar">${initials}</div>
    <div class="caty-profile-identity">
      <div class="caty-profile-name">${resource.name}</div>
      <div class="caty-profile-role">${resource.role} • ${resource.department?.name || 'Unknown'}</div>
    </div>
  </div>
  <div class="caty-profile-details">
    <div class="caty-profile-row">
      <span class="caty-profile-label">Vendor</span>
      <span class="caty-profile-value">${resource.vendor?.name || 'No Vendor'}</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Location</span>
      <span class="caty-profile-value">${resource.location || 'Unknown'}</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Allocation</span>
      <span class="caty-profile-value">${allocation}%</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Utilization</span>
      <span class="caty-profile-value">${utilization}%</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Contract Start</span>
      <span class="caty-profile-value">${contractStart}</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Contract End</span>
      <span class="caty-profile-value">${contractEnd}</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Assignments</span>
      <span class="caty-profile-value">${assignmentsList}</span>
    </div>
  </div>
</div>`;
}

function generateDataCardHtml(resources: any[], title: string, metadata: any): string {
  const rows = resources.slice(0, 20).map((r: any) => {
    const initials = r.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '??';
    const contractEnd = r.contract_end_date || 'N/A';
    const assignments = r.assignments?.length > 0 ? r.assignments.join(', ') : 'None';
    const allocation = r.allocation_percent ?? 0;
    
    return `<div class="caty-data-row">
  <div class="caty-data-avatar-box">${initials}</div>
  <div class="caty-data-info">
    <div class="caty-data-name">${r.name}</div>
    <div class="caty-data-meta">${r.role || 'Unknown'} • ${r.department?.name || 'Unknown'} • ${r.vendor?.name || 'No Vendor'}</div>
    <div class="caty-data-assignments">${contractEnd} • ${assignments}</div>
  </div>
  <div class="caty-data-tags">
    <span class="caty-tag location">${r.location || 'Unknown'}</span>
    <span class="caty-tag util">${allocation}%</span>
  </div>
</div>`;
  }).join('\n');

  // NOTE: Data Provenance section removed per user request — no raw JSON/debug data shown

  return `<div class="caty-data-card">
  <div class="caty-data-card-header info">
    <span class="caty-data-card-title">${title}</span>
    <span class="caty-data-card-badge">${resources.length}</span>
  </div>
  <div class="caty-data-card-body">
${rows}
  </div>
</div>`;
}

// ============ TITLE GENERATOR ============

function getDataCardTitle(queryPlan: QueryPlan, count: number): string {
  if (queryPlan.intent === 'resource_lookup' && queryPlan.entities.resource_name) {
    return `Resources matching "${queryPlan.entities.resource_name}"`;
  }
  
  switch (queryPlan.intent) {
    case 'contract_window':
      return `Contracts Expiring (${queryPlan.time_window.label})`;
    case 'vendor_filter':
      return queryPlan.entities.vendor_name 
        ? `Resources from ${queryPlan.entities.vendor_name}`
        : 'Resources by Vendor';
    case 'department_filter':
      return queryPlan.entities.department_name 
        ? `${queryPlan.entities.department_name} Resources`
        : 'Resources by Department';
    case 'role_filter':
      return queryPlan.entities.role_name 
        ? `${queryPlan.entities.role_name} Resources`
        : 'Resources by Role';
    case 'location_filter':
      return queryPlan.entities.location === 'Offshore' 
        ? 'Offshore Resources'
        : 'Onsite Resources';
    case 'utilization':
      return 'Resource Utilization';
    case 'assignment_staffing':
      return 'Assignment Staffing';
    default:
      return `Resources Found`;
  }
}

// ============ NO RESULTS GENERATOR ============

function generateNoResultsHtml(queryPlan: QueryPlan, metadata: any): string {
  const searchTerm = queryPlan.entities.resource_name || 'your criteria';
  
  // NOTE: Data Provenance section removed per user request — no raw JSON/debug data shown
  
  return `<div class="caty-bubble">
  <p>No resources found matching "${searchTerm}".</p>
  <p style="margin-top: 8px; font-size: 13px;">Try:</p>
  <ul style="margin: 4px 0 0 16px; font-size: 13px;">
    <li>Checking the spelling</li>
    <li>Using a partial name</li>
    <li>Broadening filters</li>
  </ul>
</div>`;
}

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

    // Get latest user message
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    const userQuery = lastUserMessage?.content || '';

    // HARD BAN: Check for financial queries
    if (isFinancialQuery(userQuery)) {
      return new Response(
        `data: ${JSON.stringify({ choices: [{ delta: { content: FINANCIAL_REJECTION_MESSAGE } }] })}\n\ndata: [DONE]\n\n`,
        { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }
      );
    }

    // Build query plan
    const queryPlan = buildQueryPlan(userQuery, context);
    console.log('[CATY] Query Plan:', JSON.stringify(queryPlan, null, 2));

    // Execute with fallback sequence
    const queryResult = await executeWithFallbacks(supabase, queryPlan, context, userQuery);
    console.log('[CATY] Query Result:', {
      row_count: queryResult.row_count,
      fallback_level: queryPlan.fallback_level,
      fallbacks: queryResult.debug.fallbacks_executed,
    });

    const metadata = {
      row_count: queryResult.row_count,
      applied_filters: queryResult.applied_filters,
      window: queryResult.window,
      fallback_level: queryPlan.fallback_level,
      fallbacks_executed: queryResult.debug.fallbacks_executed,
    };

    // ============ DIRECT RESPONSE FOR ALL QUERIES WITH RESULTS ============
    // Generate HTML directly without AI to ensure consistent output
    // This bypasses the AI entirely and guarantees proper UI component rendering
    if (queryResult.rows.length > 0 && !queryResult.rows[0]?._diagnostic) {
      let directHtml: string;
      
      if (queryResult.rows.length === 1 && queryPlan.intent === 'resource_lookup') {
        // Single resource lookup: Profile Card
        directHtml = generateProfileCardHtml(queryResult.rows[0], metadata);
      } else {
        // Multiple resources or aggregate queries: Data Card
        const title = getDataCardTitle(queryPlan, queryResult.rows.length);
        directHtml = generateDataCardHtml(queryResult.rows, title, metadata);
      }
      
      // Return as SSE stream
      return new Response(
        `data: ${JSON.stringify({ choices: [{ delta: { content: directHtml } }] })}\n\ndata: [DONE]\n\n`,
        { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }
      );
    }
    
    // ============ DIRECT RESPONSE FOR NO RESULTS ============
    // Generate a "no results" message directly
    if (queryResult.rows.length === 0 || queryResult.rows[0]?._diagnostic) {
      const noResultsHtml = generateNoResultsHtml(queryPlan, metadata);
      return new Response(
        `data: ${JSON.stringify({ choices: [{ delta: { content: noResultsHtml } }] })}\n\ndata: [DONE]\n\n`,
        { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }
      );
    }

    // ============ AI RESPONSE FOR COMPLEX QUERIES ============
    // Build system prompt with context for aggregate/complex queries
    const systemPrompt = SYSTEM_PROMPT
      .replace('{department}', context?.department || 'All Departments')
      .replace('{period}', context?.period || 'Current Period')
      .replace('{location}', context?.location || 'All Locations')
      .replace('{resource_context}', JSON.stringify(queryResult.rows, null, 2))
      .replace('{execution_metadata}', JSON.stringify(metadata, null, 2));

    // Retry logic for transient AI gateway failures
    const MAX_RETRIES = 2;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages,
            ],
            stream: true,
          }),
        });

        if (response.ok) {
          return new Response(response.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }

        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // For 5xx errors, retry after a brief delay
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          const errorText = await response.text();
          console.warn(`[CATY] AI gateway error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, response.status, errorText);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        
        const t = await response.text();
        console.error("[CATY] AI gateway error:", response.status, t);
        lastError = new Error(`AI gateway error: ${response.status}`);
      } catch (fetchError) {
        console.warn(`[CATY] Fetch error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, fetchError);
        lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
      }
    }
    
    // All retries failed
    console.error("[CATY] All retries failed:", lastError?.message);
    return new Response(
      JSON.stringify({ error: "AI service temporarily unavailable. Please try again in a moment." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[CATY] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});