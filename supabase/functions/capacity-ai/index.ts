// ============================================================
// CAPACITY AI EDGE FUNCTION — Lovable AI (Gemini) Integration
// Streaming AI assistant for capacity planning using google/gemini-3-flash-preview
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client to fetch real capacity data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch ALL capacity data for context - include everything
    const [
      resourcesResult, 
      allocationsResult, 
      assignmentsResult, 
      rolesResult, 
      vendorsResult, 
      departmentsResult,
      profilesResult,
      userProductRolesResult,
      productRolesResult,
    ] = await Promise.all([
      supabase.from("resource_inventory").select("*"),
      supabase.from("resource_allocations").select("*"),
      supabase.from("resource_assignments").select("*"),
      supabase.from("resource_roles").select("*"),
      supabase.from("resource_vendors").select("*"),
      supabase.from("capacity_departments").select("*"),
      // User management tables (same as /admin/users)
      supabase.from("profiles").select("id, full_name, email, role, avatar_url, department_id, vendor, contract_start_date, contract_end_date, country, location"),
      supabase.from("user_product_roles").select("id, user_id, role_id, business_lines"),
      supabase.from("product_roles").select("id, name, code"),
    ]);

    const resources = resourcesResult.data || [];
    const allocations = allocationsResult.data || [];
    const assignments = assignmentsResult.data || [];
    const roles = rolesResult.data || [];
    const vendors = vendorsResult.data || [];
    const departments = departmentsResult.data || [];
    const profiles = profilesResult.data || [];
    const userProductRoles = userProductRolesResult.data || [];
    const productRoles = productRolesResult.data || [];

    // Build role lookup maps
    const roleIdToName = new Map(productRoles.map((r: any) => [r.id, { name: r.name, code: r.code }]));
    const userRolesMap = new Map<string, { roleName: string; roleCode: string; businessLines: string[] }[]>();
    userProductRoles.forEach((upr: any) => {
      const roleInfo = roleIdToName.get(upr.role_id);
      if (roleInfo) {
        const existing = userRolesMap.get(upr.user_id) || [];
        existing.push({ roleName: roleInfo.name, roleCode: roleInfo.code, businessLines: upr.business_lines || [] });
        userRolesMap.set(upr.user_id, existing);
      }
    });

    // Build department lookup
    const deptIdToName = new Map(departments.map((d: any) => [d.id, d.name]));

    // Build user profiles with roles (enriched user data for AI context)
    const userDetails = profiles.map((p: any) => {
      const userRoles = userRolesMap.get(p.id) || [];
      const deptName = p.department_id ? deptIdToName.get(p.department_id) : null;
      return {
        id: p.id,
        name: p.full_name || p.email || "Unknown",
        email: p.email,
        department: deptName || "Not assigned",
        vendor: p.vendor || "Internal",
        country: p.country || null,
        location: p.location || null,
        contractStartDate: p.contract_start_date || null,
        contractEndDate: p.contract_end_date || null,
        roles: userRoles.length > 0 ? userRoles.map(r => r.roleName).join(", ") : "No roles assigned",
        roleDetails: userRoles,
        hasNoRoles: userRoles.length === 0,
      };
    });

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

    // Calculate user stats
    const usersWithNoRoles = userDetails.filter((u: any) => u.hasNoRoles).length;
    const usersWithExpiringContracts = userDetails.filter((u: any) => {
      if (!u.contractEndDate) return false;
      const endDate = new Date(u.contractEndDate);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
    }).length;

    // Create system prompt for capacity AI
    const systemPrompt = `You are CATI (Capacity AI), an enterprise assistant for the Catalyst capacity planning and user management system.

## CRITICAL RULES - YOU MUST FOLLOW:
1. **ONLY use data provided below** - Never mention external sources
2. **NEVER hallucinate** - If data is missing, say so clearly
3. **NEVER suggest checking with HR, managers, or external systems**
4. **Be precise** - Use exact names, dates, and percentages from the data
5. **Stay in scope** - Answer about capacity, resources, allocations, AND user management in Catalyst
6. **Format responses with Markdown** - Use **bold** for emphasis, bullet points for lists

## RESPONSE STYLE:
- Be concise and direct
- Lead with the most important information
- Use bullet points for multiple items
- Include specific numbers and percentages
- End with a brief suggestion if relevant

## Current Date: ${new Date().toISOString().split('T')[0]}

## CATALYST DATABASE - Complete Data:

### Capacity Summary:
- Total Active Resources: ${totalResources}
- Average Utilization: ${avgUtilization}%
- Over-allocated (>100%): ${overAllocated}
- Under-utilized (<70%): ${underAllocated}
- Optimal (70-100%): ${optimallyAllocated}

### User Management Summary:
- Total Users: ${userDetails.length}
- Users with No Roles Assigned: ${usersWithNoRoles}
- Users with Contracts Expiring in 90 Days: ${usersWithExpiringContracts}

### All Users with Roles & Details:
${JSON.stringify(userDetails.slice(0, 50), null, 2)}
${userDetails.length > 50 ? `\n... and ${userDetails.length - 50} more users` : ''}

### All Resources with Complete Details:
${JSON.stringify(resourceDetails.slice(0, 50), null, 2)}
${resourceDetails.length > 50 ? `\n... and ${resourceDetails.length - 50} more resources` : ''}

### Active Projects/Assignments:
${JSON.stringify(projectDetails, null, 2)}

### Available Roles: ${JSON.stringify(productRoles.map((r: any) => ({ code: r.code, name: r.name })))}
### Resource Roles: ${JSON.stringify(roles.map((r: any) => ({ code: r.code, name: r.name })))}
### Vendors: ${JSON.stringify(vendors.map((v: any) => ({ name: v.name })))}
### Departments: ${JSON.stringify(departments.map((d: any) => ({ name: d.name })))}

Remember: Be helpful, precise, and use the data above to answer questions about capacity planning, resources, and user management.`;

    // Call Lovable AI Gateway (Gemini)
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
          ...messages.map((m: any) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return streaming response directly
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
