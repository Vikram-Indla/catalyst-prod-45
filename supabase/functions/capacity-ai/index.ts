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

    // Fetch capacity data for context
    const [resourcesResult, allocationsResult, assignmentsResult] = await Promise.all([
      supabase.from("resource_inventory").select("*").eq("is_active", true),
      supabase.from("resource_allocations").select("*"),
      supabase.from("resource_assignments").select("*").eq("is_active", true),
    ]);

    const resources = resourcesResult.data || [];
    const allocations = allocationsResult.data || [];
    const assignments = assignmentsResult.data || [];

    // Calculate capacity metrics
    const totalResources = resources.length;
    const resourcesWithAllocations = new Map<string, number>();
    
    allocations.forEach((alloc: any) => {
      const current = resourcesWithAllocations.get(alloc.resource_id) || 0;
      resourcesWithAllocations.set(alloc.resource_id, current + (alloc.allocation_percent || 0));
    });

    let overAllocated = 0;
    let underAllocated = 0;
    let optimallyAllocated = 0;
    let totalUtilization = 0;
    
    resources.forEach((resource: any) => {
      const allocated = resourcesWithAllocations.get(resource.id) || 0;
      totalUtilization += allocated;
      
      if (allocated > 100) overAllocated++;
      else if (allocated < 70) underAllocated++;
      else optimallyAllocated++;
    });

    const avgUtilization = totalResources > 0 ? Math.round(totalUtilization / totalResources) : 0;

    // Build resource details for AI context
    const resourceDetails = resources.map((r: any) => {
      const allocated = resourcesWithAllocations.get(r.id) || 0;
      const available = Math.max(0, 100 - allocated);
      return {
        name: r.name,
        role: r.role_name || r.role_code || "Unknown",
        allocated: `${allocated}%`,
        available: `${available}%`,
        vendor: r.vendor_name || "Internal",
        department: r.department_name || "Unassigned",
        status: allocated > 100 ? "Over-allocated" : allocated < 70 ? "Under-utilized" : "Optimal",
      };
    });

    // Build assignment/project details
    const projectDetails = assignments.map((a: any) => ({
      name: a.name,
      description: a.description || "No description",
      isActive: a.is_active,
    }));

    // Create comprehensive system prompt with real data
    const systemPrompt = `You are an AI assistant specialized in capacity planning and resource management. You have access to real-time capacity data from the organization.

## Current Capacity Overview (Real Data)
- **Total Active Resources:** ${totalResources}
- **Average Utilization:** ${avgUtilization}%
- **Over-allocated Resources (>100%):** ${overAllocated} (${totalResources > 0 ? Math.round((overAllocated / totalResources) * 100) : 0}%)
- **Under-utilized Resources (<70%):** ${underAllocated} (${totalResources > 0 ? Math.round((underAllocated / totalResources) * 100) : 0}%)
- **Optimally Allocated (70-100%):** ${optimallyAllocated} (${totalResources > 0 ? Math.round((optimallyAllocated / totalResources) * 100) : 0}%)

## Resource Details
${JSON.stringify(resourceDetails, null, 2)}

## Active Projects/Assignments
${JSON.stringify(projectDetails, null, 2)}

## Your Capabilities
1. **Executive Summary** - Provide high-level capacity insights
2. **Find Available Resources** - Identify team members with bandwidth (available capacity)
3. **Risk Analysis** - Identify capacity risks (over-allocation, single points of failure, gaps)
4. **Optimization Recommendations** - Suggest ways to improve resource utilization
5. **Forecasting** - Project future capacity needs based on current trends
6. **Find by Skill/Role** - Search for specific types of resources (Backend, Frontend, QA, etc.)

## Response Guidelines
- Use **bold** for important metrics and names
- Use bullet points and structured formatting
- Be concise but informative
- Reference actual resource names and percentages from the data
- When suggesting actions, be specific about which resources to consider
- If data is limited, acknowledge it and provide general guidance

Always base your answers on the actual data provided above. If asked about something not in the data, acknowledge the limitation.`;

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
