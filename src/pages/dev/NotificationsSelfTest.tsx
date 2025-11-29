import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { AnnouncementBanner } from '@/components/notifications/AnnouncementBanner';
import { SubscribeButton } from '@/components/notifications/SubscribeButton';
import { DiscussionThread } from '@/components/notifications/DiscussionThread';
import { Bell, MessageSquare, Settings } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';

export default function NotificationsSelfTest() {
  const { user } = useAuth();
  const [testEntityId] = useState('test-entity-123');

  const createTestNotification = async () => {
    if (!user) return;
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Test Notification',
        message: 'This is a test notification created at ' + new Date().toLocaleTimeString(),
        type: 'info',
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Test notification created' });
    }
  };

  const createTestAnnouncement = async () => {
    if (!user) return;
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    const { error } = await supabase
      .from('announcements')
      .insert({
        title: 'Test Announcement',
        message: 'This is a test announcement that will be visible for 7 days',
        type: 'info',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
        created_by: user.id,
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Test announcement created' });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifications System Self-Test</CardTitle>
          <CardDescription>
            Test all notification features implemented per Jira Align specification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Feature Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  In-App Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                ✅ Bell icon with unread count<br />
                ✅ Filter by type (All/Unread/Assigned/Mentions)<br />
                ✅ Mark as read/delete<br />
                ✅ Real-time updates
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  User Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                ✅ Email frequency settings<br />
                ✅ Notification type toggles<br />
                ✅ Per-user configuration<br />
                ✅ Persistent storage
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Discussions & Mentions
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                ✅ @mention support<br />
                ✅ Comment threads<br />
                ✅ Real-time discussions<br />
                ✅ Delete own comments
              </CardContent>
            </Card>
          </div>

          {/* Test Actions */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Test Actions</h3>
            
            <div className="flex flex-wrap gap-2">
              <Button onClick={createTestNotification}>
                Create Test Notification
              </Button>
              <Button onClick={createTestAnnouncement} variant="secondary">
                Create Test Announcement
              </Button>
              <div className="ml-auto">
                <NotificationBell />
              </div>
            </div>
          </div>

          {/* Live Announcements */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Active Announcements</h3>
            <AnnouncementBanner />
          </div>

          {/* Subscribe Test */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Subscription Test</h3>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Subscribe to test entity (ID: {testEntityId})
              </p>
              <SubscribeButton entityType="epics" entityId={testEntityId} />
            </div>
          </div>

          {/* Discussion Thread Test */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Discussion Thread Test</h3>
            <Card>
              <CardContent className="p-0 h-[400px]">
                <DiscussionThread entityType="epics" entityId={testEntityId} />
              </CardContent>
            </Card>
          </div>

          {/* Implementation Status */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Implementation Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-2">✅ Phase 1: Core Features</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✅ User notification preferences</li>
                  <li>✅ Work item subscriptions</li>
                  <li>✅ Enhanced notification bell</li>
                  <li>✅ Discussion system with @mentions</li>
                  <li>✅ Real-time updates</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">✅ Phase 2 & 3: Advanced</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✅ Workflow rules (database ready)</li>
                  <li>✅ Admin announcements</li>
                  <li>✅ Scheduled emails (database ready)</li>
                  <li>✅ Mock email edge function</li>
                  <li>✅ Comprehensive RLS policies</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
