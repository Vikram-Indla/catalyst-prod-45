/**
 * Format timestamp in absolute format: "Jan 9, 2026, 3:45 PM"
 */
export function formatTimestamp(date: string | Date | null | undefined): string {
  if (!date) return '—';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}
