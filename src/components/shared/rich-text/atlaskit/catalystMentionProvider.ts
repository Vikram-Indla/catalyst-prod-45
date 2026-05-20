/**
 * CatalystMentionResource — MentionProvider for the description / comment
 * editors. Provides the user list to Atlaskit's mention plugin so `@`
 * triggers a typeahead with filtering, ↑/↓ navigation, and Enter-to-insert.
 */
import {
  AbstractMentionResource,
  type MentionDescription,
  type MentionsResult,
} from '@atlaskit/mention/resource';
import { supabase } from '@/integrations/supabase/client';

export interface MentionableUser {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  jiraAccountId: string | null;
}

const MAX_RESULTS = 8;

export function filterMentionableUsers(
  users: MentionableUser[],
  query: string,
): MentionableUser[] {
  const q = query.trim().toLowerCase();
  if (!q) return users.slice(0, MAX_RESULTS);

  const scored: Array<{ user: MentionableUser; score: number; index: number }> = [];
  users.forEach((user, index) => {
    const name = (user.name || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const emailLocal = email.split('@')[0] ?? '';
    const tokens = name.split(/\s+/).filter(Boolean);

    let score = -1;
    if (name.startsWith(q)) score = 0;
    else if (tokens.some((t) => t.startsWith(q))) score = 1;
    else if (emailLocal.startsWith(q)) score = 2;
    else if (name.includes(q)) score = 3;
    else if (email.includes(q)) score = 4;

    if (score >= 0) scored.push({ user, score, index });
  });

  scored.sort((a, b) => a.score - b.score || a.index - b.index);
  return scored.slice(0, MAX_RESULTS).map((s) => s.user);
}

export function sanitizeUserList(users: MentionableUser[]): MentionableUser[] {
  const seen = new Set<string>();
  const out: MentionableUser[] = [];
  for (const u of users) {
    if (!u.id) continue;
    if (seen.has(u.id)) continue;
    seen.add(u.id);
    out.push(u);
  }
  return out;
}

function toMentionDescription(user: MentionableUser): MentionDescription {
  const description: MentionDescription = {
    id: user.id,
    name: user.name,
  };
  if (user.avatarUrl) description.avatarUrl = user.avatarUrl;
  return description;
}

/* Single-result Enter fix.
 * Atlaskit 13.0.x has a bug where pressing Enter on a typeahead with one
 * item silently fails (skipForwardToSafeItem returns -1 for listSize 1).
 * Click on the same item works. We intercept the Enter and dispatch a
 * synthetic click on `[data-mention-item]`, which is the element
 * Atlaskit's MentionItem component attaches its onClick to. */
let enterFixInstalled = false;
function installSingleItemEnterFix(): void {
  if (enterFixInstalled || typeof document === 'undefined') return;
  enterFixInstalled = true;
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey) return;
      const popup = document.querySelector('.fabric-editor-typeahead');
      if (!popup) return;
      const items = popup.querySelectorAll<HTMLElement>('.ak-typeahead-item');
      if (items.length !== 1) return;
      const target =
        items[0].querySelector<HTMLElement>('[data-mention-item]') ?? items[0];
      e.preventDefault();
      e.stopImmediatePropagation();
      target.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, view: window }),
      );
    },
    true,
  );
}

export class CatalystMentionResource extends AbstractMentionResource {
  private cache: MentionableUser[] | null = null;
  private fetchPromise: Promise<MentionableUser[]> | null = null;
  private readonly fetcher: () => Promise<MentionableUser[]>;

  constructor(fetcher?: () => Promise<MentionableUser[]>) {
    super();
    this.fetcher = fetcher ?? defaultProfileFetcher;
    installSingleItemEnterFix();
  }

  private async ensureCache(): Promise<MentionableUser[]> {
    if (this.cache) return this.cache;
    if (!this.fetchPromise) {
      this.fetchPromise = this.fetcher().then((rows) => {
        const cleaned = sanitizeUserList(rows);
        this.cache = cleaned;
        return cleaned;
      });
    }
    return this.fetchPromise;
  }

  override filter(query?: string): void {
    void this.runFilter(query ?? '');
  }

  private async runFilter(query: string): Promise<void> {
    try {
      const users = await this.ensureCache();
      const matched = filterMentionableUsers(users, query);
      const result: MentionsResult = {
        mentions: matched.map(toMentionDescription),
        query,
      };
      this._notifyListeners(result);
    } catch (err) {
      this._notifyErrorListeners(err as Error, query);
    }
  }

  override recordMentionSelection(_mention: MentionDescription): void {}
  override shouldHighlightMention(_mention: MentionDescription): boolean {
    return false;
  }
}

async function defaultProfileFetcher(): Promise<MentionableUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, jira_account_id, approval_status')
    .eq('approval_status', 'APPROVED')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[CatalystMentionResource] profiles fetch failed:', error.message);
    return [];
  }

  return (data ?? [])
    .filter((row): row is typeof row & { id: string } => Boolean(row.id))
    .map((row) => ({
      id: row.id,
      name: row.full_name || row.email || 'Unknown',
      email: row.email,
      avatarUrl: row.avatar_url,
      jiraAccountId: row.jira_account_id,
    }));
}

export function createCatalystMentionProvider(): CatalystMentionResource {
  return new CatalystMentionResource();
}
