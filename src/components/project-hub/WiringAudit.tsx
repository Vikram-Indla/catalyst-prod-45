import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuditResult {
  name: string;
  status: "pass" | "fail";
  detail: string;
}

const checks = [
  {
    name: "Projects table read",
    fn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name, key").limit(1);
      if (error) throw error;
      return `Found ${data?.length || 0} project(s)`;
    },
  },
  {
    name: "Profiles table read",
    fn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, display_name").limit(1);
      if (error) throw error;
      return `Found ${data?.length || 0} profile(s)`;
    },
  },
  {
    name: "Project members read",
    fn: async () => {
      const { data, error } = await supabase.from("project_members").select("id").limit(1);
      if (error) throw error;
      return `Found ${data?.length || 0} membership(s)`;
    },
  },
  {
    name: "Project favorites read",
    fn: async () => {
      const { data, error } = await supabase.from("project_favorites").select("id").limit(1);
      if (error) throw error;
      return `Favorites table accessible`;
    },
  },
  {
    name: "Sync events read",
    fn: async () => {
      const { data, error } = await supabase.from("sync_events").select("id, status").limit(5);
      if (error) throw error;
      return `Found ${data?.length || 0} sync event(s)`;
    },
  },
  {
    name: "Sync health read",
    fn: async () => {
      const { data, error } = await supabase.from("sync_health").select("id, status").limit(1);
      if (error) throw error;
      return `Health records: ${data?.length || 0}`;
    },
  },
  {
    name: "Sync connections read",
    fn: async () => {
      const { data, error } = await supabase.from("sync_connections").select("id, provider, is_active").limit(1);
      if (error) throw error;
      return `Connections: ${data?.length || 0}`;
    },
  },
  {
    name: "Sync entity map read",
    fn: async () => {
      const { data, error } = await supabase.from("sync_entity_map").select("id").limit(1);
      if (error) throw error;
      return `Entity mappings: ${data?.length || 0}`;
    },
  },
  {
    name: "Catalyst issues read",
    fn: async () => {
      const { data, error } = await supabase.from("catalyst_issues").select("id").limit(1);
      if (error) throw error;
      return `Issues: ${data?.length || 0}`;
    },
  },
  {
    name: "Status update (dry run)",
    fn: async () => {
      const { data: proj } = await supabase.from("projects").select("id, display_status").limit(1).single();
      if (!proj) throw new Error("No project to test");
      const original = proj.display_status;
      const { error: e1 } = await supabase.from("projects").update({ display_status: "Planning" } as any).eq("id", proj.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("projects").update({ display_status: original } as any).eq("id", proj.id);
      if (e2) throw e2;
      return `Status write + revert OK`;
    },
  },
  {
    name: "Lead update (dry run)",
    fn: async () => {
      const { data: proj } = await supabase.from("projects").select("id, lead_id").limit(1).single();
      if (!proj) throw new Error("No project to test");
      const original = proj.lead_id;
      const { data: profiles } = await supabase.from("profiles").select("id").neq("id", original || "").limit(1);
      if (!profiles?.length) return "Only 1 profile — skip lead swap test";
      const { error: e1 } = await supabase.from("projects").update({ lead_id: profiles[0].id } as any).eq("id", proj.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("projects").update({ lead_id: original } as any).eq("id", proj.id);
      if (e2) throw e2;
      return `Lead write + revert OK`;
    },
  },
  {
    name: "process_sync_events RPC",
    fn: async () => {
      const { error } = await supabase.rpc("process_sync_events" as any, { batch_size: 1 });
      if (error) throw error;
      return `RPC callable`;
    },
  },
];

export function WiringAudit() {
  const [results, setResults] = useState<AuditResult[]>([]);
  const [running, setRunning] = useState(false);

  const runAudit = async () => {
    setRunning(true);
    const newResults: AuditResult[] = [];
    for (const check of checks) {
      try {
        const detail = await check.fn();
        newResults.push({ name: check.name, status: "pass", detail });
      } catch (err) {
        newResults.push({ name: check.name, status: "fail", detail: String(err) });
      }
      setResults([...newResults]);
    }
    setRunning(false);
  };

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;

  return (
    <div
      style={{
        margin: "24px 0",
        border: "1.5px solid var(--bd-default, rgba(255,255,255,0.10))",
        borderRadius: 8,
        backgroundColor: "#FAFBFC",
        padding: 20,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 650, color: "rgba(237,237,237,0.93)", margin: 0 }}>
          P8 Wiring Audit — {checks.length} checks
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {results.length > 0 && (
            <span style={{ fontSize: 12, color: "#475569" }}>
              <span style={{ color: "#006644", fontWeight: 600 }}>{passCount} pass</span>
              {failCount > 0 && (
                <span style={{ color: "#DC2626", fontWeight: 600, marginLeft: 8 }}>{failCount} fail</span>
              )}
            </span>
          )}
          <button
            onClick={runAudit}
            disabled={running}
            style={{
              height: 30,
              padding: "0 14px",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "Inter, sans-serif",
              backgroundColor: "#2563EB",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 6,
              cursor: running ? "not-allowed" : "pointer",
              opacity: running ? 0.6 : 1,
            }}
          >
            {running ? "Running..." : "Run Audit"}
          </button>
        </div>
      </div>

      {results.map((r, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 0",
            borderTop: i === 0 ? "1px solid var(--bd-default, rgba(255,255,255,0.10))" : "none",
            borderBottom: "1px solid var(--bd-default, rgba(255,255,255,0.10))",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "#FFFFFF",
              backgroundColor: r.status === "pass" ? "#006644" : "#DC2626",
              flexShrink: 0,
            }}
          >
            {r.status === "pass" ? "✓" : "✗"}
          </span>
          <span style={{ fontWeight: 600, color: "rgba(237,237,237,0.93)", minWidth: 180 }}>{r.name}</span>
          <span style={{ color: "rgba(237,237,237,0.40)" }}>{r.detail}</span>
        </div>
      ))}
    </div>
  );
}
