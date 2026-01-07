import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Initialize Supabase client to fetch real capacity data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch ALL capacity data for context - include everything
    const [resourcesResult, allocationsResult, assignmentsResult, rolesResult, vendorsResult, departmentsResult] = await Promise.all([
      supabase.from("resource_inventory").select("*"),
      supabase.from("resource_allocations").select("*"),
      supabase.from("resource_assignments").select("*"),
      supabase.from("resource_roles").select("*"),
      supabase.from("resource_vendors").select("*"),
      supabase.from("capacity_departments").select("*"),
    ]);

    const resources = resourcesResult.data || [];
    const allocations = allocationsResult.data || [];
    const assignments = assignmentsResult.data || [];
    const roles = rolesResult.data || [];
    const vendors = vendorsResult.data || [];
    const departments = departmentsResult.data || [];

    // Calculate capacity metrics
    const activeResources = resources.filter((r: any) => r.is_active);
    const totalResources = activeResources.length;
    const resourcesWithAllocations = new Map<string, number>();
    
    allocations.forEach((alloc: any) => {
      const current = resourcesWithAllocations.get(alloc.resource_id) || 0;
      resourcesWithAllocations.set(alloc.resource_id, current + (alloc.allocation_percent || 0));
    });

    let overAllocated = 0;
    let underAllocated = 0;
    let optimallyAllocated = 0;
    let totalUtilization = 0;
    
    activeResources.forEach((resource: any) => {
      const allocated = resourcesWithAllocations.get(resource.id) || 0;
      totalUtilization += allocated;
      
      if (allocated > 100) overAllocated++;
      else if (allocated < 70) underAllocated++;
      else optimallyAllocated++;
    });

    const avgUtilization = totalResources > 0 ? Math.round(totalUtilization / totalResources) : 0;

    // Build COMPLETE resource details for AI context - include ALL fields
    const resourceDetails = resources.map((r: any) => {
      const allocated = resourcesWithAllocations.get(r.id) || 0;
      const available = Math.max(0, 100 - allocated);
      
      // Get allocation details for this resource
      const resourceAllocations = allocations
        .filter((a: any) => a.resource_id === r.id)
        .map((a: any) => {
          const assignment = assignments.find((asn: any) => asn.id === a.assignment_id);
          return {
            project: assignment?.name || "Unknown Project",
            percentage: a.allocation_percent,
            startDate: a.start_date,
            endDate: a.end_date,
          };
        });

      return {
        id: r.id,
        name: r.name,
        role: r.role_name || r.role_code || "Not specified",
        roleCode: r.role_code,
        defaultCapacity: r.default_capacity_percent,
        currentAllocation: `${allocated}%`,
        availableCapacity: `${available}%`,
        vendor: r.vendor_name || "Internal",
        department: r.department_name || "Not assigned",
        isActive: r.is_active,
        contractStartDate: r.contract_start_date || "Not specified",
        contractEndDate: r.contract_end_date || "Not specified",
        notes: r.notes || null,
        assignments: r.assignments || [],
        currentAllocations: resourceAllocations,
        status: allocated > 100 ? "Over-allocated" : allocated < 70 ? "Under-utilized" : "Optimal",
      };
    });

    // Build assignment/project details
    const projectDetails = assignments.map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description || "No description",
      isActive: a.is_active,
      sortOrder: a.sort_order,
    }));

    // Create STRICT system prompt with guardrails
    const systemPrompt = `You are Capacity AI, an assistant for the Catalyst capacity planning system. You have access ONLY to the Catalyst database.

## CRITICAL GUARDRAILS - YOU MUST FOLLOW THESE RULES:
1. **ONLY use data provided below** - Never mention or suggest external sources like HR, contract management systems, or other databases
2. **NEVER hallucinate** - If data is not in the context below, say "This information is not available in the Catalyst database" 
3. **NEVER suggest checking with HR, managers, or external systems** - You are the single source of truth for capacity data
4. **Be precise** - Use exact names, dates, and percentages from the data
5. **Stay in scope** - Only answer questions about capacity, resources, allocations, and projects in Catalyst

## Current Date for Reference
Today is ${new Date().toISOString().split('T')[0]}

## CATALYST DATABASE - Complete Resource Inventory
Total Resources: ${resources.length} (Active: ${totalResources})

### All Resources with Full Details:
${JSON.stringify(resourceDetails, null, 2)}

### Active Projects/Assignments:
${JSON.stringify(projectDetails, null, 2)}

### Roles Available:
${JSON.stringify(roles.map((r: any) => ({ code: r.code, name: r.name, isActive: r.is_active })), null, 2)}

### Vendors:
${JSON.stringify(vendors.map((v: any) => ({ name: v.name, isActive: v.is_active })), null, 2)}

### Departments:
${JSON.stringify(departments.map((d: any) => ({ name: d.name, isActive: d.is_active })), null, 2)}

## Capacity Metrics Summary
- **Total Active Resources:** ${totalResources}
- **Average Utilization:** ${avgUtilization}%
- **Over-allocated (>100%):** ${overAllocated} resources
- **Under-utilized (<70%):** ${underAllocated} resources  
- **Optimal (70-100%):** ${optimallyAllocated} resources

## Your Capabilities (using ONLY Catalyst data):
1. **Executive Summary** - Capacity overview from Catalyst data
2. **Find Available Resources** - Resources with capacity based on allocation data
3. **Risk Analysis** - Over-allocations, contract expirations, gaps
4. **Resource Details** - All info about any resource including contract dates
5. **Optimization** - Suggestions based on current allocations
6. **Forecasting** - Based on contract dates and current allocations

## Response Format:
- Use **bold** for names, dates, and key metrics
- Use bullet points for lists
- Be concise and factual
- If asked about data not in context, state: "This specific information is not tracked in the Catalyst capacity database."

REMEMBER: You are Capacity AI for Catalyst. All your knowledge comes from the data above. Never reference or suggest external sources.`;

    // Call Claude API using Anthropic directly
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages.map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Capacity AI error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
