/**
 * WorkHubStatusLozenge — 3-color guardrail StatusLozenge
 * Grey (to_do), Blue (in_progress), Green (done)
 * Height:20px | 11px/700/uppercase | Radius:3px | NO dots
 */

interface WorkHubStatusLozengeProps {
  status: string;
  statusCategory?: string;
}

function getCategoryColors(statusCategory: string | undefined): { bg: string; text: string } {
  if (!statusCategory) return { bg: '#DFE1E6', text: '#42526E' };
  const cat = statusCategory.toLowerCase().replace(/\s+/g, '_');
  if (cat === 'done' || cat === 'complete') return { bg: '#1B7F37', text: '#FFFFFF' };
  if (cat === 'in_progress') return { bg: '#0C66E4', text: '#FFFFFF' };
  return { bg: '#DFE1E6', text: '#42526E' };
}

const DISPLAY_NAMES: Record<string, string> = {
  'In Requirements': 'IN REQ',
  'Ready for QA': 'READY QA',
  'In Development': 'IN DEV',
  'In Production': 'IN PROD',
};

export default function WorkHubStatusLozenge({ status, statusCategory }: WorkHubStatusLozengeProps) {
  const colors = getCategoryColors(statusCategory);
  const label = DISPLAY_NAMES[status] || status.toUpperCase();

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 20,
      padding: '0 6px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      lineHeight: '20px',
      whiteSpace: 'nowrap',
      backgroundColor: colors.bg,
      color: colors.text,
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
}
