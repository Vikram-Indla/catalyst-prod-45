/**
 * useActiveDocintelProject — module-wide active-project resolution.
 *
 * The Documents / Health / Upload pages each carry a project selector; before
 * this hook each resolved `?project=` independently and fell back to the
 * FIRST project on bare navigation (sidebar links carry no param), so the
 * selection appeared to reset between pages. Resolution order is now:
 *
 *   1. `?project=<key>` in the URL (deep links win)
 *   2. last selection remembered for this browser (localStorage)
 *   3. first member project
 */
import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type { DocintelProjectOption } from "./useDocintel";

const STORAGE_KEY = "docintel.lastProjectKey";

function readStoredKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* storage unavailable — selection just won't persist */
  }
}

export function useActiveDocintelProject(projects: DocintelProjectOption[]) {
  const [params, setParams] = useSearchParams();

  const urlKey = params.get("project");
  const storedKey = readStoredKey();
  const activeKey = urlKey ?? storedKey ?? projects[0]?.key;
  const activeProject =
    projects.find((p) => p.key === activeKey) ?? projects[0] ?? null;

  // Remember whatever actually resolved so the next bare navigation keeps it.
  useEffect(() => {
    if (activeProject?.key) storeKey(activeProject.key);
  }, [activeProject?.key]);

  const setActiveProjectKey = useCallback(
    (key: string) => {
      storeKey(key);
      const next = new URLSearchParams(params);
      next.set("project", key);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  return { activeProject, setActiveProjectKey };
}
