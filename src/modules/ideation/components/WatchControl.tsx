/**
 * WatchControl — Ideation Phase 3 S4.
 *
 * "Watching (N) 👁 [watch]" from 04 §C.4 rail mock. Atlaskit Button + eye
 * icon, ADS tokens — same D9 non-canonical posture as VoteControl (no
 * canonical watch/follow control exists for idn_watchers' shape).
 */
import Button from '@atlaskit/button/new';
import EyeOpenIcon from '@atlaskit/icon/core/eye-open';
import EyeOpenStrikethroughIcon from '@atlaskit/icon/core/eye-open-strikethrough';
import { useIdeationWatchers, useToggleIdeationWatch } from '@/hooks/useIdeationWatchers';

export function WatchControl({ ideaId }: { ideaId: string }) {
  const { data: watch, isLoading } = useIdeationWatchers(ideaId);
  const toggle = useToggleIdeationWatch(ideaId);

  if (isLoading || !watch) return null;

  return (
    <Button
      onClick={() => toggle.mutate(!watch.amWatching)}
      isDisabled={toggle.isPending}
      iconBefore={watch.amWatching ? EyeOpenStrikethroughIcon : EyeOpenIcon}
      testId="ideation-watch-toggle"
    >
      {watch.count} watching · {watch.amWatching ? 'Unwatch' : 'Watch'}
    </Button>
  );
}

export default WatchControl;
