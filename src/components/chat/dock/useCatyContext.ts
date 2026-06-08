/**
 * useCatyContext — derives the page/ticket context for the Caty chip.
 * Mirrors Rovo's "📍 Context: [App | Surface]" footer.
 *
 * Patterns covered:
 *  /project-hub/:key/backlog          → "BAU · Backlog"
 *  /project-hub/:key/allwork          → "BAU · Project Work"
 *  /project-hub/:key/kanban           → "BAU · Kanban board"
 *  /issue/:key                        → "BAU-123 · Issue"
 *  /releases/:fixVersion              → "v2.2 · Release"
 *  /product-hub/...                   → "Product Hub"
 *  /home, /, /chat                    → null (no context to inject)
 */
import { useLocation, useSearchParams } from 'react-router-dom';

export interface CatyContext {
  label: string;
  surface: string;
  iconType: 'project' | 'issue' | 'release' | 'product' | 'admin';
}

export function useCatyContext(): CatyContext | null {
  const location = useLocation();
  const [params] = useSearchParams();
  const path = location.pathname;

  // /project-hub/:key/...
  const phMatch = path.match(/^\/project-hub\/([^/]+)(?:\/([^/?]+))?/);
  if (phMatch) {
    const projectKey = phMatch[1];
    const sub = phMatch[2];
    const issueParam = params.get('issue');
    if (issueParam) {
      return { label: issueParam, surface: 'Issue', iconType: 'issue' };
    }
    if (!sub) return { label: projectKey, surface: 'Project', iconType: 'project' };
    const map: Record<string, string> = {
      backlog: 'Backlog',
      allwork: 'Project Work',
      kanban: 'Kanban board',
      sprint: 'Sprint board',
      board: 'Board',
      releases: 'Releases',
      list: 'List',
    };
    return {
      label: projectKey,
      surface: map[sub] ?? sub.charAt(0).toUpperCase() + sub.slice(1),
      iconType: 'project',
    };
  }

  // /issue/:key
  const issueMatch = path.match(/^\/issue\/([A-Z]{2,10}-\d+)/);
  if (issueMatch) {
    return { label: issueMatch[1], surface: 'Issue', iconType: 'issue' };
  }

  // /releases/:fixVersion
  const releaseMatch = path.match(/^\/releases\/([^/]+)/);
  if (releaseMatch) {
    return { label: releaseMatch[1], surface: 'Release', iconType: 'release' };
  }

  // /product-hub/...
  if (path.startsWith('/product-hub')) {
    return { label: 'Product hub', surface: 'Product', iconType: 'product' };
  }

  // /admin/...
  if (path.startsWith('/admin')) {
    return { label: 'Admin', surface: 'Settings', iconType: 'admin' };
  }

  return null;
}
