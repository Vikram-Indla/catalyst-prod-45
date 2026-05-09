// ============================================================
// CATALYST - User Notification Settings Page
// ============================================================

import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { ArrowLeft } from 'lucide-react';
import Button from '@atlaskit/button/new';
import { useNavigate } from 'react-router-dom';

export default function UserNotificationSettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: 'var(--ds-surface, #FFFFFF)' }}>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header with back button */}
        <div className="mb-6">
          <div className="mb-4 -ml-2">
            <Button
              appearance="subtle"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {/* Notification Settings Component */}
        <NotificationSettings />
      </div>
    </div>
  );
}
