/**
 * CalloutBlock — Notion-style callout for the Catalyst Wiki
 * (CAT-DOCS-NOTION-20260704-001). Four kinds (info/warning/success/danger),
 * ADS-token backgrounds only; clicking the icon cycles the kind. Editable
 * inline content via the spec's contentRef.
 */
import { createReactBlockSpec } from '@blocknote/react';
import { Info, AlertTriangle, CheckCircle2, AlertCircle } from '@/lib/atlaskit-icons';

type CalloutKind = 'info' | 'warning' | 'success' | 'danger';

const KINDS: CalloutKind[] = ['info', 'warning', 'success', 'danger'];

const KIND_STYLE: Record<CalloutKind, { bg: string; icon: typeof Info }> = {
  info: { bg: 'var(--ds-background-information)', icon: Info },
  warning: { bg: 'var(--ds-background-warning)', icon: AlertTriangle },
  success: { bg: 'var(--ds-background-success)', icon: CheckCircle2 },
  danger: { bg: 'var(--ds-background-danger)', icon: AlertCircle },
};

export const callout = createReactBlockSpec(
  {
    type: 'callout',
    propSchema: {
      kind: { default: 'info', values: KINDS },
    },
    content: 'inline',
  },
  {
    render: (props) => {
      const kind = (props.block.props.kind as CalloutKind) ?? 'info';
      const { bg, icon: Icon } = KIND_STYLE[kind];
      const cycle = () => {
        const next = KINDS[(KINDS.indexOf(kind) + 1) % KINDS.length];
        props.editor.updateBlock(props.block, { props: { kind: next } });
      };
      return (
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            background: bg,
            borderRadius: 8,
            padding: '12px 14px',
            width: '100%',
          }}
        >
          <button
            type="button"
            aria-label={`Callout: ${kind} (click to change)`}
            contentEditable={false}
            onClick={cycle}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              marginTop: 1,
              cursor: 'pointer',
              display: 'flex',
              flexShrink: 0,
              color: 'var(--ds-text)',
            }}
          >
            <Icon style={{ width: 18, height: 18 }} />
          </button>
          <div
            ref={props.contentRef}
            style={{ flex: 1, minWidth: 0, color: 'var(--ds-text)' }}
          />
        </div>
      );
    },
  },
);
