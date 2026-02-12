/**
 * CATY AI EDGE FUNCTION TEMPLATE
 * Reference documentation for production Edge Function deployment
 * Deploy to: supabase/functions/caty-ai/index.ts
 *
 * This function:
 * 1. Receives: { query: string, context: { kpis, releases, resources, themes } }
 * 2. Constructs a Gemini prompt with context injection:
 *    System: "You are Caty, an AI portfolio management assistant for ProjectHub.
 *    Analyze the following real-time data and answer the user's question.
 *    Be concise, data-driven, and actionable. Reference specific numbers."
 *    Context: JSON.stringify(context) — injected as system context
 *    User: query
 * 3. Calls: POST https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent
 *    Headers: { 'Content-Type': 'application/json' }
 *    Body: { contents: [{ parts: [{ text: systemPrompt + contextData + userQuery }] }] }
 *    API Key: from Supabase secrets (GEMINI_API_KEY)
 * 4. Returns: { response: string, model: 'gemini-pro', tokens: N }
 *
 * CONTEXT INJECTION (what gets sent to Gemini):
 *   - Dashboard KPIs (10 metrics)
 *   - Release progress (all releases with completion %)
 *   - Resource utilization (all resources with util %)
 *   - Theme progress (all themes with completion %)
 *   - Recent bulk operations
 *   Total context: ~2-4KB JSON per request
 *
 * RATE LIMITING: Max 10 requests/minute per user
 * CACHING: Cache responses for identical queries for 5 minutes
 *
 * TO ACTIVATE:
 *   1. Deploy this as a Supabase Edge Function
 *   2. Set GEMINI_API_KEY in Supabase secrets
 *   3. Replace generateSimulatedResponse() call in useCatyChat
 *      with: const { data } = await supabase.functions.invoke('caty-ai', { body: { query, context } })
 *   4. Update the fetch URL in catyEngine.ts accordingly
 */

export const CATY_EDGE_TEMPLATE = {
  name: 'caty-ai',
  path: 'supabase/functions/caty-ai/index.ts',
  status: 'REFERENCE_ONLY',
  implemented: false,
  description:
    'Production-ready Edge Function for Caty AI. ' +
    'Uses Google Gemini API with context injection for real-time portfolio insights.',
};
