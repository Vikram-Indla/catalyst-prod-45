import { ConnectionComingSoon } from './ConnectionComingSoon';

export default function NotionConnectionPage() {
  return (
    <ConnectionComingSoon
      name="Notion"
      iconEmoji="📓"
      description="Connect Catalyst to Notion to sync work items, requirements, and product specifications bi-directionally. Keep your product docs and engineering tasks in lockstep without context switching."
      features={[
        { label: 'Requirements sync', description: 'push business requests and features from Catalyst into Notion pages' },
        { label: 'Spec linking', description: 'attach Notion documents to Catalyst work items as living references' },
        { label: 'AI enrichment', description: 'generate Notion summaries from Jira content via Caty' },
        { label: 'Changelog export', description: 'write release notes to a Notion changelog database automatically' },
      ]}
    />
  );
}
