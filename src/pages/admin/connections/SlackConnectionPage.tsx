import { ConnectionComingSoon } from './ConnectionComingSoon';

export default function SlackConnectionPage() {
  return (
    <ConnectionComingSoon
      name="Slack"
      iconEmoji="💬"
      description="Connect Catalyst to Slack to receive real-time notifications for work item updates, release events, incident alerts, and AI digest summaries — directly in your team's channels."
      features={[
        { label: 'Work item notifications', description: 'post updates when issues are created, assigned, or resolved' },
        { label: 'Release alerts', description: 'broadcast deployments and freeze windows to release channels' },
        { label: 'Incident escalations', description: 'page on-call channels automatically when a production incident is raised' },
        { label: 'AI digest delivery', description: 'send daily Caty summaries to team channels on a schedule' },
      ]}
    />
  );
}
