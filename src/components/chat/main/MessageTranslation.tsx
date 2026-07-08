/**
 * MessageTranslation — read-side "See translation" for chat bubbles
 * (CAT-VOICE-UX-PREMIUM-20260708-001 S4a, LinkedIn/Teams pattern).
 *
 * Renders a text-labelled link under Arabic-script messages only (conditional
 * visibility — never on empty/Latin/short text). Translation is read-only:
 * the message row is NEVER mutated; the English rendering toggles below the
 * original and fully reverses via "See original".
 *
 * Cache: react-query keyed by message id — one Gemini call per message per
 * tab, ever (Data/Safety AMBER: the useTranslation sha256 cache is skipped
 * for non-issue content, so the message id key is the cost gate here).
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';
import { isTranslatableArabic } from '@/lib/i18n/detectScript';

interface Props {
  messageId: string;
  bodyText: string;
}

export function MessageTranslation({ messageId, bodyText }: Props) {
  const [shown, setShown] = useState(false);

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['msg-translation', messageId, 'en'],
    enabled: shown,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-translate-field', {
        body: { text: bodyText, target: 'en' },
      });
      const translated: string | undefined = (data as { translated?: string } | null)?.translated;
      if (error || !translated) throw new Error(error?.message ?? 'no translation returned');
      return translated;
    },
  });

  if (!isTranslatableArabic(bodyText)) return null;

  return (
    <div data-msg-translation style={{ marginTop: 2 }}>
      {shown && (
        <div
          dir="auto"
          style={{
            font: 'var(--ds-font-body)',
            color: 'var(--ds-text-subtle)',
            borderInlineStart: '2px solid var(--ds-border)',
            paddingInlineStart: 8,
            margin: '4px 0',
            unicodeBidi: 'plaintext',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {isFetching ? (
            <Spinner size="small" />
          ) : isError ? (
            <span style={{ color: 'var(--ds-text-danger)' }}>
              Translation failed.{' '}
              <Button appearance="subtle" spacing="compact" onClick={() => refetch()}>
                Retry
              </Button>
            </span>
          ) : (
            data
          )}
        </div>
      )}
      <Button appearance="subtle" spacing="compact" onClick={() => setShown((s) => !s)}>
        {shown ? 'Hide translation · إخفاء الترجمة' : 'See translation · عرض الترجمة'}
      </Button>
    </div>
  );
}

export default MessageTranslation;
