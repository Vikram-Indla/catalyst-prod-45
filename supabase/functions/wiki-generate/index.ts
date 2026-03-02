import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORY_DOMAIN_MAP: Record<string, string> = {
  "INDUSTRIAL LICENSING": "D1",
  "CUSTOMS & TRADE": "D2",
  "CHEMICAL PERMITS": "D3",
  "ENVIRONMENTAL COMPLIANCE": "D4",
  "INDUSTRIAL INCENTIVES": "D5",
  "FINANCIAL SOLUTIONS & SIDF": "D5",
  "FOURTH INDUSTRIAL REVOLUTION": "D6",
  "WORKFORCE & INDUSTRIAL SUPPORT": "D7",
  "SENAEI PLATFORM": "D8",
  "MINING & MINERAL RESOURCES": "D9",
  "CATALYST PLATFORM": "D8",
  "NAVIGATION & HOW-TO": "D8",
  "KNOWLEDGE BASE SYSTEM": "D8",
  "PROJECT MANAGEMENT": "D8",
  "RELEASE MANAGEMENT": "D8",
  "SPRINTS & VELOCITY": "D8",
  "DEFECTS & QA": "D8",
  "JIRA INTEGRATION": "D8",
  "BUDGET & CAPACITY": "D8",
  "PEOPLE & ROLES": "D8",
  "TIMELINES & PLANNING": "D8",
  "WORK ITEM TYPES": "D8",
  "ATTACHMENTS & DOCUMENTS": "D8",
  "COMMENTS & HISTORY": "D8",
  "LINKED ITEMS": "D8",
  "ANALYTICS & REPORTING": "D8",
  "ADMINISTRATIVE": "D8",
  "PRODUCTION INCIDENTS": "D8",
  "VISION 2030 & MINISTRY CONTEXT": "D1",
  "CONVERSATIONAL & CONTEXTUAL": "D8",
  "CROSS-MODULE QUERIES": "D8",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "generate_all";

    if (action === "generate_all") {
      return await generateAll(sb);
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("wiki-generate error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateAll(sb: any) {
  // 1. Paginate all KB chunks (bypass 1000-row limit)
  let allChunks: any[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data: batch, error: batchErr } = await sb
      .from("kb_embeddings")
      .select("id, content, source_type, chunk_type, section_title")
      .order("created_at")
      .range(from, from + PAGE_SIZE - 1);
    if (batchErr) throw new Error("Failed to fetch chunks: " + batchErr.message);
    if (!batch || batch.length === 0) break;
    allChunks = allChunks.concat(batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // 2. Group by category
  const categoryChunks: Record<string, string[]> = {};
  for (const chunk of allChunks) {
    const match = chunk.content?.match(/^Category:\s*(.+)/m);
    const cat = match ? match[1].trim() : null;
    if (!cat) continue;
    if (!categoryChunks[cat]) categoryChunks[cat] = [];
    categoryChunks[cat].push(chunk.content);
  }

  // 3. Get domains
  const { data: domains } = await sb.from("wiki_domains").select("*").order("sort_order");
  const domainMap: Record<string, any> = {};
  for (const d of domains || []) domainMap[d.domain_code] = d;

  // 4. Create categories
  const createdCategories: Record<string, string> = {};
  let catSortOrder = 1;

  for (const [catName, catChunks] of Object.entries(categoryChunks)) {
    if (catChunks.length < 3) continue;
    const domainCode = CATEGORY_DOMAIN_MAP[catName] || "D8";
    const domain = domainMap[domainCode];
    if (!domain) continue;

    const { data: existingCat } = await sb
      .from("wiki_categories")
      .select("id")
      .eq("domain_id", domain.id)
      .eq("name", formatCategoryName(catName))
      .maybeSingle();

    if (existingCat) {
      createdCategories[catName] = existingCat.id;
      continue;
    }

    const { data: newCat, error: catErr } = await sb
      .from("wiki_categories")
      .insert({
        domain_id: domain.id,
        category_code: domainCode + "." + catSortOrder,
        name: formatCategoryName(catName),
        name_ar: "",
        description: "Knowledge articles about " + catName.toLowerCase(),
        description_ar: "",
        level: 1,
        sort_order: catSortOrder++,
      })
      .select("id")
      .single();

    if (catErr) {
      console.error("Failed to create category " + catName + ": " + catErr.message);
      continue;
    }
    createdCategories[catName] = newCat.id;
  }

  // 5. Create wiki pages from KB content directly
  let pagesCreated = 0;
  let pagesSkipped = 0;

  for (const [catName, catId] of Object.entries(createdCategories)) {
    const domainCode = CATEGORY_DOMAIN_MAP[catName] || "D8";
    const catChunks = categoryChunks[catName] || [];
    if (catChunks.length < 3) continue;

    const slug = generateSlug(catName);
    const { data: existingPage } = await sb
      .from("wiki_pages")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingPage) { pagesSkipped++; continue; }

    // Extract Q&A pairs
    const qaPairs: Array<{ q: string; a: string }> = [];
    for (const content of catChunks.slice(0, 20)) {
      const qMatch = content.match(/Question:\s*(.+)/);
      const aMatch = content.match(/Answer:\s*([\s\S]+?)(?=\n\nCategory:|$)/);
      if (qMatch && aMatch) {
        qaPairs.push({ q: qMatch[1].trim(), a: aMatch[1].trim() });
      }
    }

    const title = formatCategoryName(catName);
    const leadContent = qaPairs.length > 0
      ? qaPairs[0].a.substring(0, 300)
      : "Comprehensive guide to " + catName.toLowerCase() + " services and processes.";

    const overviewContent = qaPairs.slice(0, 3).map(qa => "**" + qa.q + "**\n\n" + qa.a).join("\n\n---\n\n");
    const functionalityContent = qaPairs.slice(3, 8).map(qa => "**" + qa.q + "**\n\n" + qa.a).join("\n\n---\n\n");
    const detailContent = qaPairs.slice(8, 15).map(qa => "**" + qa.q + "**\n\n" + qa.a).join("\n\n---\n\n");

    const { data: page, error: pageErr } = await sb
      .from("wiki_pages")
      .insert({
        slug,
        title,
        domain_code: domainCode,
        category_id: catId,
        status: "published",
        lead_content: leadContent,
        infobox: {
          status: "Active",
          hub: domainCode,
          domainCode: domainCode,
          documentsCount: catChunks.length,
          aiConfidence: 0.85,
          lastSync: new Date().toISOString(),
        },
        ai_confidence: 0.85,
        source_coverage: Math.min(1, catChunks.length / 50),
        version: 1,
        last_generated: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (pageErr) {
      console.error("Failed to create page for " + catName + ": " + pageErr.message);
      continue;
    }

    // Insert sections
    const sections: Array<{ title: string; content: string; type: string }> = [];
    sections.push({ title: "Overview", content: overviewContent || ("This section covers " + catName.toLowerCase() + "."), type: "overview" });
    if (functionalityContent) sections.push({ title: "Key Features & Functionality", content: functionalityContent, type: "functionality" });
    if (detailContent) sections.push({ title: "Details & Procedures", content: detailContent, type: "technical" });

    for (let i = 0; i < sections.length; i++) {
      await sb.from("wiki_sections").insert({
        page_id: page.id,
        section_number: i + 1,
        title: sections[i].title,
        content: sections[i].content,
        section_type: sections[i].type,
        is_live_data: false,
        sort_order: i + 1,
      });
    }

    pagesCreated++;
    console.log("Created page: " + slug + " (" + domainCode + ")");
  }

  // 6. Jira delivery status pages
  const jiraChunks = allChunks
    .filter((c: any) => c.source_type === "jira" || c.source_type === "catalyst")
    .map((c: any) => c.content);

  if (jiraChunks.length > 0) {
    const jiraByTable: Record<string, string[]> = {};
    for (const content of jiraChunks) {
      const match = content.match(/\[(\w+)\]/);
      const table = match ? match[1] : "other";
      if (!jiraByTable[table]) jiraByTable[table] = [];
      jiraByTable[table].push(content);
    }

    for (const [table, items] of Object.entries(jiraByTable)) {
      const slug = "delivery-status-" + table.toLowerCase().replace(/_/g, "-");
      const { data: existing } = await sb.from("wiki_pages").select("id").eq("slug", slug).maybeSingle();
      if (existing) { pagesSkipped++; continue; }

      const { data: page } = await sb
        .from("wiki_pages")
        .insert({
          slug,
          title: "Delivery Status - " + formatCategoryName(table.replace(/_/g, " ")),
          domain_code: "D8",
          status: "published",
          lead_content: "Live delivery tracking for " + items.length + " items from " + table + ".",
          infobox: { status: "Active", hub: "D8", domainCode: "D8", totalStories: items.length },
          ai_confidence: 0.9,
          source_coverage: 1,
          version: 1,
          last_generated: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (page) {
        await sb.from("wiki_sections").insert({
          page_id: page.id,
          section_number: 1,
          title: "Delivery Overview",
          content: "This section tracks " + items.length + " work items from the " + table + " source.\n\n" + items.slice(0, 15).join("\n"),
          section_type: "delivery_status",
          is_live_data: true,
          sort_order: 1,
        });
        pagesCreated++;
      }
    }
  }

  const result = {
    status: "complete",
    categories_created: Object.keys(createdCategories).length,
    pages_created: pagesCreated,
    pages_skipped: pagesSkipped,
    total_chunks_processed: allChunks.length,
  };

  console.log("wiki-generate result:", JSON.stringify(result));

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatCategoryName(name: string): string {
  return name
    .split(/[\s&]+/)
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .replace(/ And /g, " & ")
    .replace(/ Of /g, " of ")
    .replace(/ The /g, " the ")
    .replace(/ For /g, " for ")
    .replace(/ In /g, " in ");
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
