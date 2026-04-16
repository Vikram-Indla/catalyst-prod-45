import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { integrationToken, databaseUrl } = await req.json();

    if (!integrationToken || !databaseUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing integrationToken or databaseUrl' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // Extract database ID from URL
    const urlMatch = databaseUrl.match(/([a-f0-9]{32}|[a-f0-9-]{36})\??/);
    if (!urlMatch) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid Notion database URL — cannot extract database ID' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }
    const databaseId = urlMatch[1].replace(/-/g, '');
    const formattedId = `${databaseId.slice(0,8)}-${databaseId.slice(8,12)}-${databaseId.slice(12,16)}-${databaseId.slice(16,20)}-${databaseId.slice(20)}`;

    const headers = {
      'Authorization': `Bearer ${integrationToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    };

    // 1. Fetch database metadata
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${formattedId}`, { headers });
    if (!dbRes.ok) {
      const err = await dbRes.json();
      return new Response(
        JSON.stringify({ success: false, error: err.message || 'Cannot access Notion database' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }
    const dbMeta = await dbRes.json();
    const databaseTitle = dbMeta.title?.[0]?.plain_text || 'Untitled';

    // 2. Extract property list
    const properties: Array<{ id: string; name: string; type: string }> =
      Object.entries(dbMeta.properties).map(([name, prop]: [string, any]) => ({
        id: prop.id,
        name,
        type: prop.type,
      }));

    // 3. Query all rows (paginated, max 500 for MVP)
    const rows: any[] = [];
    let cursor: string | undefined;
    do {
      const body: any = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;
      const pageRes = await fetch(
        `https://api.notion.com/v1/databases/${formattedId}/query`,
        { method: 'POST', headers, body: JSON.stringify(body) }
      );
      if (!pageRes.ok) break;
      const pageData = await pageRes.json();
      rows.push(...pageData.results);
      cursor = pageData.has_more ? pageData.next_cursor : undefined;
    } while (cursor && rows.length < 500);

    // 4. Flatten properties to string values
    const flattenProp = (prop: any): string | null => {
      switch (prop?.type) {
        case 'title':        return prop.title?.[0]?.plain_text || null;
        case 'rich_text':    return prop.rich_text?.[0]?.plain_text || null;
        case 'select':       return prop.select?.name || null;
        case 'multi_select': return prop.multi_select?.map((s: any) => s.name).join(', ') || null;
        case 'status':       return prop.status?.name || null;
        case 'date':         return prop.date?.start || null;
        case 'number':       return prop.number?.toString() || null;
        case 'checkbox':     return prop.checkbox ? 'true' : 'false';
        case 'people':       return prop.people?.[0]?.name || null;
        case 'url':          return prop.url || null;
        case 'email':        return prop.email || null;
        case 'phone_number': return prop.phone_number || null;
        default:             return null;
      }
    };

    const mappedRows = rows.map((page: any) => ({
      notionPageId: page.id,
      notionPageUrl: page.url,
      properties: Object.fromEntries(
        Object.entries(page.properties).map(([key, val]) => [key, flattenProp(val)])
      ),
    }));

    return new Response(
      JSON.stringify({ success: true, rows: mappedRows, properties, databaseTitle }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
