import { useNavigate } from 'react-router-dom';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';

// Ask Catalyst — mirrors Jira's "Ask Rovo" pill. Active CTA; navigates to the
// WikiHub RAG assistant. Icon is a branded sparkle in accent blue so it reads
// as a live AI entry point (Jira parity — the Rovo mark is never greyed out).
function AskCatalystIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 1.5l1.2 3.3 3.3 1.2-3.3 1.2L8 10.5 6.8 7.2 3.5 6l3.3-1.2L8 1.5zM12 9l.7 1.8 1.8.7-1.8.7L12 14l-.7-1.8-1.8-.7 1.8-.7L12 9z"
        fill={token('color.icon.accent.blue', '#2563EB')}
      />
    </svg>
  );
}

export function AskCatalystPill() {
  const navigate = useNavigate();
  return (
    <Button
      appearance="subtle"
      iconBefore={AskCatalystIcon}
      onClick={() => navigate('/wiki')}
    >
      Ask Catalyst
    </Button>
  );
}
