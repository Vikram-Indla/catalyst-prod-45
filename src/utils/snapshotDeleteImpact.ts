import { supabase } from "@/integrations/supabase/client";

export type SnapshotDeleteImpactItem = {
  key:
    | "strategic_themes"
    | "strategic_goals"
    | "goals"
    | "objectives"
    | "snapshot_configurations"
    | "snapshot_strategy_links";
  label: string;
  count: number;
};

export type SnapshotDeleteImpact = {
  items: SnapshotDeleteImpactItem[];
  total: number;
};

async function countBySnapshotId(table: string, snapshotId: string) {
  const { count, error } = await supabase
    .from(table as any)
    // head:true avoids fetching row data; count:'exact' returns row count
    .select("id", { count: "exact", head: true })
    .eq("snapshot_id", snapshotId);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Preflight check used to explain what a snapshot is connected to before deletion.
 * Note: If deletion proceeds, the backend may cascade-delete some of these records.
 */
export async function getSnapshotDeleteImpact(snapshotId: string): Promise<SnapshotDeleteImpact> {
  const [themes, strategicGoals, goals, objectives, configurations, links] = await Promise.all([
    countBySnapshotId("strategic_themes", snapshotId),
    countBySnapshotId("strategic_goals", snapshotId),
    countBySnapshotId("goals", snapshotId),
    countBySnapshotId("objectives", snapshotId),
    countBySnapshotId("snapshot_configurations", snapshotId),
    countBySnapshotId("snapshot_strategy_links", snapshotId),
  ]);

  const allItems: SnapshotDeleteImpactItem[] = [
    { key: "strategic_themes", label: "Themes", count: themes },
    { key: "strategic_goals", label: "Strategic goals", count: strategicGoals },
    { key: "goals", label: "Goals", count: goals },
    { key: "objectives", label: "Objectives", count: objectives },
    { key: "snapshot_configurations", label: "Snapshot settings", count: configurations },
    { key: "snapshot_strategy_links", label: "Strategy links", count: links },
  ];

  const items = allItems.filter((i) => i.count > 0);

  const total = items.reduce((acc, i) => acc + i.count, 0);

  return { items, total };
}

export function isForeignKeyConstraintError(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  return err?.code === "23503" || msg.includes("foreign key") || msg.includes("violates foreign key");
}
