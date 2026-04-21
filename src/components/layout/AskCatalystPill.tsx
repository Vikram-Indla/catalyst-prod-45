import { useState, useCallback, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@atlaskit/button/new';
import Button from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import Drawer from '@atlaskit/drawer';
import Textfield from '@atlaskit/textfield';
import { Box, Stack, Text, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';

// Ask Catalyst — mirrors Jira's "Ask Rovo" pill styling exactly.
// White surface, subtle border, tokenized multi-stop sparkle, medium label.
//
// Previously the pill was navigate('/wiki') — a full-page transition that
// broke the "inline assistant" mental model (Vikram, Apr 2026 critique).
// Now opens an Atlaskit Drawer inline. Submitting the query still routes
// to /wiki?q=… so the full wiki search remains the single source of truth.
function AskCatalystIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 1.5l1.2 3.3 3.3 1.2-3.3 1.2L8 10.5 6.8 7.2 3.5 6l3.3-1.2L8 1.5zM12 9l.7 1.8 1.8.7-1.8.7L12 14l-.7-1.8-1.8-.7 1.8-.7L12 9z"
        fill={token('color.icon.brand', '#2563EB')}
      />
    </svg>
  );
}

// Full-width pill — pill radius is 9999px (no token; Atlaskit doesn't expose
// a pill semantic radius). Everything else resolves through tokens.
const pillStyles = xcss({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'space.075',
  height: '32px',
  paddingInline: 'space.150',
  backgroundColor: 'elevation.surface',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  borderRadius: '9999px',
  color: 'color.text',
  font: 'font.body',
  cursor: 'pointer',
  ':hover': {
    backgroundColor: 'color.background.neutral.subtle.hovered',
  },
});

const drawerBodyStyles = xcss({
  paddingBlock: 'space.200',
  paddingInline: 'space.300',
});

interface AskCatalystPillProps {
  iconOnly?: boolean;
}

export function AskCatalystPill({ iconOnly = false }: AskCatalystPillProps) {
  const navigate = useNavigate();
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const submit = useCallback(() => {
    const q = query.trim();
    if (!q) {
      navigate('/wiki');
    } else {
      navigate(`/wiki?q=${encodeURIComponent(q)}`);
    }
    setOpen(false);
    setQuery('');
  }, [navigate, query]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  return (
    <>
      {iconOnly ? (
        <Tooltip content="Ask Catalyst" position="bottom">
          <IconButton
            label="Ask Catalyst"
            appearance="subtle"
            icon={AskCatalystIcon}
            onClick={open}
          />
        </Tooltip>
      ) : (
        <button onClick={open} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', font: 'inherit', color: 'inherit' }}>
          <AskCatalystIcon />
          <span>Ask Catalyst</span>
        </button>
      )}
      <Drawer onClose={close} isOpen={isOpen} width="medium" label="Ask Catalyst">
        <Box xcss={drawerBodyStyles}>
          <Stack space="space.200">
            <Text as="strong" size="large" weight="bold">Ask Catalyst</Text>
            <Text size="medium" color="color.text.subtle">
              Ask a question about projects, releases, incidents, or policies. Enter opens the full wiki.
            </Text>
            <Textfield
              autoFocus
              isCompact
              placeholder="What can I help you find?"
              value={query}
              onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
              onKeyDown={onKeyDown}
              elemBeforeInput={<AskCatalystIcon />}
            />
            <Box>
              <Button appearance="primary" onClick={submit}>Search Catalyst</Button>
            </Box>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}

