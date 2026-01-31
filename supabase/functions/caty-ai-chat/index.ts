import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============ QUERY TYPE DETECTION ============

type QueryType = 'individual_resource' | 'aggregate' | 'general';

const RESOURCE_KEYWORDS = [
  'who', 'resource', 'contractor', 'engineer', 'developer', 'pm', 'project manager',
  'allocation', 'availability', 'utilization', 'capacity', 'assigned', 'available',
  'person', 'team member', 'employee', 'staff', 'consultant'
];

const AGGREGATE_KEYWORDS = [
  'by department', 'department', 'all resources', 'team', 'everyone', 'summary',
  'overview', 'breakdown', 'distribution', 'across', 'total', 'offshore', 'off-shore',
  'onsite', 'on-site', 'expiring', 'contracts', 'how many', 'count'
];

function detectQueryType(message: string): QueryType {
  const lower = message.toLowerCase();
  
  // IMPORTANT: Check for specific resource identifier (name pattern) FIRST
  // This takes priority so queries like "Show contract for John Smith" find the individual
  
  // Check for two capitalized words (e.g., "John Smith")
  if (/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(message)) {
    return 'individual_resource';
  }
  
  // CRITICAL: Also check for lowercase single-word names that appear after key phrases
  // E.g., "when is nada contract expiring" should detect "nada" as individual
  const individualPatterns = [
    /(?:who is|show|find|about|when is|what is|where is|check|look up|lookup)\s+(\w{3,})/i,
    /(\w{3,})(?:'s|\s+contract|\s+allocation|\s+availability|\s+utilization)/i,
  ];
  
  for (const pattern of individualPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const potentialName = match[1].toLowerCase();
      // Exclude common non-name words
      const excludeWords = ['the', 'all', 'my', 'our', 'any', 'some', 'this', 'that', 'each', 'every', 'department', 'team', 'offshore', 'onsite'];
      if (!excludeWords.includes(potentialName)) {
        return 'individual_resource';
      }
    }
  }
  
  // FALLBACK: Short single/double word input (3+ chars) without aggregate keywords = individual lookup
  const trimmed = message.trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= 2 && trimmed.length >= 3) {
    const aggregateWords = ['summary', 'total', 'count', 'average', 'avg', 'show all', 'list all', 'all resources', 'how many', 'department', 'vendor', 'offshore', 'onsite', 'expiring', 'utilization'];
    const isAggregate = aggregateWords.some(kw => lower.includes(kw));
    if (!isAggregate) {
      return 'individual_resource';
    }
  }
  
  // Check for aggregate keywords (only if no individual name was detected)
  if (AGGREGATE_KEYWORDS.some(kw => lower.includes(kw))) {
    return 'aggregate';
  }
  
  // Check for resource keywords
  if (RESOURCE_KEYWORDS.some(kw => lower.includes(kw))) {
    return 'aggregate';
  }
  
  return 'general';
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
  
  // CRITICAL: Extract single-word names after key phrases (case-insensitive)
  const singleNamePatterns = [
    /(?:who is|show|find|about|when is|what is|where is|check|look up|lookup)\s+(\w{3,})/i,
    /(\w{3,})(?:'s|\s+contract|\s+allocation|\s+availability|\s+utilization)/i,
  ];
  
  for (const pattern of singleNamePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const potentialName = match[1].toLowerCase();
      // Exclude common non-name words
      const excludeWords = ['the', 'all', 'my', 'our', 'any', 'some', 'this', 'that', 'each', 'every', 'department', 'team', 'offshore', 'onsite'];
      if (!excludeWords.includes(potentialName)) {
        return match[1]; // Return with original casing
      }
    }
  }
  
  // FALLBACK: If user types just a short word (3+ chars) with no aggregate keywords, treat as name lookup
  const trimmed = message.trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= 2 && trimmed.length >= 3) {
    const lower = trimmed.toLowerCase();
    const aggregateWords = ['summary', 'total', 'count', 'average', 'avg', 'show all', 'list all', 'all resources', 'how many', 'department', 'vendor', 'offshore', 'onsite', 'expiring', 'utilization'];
    const isAggregate = aggregateWords.some(kw => lower.includes(kw));
    if (!isAggregate) {
      // Return the trimmed input as-is (could be first name like "nada" or "vikram")
      return trimmed;
    }
  }
  
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

  // Step 1b: Resolve location name from location_id (source of truth)
  // This prevents misclassification when country != site (e.g., offshore nationality but onsite location)
  if (resourceData.location_id) {
    const { data: loc } = await supabase
      .from('resource_locations')
      .select('id, name')
      .eq('id', resourceData.location_id)
      .single();

   if (loc?.name) {
      // determineSiteStatus reads `resource.location`/`location_type`
      resourceData.location = loc.name;
    }
  }

  // Step 1c: Resolve vendor name from vendor_id (vendor_name in resource_inventory is often null)
  if (resourceData.vendor_id && !resourceData.vendor_name) {
    const { data: vendor } = await supabase
      .from('resource_vendors')
      .select('id, name')
      .eq('id', resourceData.vendor_id)
      .single();

    if (vendor?.name) {
      resourceData.vendor_name = vendor.name;
    }
  }
  
  // Step 2: Get department
  if (resourceData.department_id) {
    // NOTE: resource_inventory.department_id maps to capacity_departments (not departments)
    const { data: dept } = await supabase
      .from('capacity_departments')
      .select('id, name, department_id')
      .eq('id', resourceData.department_id)
      .single();

    if (dept?.name) {
      departmentData = { id: dept.id, name: dept.name };
    } else if (resourceData.department_name) {
      // Fallback when FK lookup fails / schema cache mismatch
      departmentData = { id: null, name: resourceData.department_name };
    }
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
  // FIXED: Include all valid statuses (active, committed, forecast) - not just 'active'
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
    .in('status', ['active', 'committed', 'forecast']);
  
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

// ============ AGGREGATE CONTEXT BUILDER ============

async function buildAggregateContext(
  supabase: any,
  context: { department?: string; period?: string; location?: string },
  userQuery: string = ''
): Promise<any> {
  const timeRange = parseTimeRange(context.period || '');
  const today = new Date().toISOString().split('T')[0];
  const queryLower = userQuery.toLowerCase();
  
  // Build date range for allocations
  let dateStart = today;
  let dateEnd = today;
  if (timeRange.start && timeRange.end) {
    dateStart = timeRange.start;
    dateEnd = timeRange.end;
  }
  
  // Detect if asking about "no vendor" - note: all resources have vendor_id in this system
  const askingNoVendor = queryLower.includes('no vendor') || queryLower.includes('without vendor');
  
  // Detect if asking about expiring contracts
  const askingExpiring = queryLower.includes('expir') || queryLower.includes('contract') || queryLower.includes('ending');
  
  // Extract numeric limit from query (e.g., "show 5", "top 10")
  const limitMatch = queryLower.match(/(?:show|top|first|list)\s*(\d+)/);
  const queryLimit = limitMatch ? parseInt(limitMatch[1]) : 10;
  
  // Step 1: Fetch all active resources
  let resourceQuery = supabase
    .from('resource_inventory')
    .select('id, name, department_id, department_name, vendor_id, vendor_name, country_id, location_id, contract_end_date, role_name')
    .eq('is_active', true);
  
  // Filter by department if specified and not "All"
  const deptName = context.department || 'All Departments';
  if (deptName && !deptName.toLowerCase().includes('all')) {
    const { data: depts } = await supabase
      .from('capacity_departments')
      .select('id, name')
      .ilike('name', `%${deptName.replace('Department', '').trim()}%`)
      .limit(1);
    
    if (depts && depts.length > 0) {
      resourceQuery = resourceQuery.eq('department_id', depts[0].id);
    }
  }
  
  const { data: resources, error: resourceError } = await resourceQuery;
  
  if (resourceError || !resources || resources.length === 0) {
    console.log('[CATY] No resources found for aggregate query', resourceError);
    return {
      summary: {
        total_resources: 0,
        message: 'No resources found matching the criteria'
      },
      time_range: timeRange
    };
  }
  
  // Step 1b: Fetch vendor names from resource_vendors table
  const vendorIds = [...new Set(resources.map((r: any) => r.vendor_id).filter(Boolean))];
  let vendorMap = new Map<string, string>();
  
  if (vendorIds.length > 0) {
    const { data: vendors } = await supabase
      .from('resource_vendors')
      .select('id, name')
      .in('id', vendorIds);
    
    vendorMap = new Map((vendors || []).map((v: any) => [v.id, v.name]));
  }
  
  // Enrich resources with vendor names
  resources.forEach((r: any) => {
    if (r.vendor_id && !r.vendor_name) {
      r.vendor_name = vendorMap.get(r.vendor_id) || null;
    }
  });
  
  // Step 2: Fetch countries for site status
  const countryIds = [...new Set(resources.map((r: any) => r.country_id).filter(Boolean))];
  let countryMap = new Map<string, { code: string; name: string }>();
  
  if (countryIds.length > 0) {
    const { data: countries } = await supabase
      .from('resource_countries')
      .select('id, code, name')
      .in('id', countryIds);
    
    countryMap = new Map((countries || []).map((c: any) => [c.id, { code: c.code || '', name: c.name }]));
  }
  
  // Step 2b: Fetch locations for site status (source of truth)
  const locationIds = [...new Set(resources.map((r: any) => r.location_id).filter(Boolean))];
  let locationMap = new Map<string, string>();
  let onSiteLocationIds = new Set<string>();
  
  if (locationIds.length > 0) {
    const { data: locations } = await supabase
      .from('resource_locations')
      .select('id, name')
      .in('id', locationIds);
    
    (locations || []).forEach((loc: any) => {
      locationMap.set(loc.id, loc.name);
      const locName = (loc.name || '').toLowerCase().trim();
      if (locName.includes('onsite') || locName.includes('on-site') || locName.includes('on site')) {
        onSiteLocationIds.add(loc.id);
      }
    });
  }

  // Step 3: Fetch allocations for all resources (include all valid statuses)
  // CRITICAL FIX: For utilization metrics, ALWAYS use TODAY's date to avoid summing multiple monthly fragments
  // The quarter range is ONLY for expiring contracts analysis
  const resourceIds = resources.map((r: any) => r.id);
  const { data: allocations } = await supabase
    .from('resource_allocations')
    .select('resource_id, allocation_percent, assignment_id')
    .in('resource_id', resourceIds)
    .lte('start_date', today)
    .gte('end_date', today)
    .in('status', ['active', 'committed', 'forecast']);
  
  // Step 3b: Fetch assignment names for allocations
  const assignmentIds = [...new Set((allocations || []).map((a: any) => a.assignment_id).filter(Boolean))];
  let assignmentMap = new Map<string, string>();
  
  if (assignmentIds.length > 0) {
    const { data: assignments } = await supabase
      .from('resource_assignments')
      .select('id, name')
      .in('id', assignmentIds);
    
    assignmentMap = new Map((assignments || []).map((a: any) => [a.id, a.name]));
  }
  
  // Build resource -> assignment names map
  const resourceAssignmentsMap = new Map<string, string[]>();
  (allocations || []).forEach((a: any) => {
    if (a.assignment_id && assignmentMap.has(a.assignment_id)) {
      const existing = resourceAssignmentsMap.get(a.resource_id) || [];
      const assignmentName = assignmentMap.get(a.assignment_id)!;
      if (!existing.includes(assignmentName)) {
        existing.push(assignmentName);
        resourceAssignmentsMap.set(a.resource_id, existing);
      }
    }
  });
  
  // Build utilization map
  const utilMap = new Map<string, number>();
  (allocations || []).forEach((a: any) => {
    utilMap.set(a.resource_id, (utilMap.get(a.resource_id) || 0) + (a.allocation_percent || 0));
  });
  
  // Step 4: Calculate stats
  let totalUtil = 0;
  let overUtilized = 0;
  let underUtilized = 0;
  let onTarget = 0;
  let onSiteCount = 0;
  let offShoreCount = 0;
  
  // Track by department
  const deptStats = new Map<string, { count: number; totalUtil: number; over: number }>();
  
  // Track expiring contracts - use QUARTER range if specified, otherwise 90 days forward
  const expiringResources: any[] = [];
  
  // For expiring, use the quarter range OR 90 days from today
  let expiryStart = today;
  let expiryEnd: string;
  if (timeRange.start && timeRange.end) {
    expiryStart = timeRange.start;
    expiryEnd = timeRange.end;
  } else {
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    expiryEnd = ninetyDaysFromNow.toISOString().split('T')[0];
  }
  
  resources.forEach((r: any) => {
    const util = utilMap.get(r.id) || 0;
    totalUtil += util;
    
    // Attach assignments to resource
    r.assignments = resourceAssignmentsMap.get(r.id) || [];
    
    if (util > 100) overUtilized++;
    else if (util >= 80 && util <= 90) onTarget++;
    else underUtilized++;
    
    // Site status - use location_id (source of truth), NOT country
    const isOnSite = r.location_id && onSiteLocationIds.has(r.location_id);
    r.location_type = isOnSite ? 'Onsite' : 'Offshore';
    if (isOnSite) onSiteCount++;
    else offShoreCount++;
    
    // Department stats
    const deptKey = r.department_name || 'Unknown';
    if (!deptStats.has(deptKey)) {
      deptStats.set(deptKey, { count: 0, totalUtil: 0, over: 0 });
    }
    const deptStat = deptStats.get(deptKey)!;
    deptStat.count++;
    deptStat.totalUtil += util;
    if (util > 100) deptStat.over++;
    
    // Expiring contracts - use quarter/period range
    if (r.contract_end_date) {
      const endDate = new Date(r.contract_end_date);
      const endDateStr = r.contract_end_date.split('T')[0];
      
      // Check if contract end date falls within the range
      if (endDateStr >= expiryStart && endDateStr <= expiryEnd) {
        const daysUntil = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        expiringResources.push({
          name: r.name,
          role_name: r.role_name || 'Unspecified Role',
          department: r.department_name,
          vendor_name: r.vendor_name || 'No Vendor',
          contract_end_date: endDateStr,
          days_until_expiry: daysUntil,
          utilization: util,
          site_status: r.location_type || (r.location_id && onSiteLocationIds.has(r.location_id) ? 'Onsite' : 'Offshore'),
          assignments: r.assignments || []
        });
      }
    }
  });
  
  // Build department breakdown
  const departmentBreakdown = Array.from(deptStats.entries())
    .map(([name, stats]) => ({
      department_name: name,
      resource_count: stats.count,
      avg_utilization: Math.round(stats.totalUtil / stats.count),
      over_utilized_count: stats.over
    }))
    .sort((a, b) => b.resource_count - a.resource_count);
  
  // Build off-shore breakdown by country
  const offshoreByCountry = new Map<string, { name: string; count: number; totalUtil: number }>();
  resources.forEach((r: any) => {
    const country = countryMap.get(r.country_id);
    if (!country || country.code?.toUpperCase() === 'SA' || country.code?.toUpperCase() === 'KSA') return;
    
    const key = country.code || 'Unknown';
    if (!offshoreByCountry.has(key)) {
      offshoreByCountry.set(key, { name: country.name, count: 0, totalUtil: 0 });
    }
    const stat = offshoreByCountry.get(key)!;
    stat.count++;
    stat.totalUtil += utilMap.get(r.id) || 0;
  });
  
  const offshoreBreakdown = Array.from(offshoreByCountry.entries())
    .map(([code, stats]) => ({
      country_code: code,
      country_name: stats.name,
      resource_count: stats.count,
      avg_utilization: Math.round(stats.totalUtil / stats.count)
    }))
    .sort((a, b) => b.resource_count - a.resource_count);
  
  // Sort expiring by days_until_expiry (soonest first)
  expiringResources.sort((a, b) => a.days_until_expiry - b.days_until_expiry);
  
  // Filter for "no vendor" if requested - but note in this system all have vendors
  let filteredExpiring = expiringResources;
  if (askingNoVendor) {
    filteredExpiring = expiringResources.filter(r => !r.vendor_name || r.vendor_name === 'No Vendor Assigned');
  }
  
  return {
    summary: {
      total_resources: resources.length,
      avg_utilization: Math.round(totalUtil / resources.length),
      over_utilized_count: overUtilized,
      under_utilized_count: underUtilized,
      on_target_count: onTarget,
      on_site_count: onSiteCount,
      off_shore_count: offShoreCount,
      expiring_contracts_count: expiringResources.length,
      no_vendor_note: askingNoVendor ? 'All resources in this system have vendors assigned.' : undefined
    },
    department_breakdown: departmentBreakdown.slice(0, 10),
    offshore_breakdown: offshoreBreakdown.slice(0, 8),
    expiring_contracts: filteredExpiring.slice(0, queryLimit),
    all_expiring_contracts: askingExpiring ? expiringResources.slice(0, queryLimit) : undefined,
    time_range: timeRange,
    expiry_date_range: { start: expiryStart, end: expiryEnd },
    filter_applied: {
      department: deptName,
      location: context.location || 'All Locations',
      no_vendor_filter: askingNoVendor
    }
  };
}

// ============ SYSTEM PROMPT ============

const SYSTEM_PROMPT = `You are CATY AI, a Capacity Planning Assistant for Catalyst.

##############################################
# CRITICAL ANTI-HALLUCINATION GUARDRAILS
##############################################

1. ONLY use data from the DATABASE CONTEXT section below
2. NEVER invent, fabricate, or make up ANY names, numbers, or data
3. If the DATABASE CONTEXT shows "Resource not found" or empty data, respond with a "not found" message
4. If a user asks about a specific person NOT in DATABASE CONTEXT, say "I couldn't find that person in the database"
5. NEVER use placeholder or example names - only REAL names from DATABASE CONTEXT
6. If DATABASE CONTEXT is empty or has no resources, say "No matching data found"
7. ALL names, utilization percentages, departments, dates MUST come from DATABASE CONTEXT

##############################################
# OUTPUT FORMAT RULES
##############################################

1. NEVER output markdown (**, ##, ###, *, -)
2. NEVER output plain text without HTML wrapper
3. ALWAYS wrap responses in the HTML components below
4. NEVER show "Data: unknown" or "Confidence: low" or "Unknown" for any field
5. ALWAYS include Name, Role, Department, Vendor, Assignment(s), Location, Utilization for every resource
6. If a resource has assignments in the DATABASE CONTEXT, show them (e.g., "Senaei 3.0, Project X")
7. Do NOT include any footer buttons, action buttons, "View All", "Check Attendance", or suggestion CTAs
8. For INDIVIDUAL RESOURCE lookups (when user types a person's name like "Nada", "Ahmed Yousry", "Abdulrahman"):
   - ALWAYS use the PROFILE CARD component below (never DATA CARD or DATA ROW)
   - NO conversational intro like "I found the profile for..." or "Here are the details..."
   - START DIRECTLY with the PROFILE CARD, no text before it
   - The PROFILE CARD format is MANDATORY for all individual name queries
   - Use EXACTLY this structure with all 5 detail rows: Vendor, Location, Utilization, Contract End, Assignments

##############################################
# HTML COMPONENTS (Use these exactly)
##############################################

TEXT BUBBLE:
<div class="caty-bubble">
  <p>Your message with <strong>bold text</strong>.</p>
</div>

NOT FOUND MESSAGE (use when data not in database):
<div class="caty-bubble">
  <p>I couldn't find <strong>[name/query]</strong> in the Catalyst database. Please check the spelling or try a different search.</p>
</div>

METRICS ROW (4 columns):
<div class="caty-metrics-row">
  <div class="caty-metric-card">
    <div class="caty-metric-value">[VALUE FROM DATABASE]</div>
    <div class="caty-metric-label">Avg Util</div>
  </div>
  <div class="caty-metric-card">
    <div class="caty-metric-value">[VALUE FROM DATABASE]</div>
    <div class="caty-metric-label">Resources</div>
  </div>
  <div class="caty-metric-card danger">
    <div class="caty-metric-value">[VALUE FROM DATABASE]</div>
    <div class="caty-metric-label">Over 100%</div>
  </div>
  <div class="caty-metric-card success">
    <div class="caty-metric-value">[VALUE FROM DATABASE]</div>
    <div class="caty-metric-label">Available</div>
  </div>
</div>

PROFILE CARD (Use for INDIVIDUAL resource lookup - NO intro text before this!):
<div class="caty-profile-card">
  <div class="caty-profile-header">
    <div class="caty-profile-avatar">[INITIALS]</div>
    <div class="caty-profile-identity">
      <div class="caty-profile-name">[FULL NAME FROM DATABASE - resource.display_name]</div>
      <div class="caty-profile-role">[resource.role FROM DATABASE e.g. "Technical PO"] • [resource.department.name]</div>
    </div>
  </div>
  <div class="caty-profile-details">
    <div class="caty-profile-row">
      <span class="caty-profile-label">Vendor</span>
      <span class="caty-profile-value">[VENDOR FROM DATABASE]</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Location</span>
      <span class="caty-profile-value">[On-Site or Off-Shore FROM DATABASE]</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Utilization</span>
      <span class="caty-profile-value [danger|warning|success]">[UTIL% FROM DATABASE]</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Contract End</span>
      <span class="caty-profile-value">[DATE FROM DATABASE]</span>
    </div>
    <div class="caty-profile-row">
      <span class="caty-profile-label">Assignments</span>
      <span class="caty-profile-value">[ASSIGNMENT NAMES FROM DATABASE]</span>
    </div>
  </div>
</div>

DATA CARD (for lists/aggregate views):
<div class="caty-data-card">
  <div class="caty-data-card-header danger">
    <span class="caty-data-card-title">[TITLE]</span>
    <span class="caty-data-card-badge danger">[COUNT FROM DATABASE]</span>
  </div>
  <div class="caty-data-card-body">
    <!-- Resource rows using ONLY DATABASE CONTEXT data -->
  </div>
</div>

RESOURCE ROW (ONLY for resources in DATABASE CONTEXT):
<div class="caty-data-row">
  <div class="caty-data-avatar">[INITIALS FROM DATABASE NAME]</div>
  <div class="caty-data-info">
    <div class="caty-data-name">[NAME FROM DATABASE]</div>
    <div class="caty-data-meta">[role_name FROM DATABASE e.g. "Technical PO"] • [DEPARTMENT] • [VENDOR]</div>
    <div class="caty-data-assignments">[contract_end_date FROM DATABASE e.g. "2025-06-30"]</div>
  </div>
  <div class="caty-data-tags">
    <span class="caty-tag location [onsite|offshore]">[LOCATION FROM DATABASE]</span>
    <span class="caty-tag util [danger|warning|success]">[UTIL% FROM DATABASE]</span>
  </div>
</div>

COUNTRY ROW (for off-shore breakdown):
<div class="caty-team-row">
  <div class="caty-team-flag">[FLAG FROM DATABASE]</div>
  <div class="caty-team-info">
    <div class="caty-team-name">[COUNTRY NAME FROM DATABASE]</div>
  </div>
  <div class="caty-team-stats">
    <span class="caty-team-count">[COUNT FROM DATABASE]</span>
    <span class="caty-team-util">[AVG% FROM DATABASE]</span>
  </div>
</div>

COLOR CLASSES:
- danger = red (>100% util, expiring <7 days)
- warning = amber (90-100% util, expiring 7-14 days)
- success = green (<30% util, available)
- info = blue (neutral)

##############################################
# CURRENT CONTEXT
##############################################
- Department: {department}
- Period: {period}
- Location: {location}

##############################################
# DATABASE CONTEXT (USE ONLY THIS DATA!)
##############################################
{resource_context}

##############################################
# FINAL REMINDER
##############################################
If DATABASE CONTEXT shows "Resource not found" or missing data, respond:
<div class="caty-bubble">
  <p>I couldn't find that information in the Catalyst database.</p>
</div>

NEVER make up names or data. Only use what is in DATABASE CONTEXT above.
NOW RESPOND WITH HTML ONLY.`;


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

    // Detect query type
    const queryType = detectQueryType(userQuery);
    const resourceIdentifier = queryType === 'individual_resource' ? extractResourceIdentifier(userQuery) : null;

    console.log('[CATY] Query type:', queryType, 'Identifier:', resourceIdentifier);

    // Build context based on query type
    let resourceContext = 'No specific context available.';
    
    if (queryType === 'individual_resource' && resourceIdentifier) {
      // Individual resource lookup
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
    } else if (queryType === 'aggregate') {
      // Aggregate data (department-level, team-level, etc.)
      const aggregateData = await buildAggregateContext(supabase, context || {}, userQuery);
      resourceContext = JSON.stringify(aggregateData, null, 2);
      console.log('[CATY] Aggregate context built:', {
        total_resources: aggregateData.summary?.total_resources,
        departments: aggregateData.department_breakdown?.length,
        expiring: aggregateData.expiring_contracts?.length,
        expiry_range: aggregateData.expiry_date_range
      });
    }

    // Build system prompt with context
    const systemPrompt = SYSTEM_PROMPT
      .replace('{department}', context?.department || 'All Departments')
      .replace('{period}', context?.period || 'Current Period')
      .replace('{location}', context?.location || 'All Locations')
      .replace('{resource_context}', resourceContext);

    

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
