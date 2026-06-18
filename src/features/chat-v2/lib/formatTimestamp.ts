const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

/** Slack-style sidebar row timestamp: "Yesterday", "Monday", "June 8th". */
export function formatRowTimestamp(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const today = startOfDay(now);
  const target = startOfDay(date);
  const diffDays = Math.round((today.getTime() - target.getTime()) / DAY_MS);

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return DAYS[date.getDay()];
  if (date.getFullYear() === now.getFullYear()) {
    return `${MONTHS_LONG[date.getMonth()]} ${ordinal(date.getDate())}`;
  }
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Slack-style date separator: "Sunday, May 10th". */
export function formatDateSeparator(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${DAYS[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${ordinal(d.getDate())}`;
}

/** Slack-style message header time: "10:32 PM". */
export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Compact intra-group time without AM/PM suffix: "10:32". */
export function formatMessageTimeShort(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: false });
}

/** Activity-style relative: "9 mins", "2 hrs", "9:44 PM", "Yesterday", "Monday", "June 8th". */
export function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = Date.now();
  const diffMs = now - d.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'}`;
  const hrs = Math.round(mins / 60);
  if (hrs < 12) return `${hrs} hr${hrs === 1 ? '' : 's'}`;
  // Older than 12 hours falls back to the standard row formatter.
  return formatRowTimestamp(iso);
}

/** YYYY-MM-DD key for grouping messages by day. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
