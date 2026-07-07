/**
 * _shared/docintel.ts — shared Deno helpers for the docintel-* edge functions.
 *
 * Keeps CORS, client construction, auth/membership guards and latency stamping
 * in one place so docintel-ingest / docintel-extract (and later stage workers)
 * share identical boilerplate. No secrets hardcoded — env-only keys.
 */
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

/** JSON response with CORS headers. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Service-role client — full DB + storage access. Used for all writes. */
export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, serviceKey);
}

/**
 * Guard: the request must be a service-role caller. Stage workers
 * (docintel-analyze's inline embed etc.) are only ever invoked by the pipeline
 * fan-out — never by a browser. Accepts EITHER:
 *   (a) an exact match of the injected SUPABASE_SERVICE_ROLE_KEY env (internal
 *       fan-out passes this — robust regardless of legacy-JWT vs new-secret), OR
 *   (b) a bearer JWT whose `role` claim is 'service_role'. The API gateway has
 *       already cryptographically verified the signature before the request
 *       reaches this function, so decoding the payload to read the role is safe.
 * (b) makes the guard testable and resilient to which key format the platform
 * injects, while still rejecting anon/authenticated JWTs.
 */
export function requireServiceRole(req: Request): boolean {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (token.length === 0) return false;

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && token === serviceKey) return true;

  // Decode the JWT payload (signature already verified by the gateway) and
  // require the service_role claim.
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const pad = "=".repeat((4 - (parts[1].length % 4)) % 4);
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/") + pad));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

/**
 * Verify the caller's JWT and confirm they are a member of `projectId` via
 * ph_project_members. Returns the caller's user id on success, or null when
 * unauthenticated / not a member (caller maps null → 401/403).
 */
export async function requireMember(
  req: Request,
  projectId: string,
  admin: SupabaseClient,
): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await anon.auth.getUser(token);
  if (error || !user) return null;

  const { data: member } = await admin
    .from("ph_project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  return member ? user.id : null;
}

/**
 * Merge `{ [key]: ms }` into ai_documents.latency_ms (jsonb) atomically via the
 * docintel_stamp_latency RPC. A DB-side `latency_ms || jsonb` merge is used
 * (not JS read-modify-write) so concurrent page workers can't lose each other's
 * stamps. Best-effort (never throws — latency is observability).
 */
export async function stampLatency(
  admin: SupabaseClient,
  documentId: string,
  key: string,
  ms: number,
): Promise<void> {
  try {
    await admin.rpc("docintel_stamp_latency", {
      p_document_id: documentId,
      p_key: key,
      p_ms: ms,
    });
  } catch (_e) {
    // best-effort — latency is observability, never block the pipeline on it
  }
}

/**
 * Compare-and-set ai_documents.status via the docintel_advance_status RPC.
 * Returns true only for the single caller that performed the transition — the
 * winner is the one allowed to fan out the next stage. Prevents double-firing
 * when the last page of a document completes across parallel workers.
 */
export async function advanceStatus(
  admin: SupabaseClient,
  documentId: string,
  fromStatus: string,
  toStatus: string,
  detail: string | null = null,
): Promise<boolean> {
  const { data, error } = await admin.rpc("docintel_advance_status", {
    p_document_id: documentId,
    p_from_status: fromStatus,
    p_to_status: toStatus,
    p_detail: detail,
  });
  if (error) return false;
  return data === true;
}

/** Mark a document failed with an error message. Best-effort. */
export async function markDocumentFailed(
  admin: SupabaseClient,
  documentId: string,
  msg: string,
): Promise<void> {
  try {
    await admin
      .from("ai_documents")
      .update({ status: "failed", error_message: msg })
      .eq("id", documentId);
  } catch (_e) {
    // swallow — the caller already surfaces the primary error
  }
}
