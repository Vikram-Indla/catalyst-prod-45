/**
 * StrategicThemesPage — Shell for the Strategic Themes module.
 * Stage A: route + breadcrumb + empty content area.
 * UI components will be added in Stage C.
 */

import { PageChrome } from '@/components/layout/PageChrome';

export default function StrategicThemesPage() {
  return (
    <PageChrome
      sectionOverride="StrategyHub"
      titleOverride="Strategic Themes"
    >
      {/* Stage C: theme list/board/timeline views render here */}
      <div className="p-6">
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          Strategic Themes content will be built in Stage C.
        </p>
      </div>
    </PageChrome>
  );
}
