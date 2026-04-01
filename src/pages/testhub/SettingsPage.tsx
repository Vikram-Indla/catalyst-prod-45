/**
 * Settings Page — TestHub Module
 * Route: /testhub/settings
 */
import { useState, useEffect } from 'react';
import { 
  Settings, Bell, Palette, Layout, Clock, Save,
  Sun, Moon, Monitor, Check, RefreshCw, Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/components/ui/CatalystToast';
import { TestHubPageHeader } from '@/components/testhub/TestHubPageHeader';
import { ActivityLog } from '@/components/testhub/settings/ActivityLog';

interface UserPreferences {
  theme: string;
  density: string;
  sidebar_collapsed: boolean;
  default_landing_page: string;
  default_page_size: number;
  show_archived: boolean;
  auto_advance_on_status: boolean;
  confirm_status_change: boolean;
  default_cycle_view: string;
  email_on_assignment: boolean;
  email_on_cycle_complete: boolean;
  email_on_defect_update: boolean;
  email_digest_frequency: string;
  date_format: string;
  time_format: string;
  timezone: string;
  week_starts_on: number;
}

const TABS = [
  { id: 'display', label: 'Display', icon: Palette },
  { id: 'execution', label: 'Test Execution', icon: Layout },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'datetime', label: 'Date & Time', icon: Clock },
  { id: 'activity', label: 'Activity', icon: Activity },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const DENSITY_OPTIONS = [
  { value: 'compact', label: 'Compact', description: 'Fits more on screen' },
  { value: 'comfortable', label: 'Comfortable', description: 'Balanced spacing' },
  { value: 'spacious', label: 'Spacious', description: 'More breathing room' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const LANDING_PAGE_OPTIONS = [
  { value: '/testhub/dashboard', label: 'Dashboard' },
  { value: '/testhub/test-repository', label: 'Test Repository' },
  { value: '/testhub/test-cycles', label: 'Test Cycles' },
  { value: '/testhub/defects', label: 'Defects' },
];

const CYCLE_VIEW_OPTIONS = [
  { value: 'list', label: 'List View' },
  { value: 'board', label: 'Board View' },
  { value: 'grid', label: 'Grid View' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'MMM DD, YYYY', label: 'Jan 15, 2025' },
  { value: 'DD MMM YYYY', label: '15 Jan 2025' },
  { value: 'MM/DD/YYYY', label: '01/15/2025' },
  { value: 'DD/MM/YYYY', label: '15/01/2025' },
  { value: 'YYYY-MM-DD', label: '2025-01-15' },
];

const DIGEST_OPTIONS = [
  { value: 'never', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('display');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchPreferences = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any).rpc('get_user_preferences', { p_user_id: user.id });
      if (error) throw error;
      // RPC returns array, take first item
      const prefs = Array.isArray(data) ? data[0] : data;
      setPreferences(prefs);
    } catch (err) {
      console.error('Fetch preferences error:', err);
      catalystToast.error('Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPreferences(); }, []);

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
    setHasChanges(true);
  };

  const savePreferences = async () => {
    if (!preferences) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any).rpc('update_user_preferences', {
        p_user_id: user.id,
        p_updates: preferences,
      });

      if (error) throw error;
      catalystToast.success('Preferences saved');
      setHasChanges(false);
    } catch (err) {
      console.error('Save preferences error:', err);
      catalystToast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#F8FAFC' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#2563EB' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F8FAFC' }}>
      <TestHubPageHeader title="Settings" subtitle="Customize your TestHub experience">
        {hasChanges && (
          <button onClick={savePreferences} disabled={isSaving}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 20px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>
            <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </TestHubPageHeader>
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Sidebar Tabs */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 16px', backgroundColor: isActive ? '#F1F5F9' : 'transparent', border: 'none', borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent', cursor: 'pointer', textAlign: 'left' }}>
                  <TabIcon size={18} style={{ color: isActive ? '#2563EB' : '#64748B' }} />
                  <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? '#0F172A' : '#64748B' }}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {preferences && (
            <>
              {/* Display Tab */}
              {activeTab === 'display' && (
                <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 24, border: '1px solid #E2E8F0' }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', margin: '0 0 24px' }}>Display Preferences</h2>

                  {/* Theme */}
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Theme</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {THEME_OPTIONS.map((opt) => {
                        const OptIcon = opt.icon;
                        const isSelected = preferences.theme === opt.value;
                        return (
                          <button key={opt.value} onClick={() => updatePreference('theme', opt.value)}
                            style={{ flex: 1, padding: 16, borderRadius: 10, border: `2px solid ${isSelected ? '#2563EB' : '#E2E8F0'}`, backgroundColor: isSelected ? '#EFF6FF' : '#FFF', cursor: 'pointer', textAlign: 'center' }}>
                            <OptIcon size={24} style={{ color: isSelected ? '#2563EB' : '#64748B', marginBottom: 8 }} />
                            <p style={{ fontSize: 14, fontWeight: 500, color: isSelected ? '#2563EB' : '#0F172A', margin: 0 }}>{opt.label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Density */}
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Display Density</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {DENSITY_OPTIONS.map((opt) => {
                        const isSelected = preferences.density === opt.value;
                        return (
                          <button key={opt.value} onClick={() => updatePreference('density', opt.value)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 8, border: `1.5px solid ${isSelected ? '#2563EB' : '#E2E8F0'}`, backgroundColor: isSelected ? '#EFF6FF' : '#FFF', cursor: 'pointer', textAlign: 'left' }}>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', margin: 0 }}>{opt.label}</p>
                              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>{opt.description}</p>
                            </div>
                            {isSelected && <Check size={18} style={{ color: '#2563EB' }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Default Page Size */}
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Default Page Size</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {PAGE_SIZE_OPTIONS.map((size) => {
                        const isSelected = preferences.default_page_size === size;
                        return (
                          <button key={size} onClick={() => updatePreference('default_page_size', size)}
                            style={{ padding: '10px 20px', borderRadius: 8, border: `1.5px solid ${isSelected ? '#2563EB' : '#E2E8F0'}`, backgroundColor: isSelected ? '#2563EB' : '#FFF', color: isSelected ? '#FFF' : '#0F172A', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Default Landing Page */}
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Default Landing Page</label>
                    <select value={preferences.default_landing_page} onChange={(e) => updatePreference('default_landing_page', e.target.value)}
                      style={{ width: '100%', maxWidth: 300, height: 44, padding: '0 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, backgroundColor: '#FFF' }}>
                      {LANDING_PAGE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>

                  {/* Show Archived */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={preferences.show_archived} onChange={(e) => updatePreference('show_archived', e.target.checked)} style={{ width: 20, height: 20, accentColor: '#2563EB' }} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', margin: 0 }}>Show Archived Items</p>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Include archived items in lists by default</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Execution Tab */}
              {activeTab === 'execution' && (
                <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 24, border: '1px solid #E2E8F0' }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', margin: '0 0 24px' }}>Test Execution Preferences</h2>
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Default Cycle View</label>
                    <select value={preferences.default_cycle_view} onChange={(e) => updatePreference('default_cycle_view', e.target.value)}
                      style={{ width: '100%', maxWidth: 300, height: 44, padding: '0 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, backgroundColor: '#FFF' }}>
                      {CYCLE_VIEW_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={preferences.auto_advance_on_status} onChange={(e) => updatePreference('auto_advance_on_status', e.target.checked)} style={{ width: 20, height: 20, accentColor: '#2563EB' }} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', margin: 0 }}>Auto-advance to Next Test</p>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Automatically move to the next test case after setting status</p>
                      </div>
                    </label>
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={preferences.confirm_status_change} onChange={(e) => updatePreference('confirm_status_change', e.target.checked)} style={{ width: 20, height: 20, accentColor: '#2563EB' }} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', margin: 0 }}>Confirm Status Changes</p>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Show confirmation dialog before changing test status</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 24, border: '1px solid #E2E8F0' }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', margin: '0 0 24px' }}>Notification Preferences</h2>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={preferences.email_on_assignment} onChange={(e) => updatePreference('email_on_assignment', e.target.checked)} style={{ width: 20, height: 20, accentColor: '#2563EB' }} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', margin: 0 }}>Test Assignments</p>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Email me when tests are assigned to me</p>
                      </div>
                    </label>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={preferences.email_on_cycle_complete} onChange={(e) => updatePreference('email_on_cycle_complete', e.target.checked)} style={{ width: 20, height: 20, accentColor: '#2563EB' }} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', margin: 0 }}>Cycle Completion</p>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Email me when a test cycle is completed</p>
                      </div>
                    </label>
                  </div>
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={preferences.email_on_defect_update} onChange={(e) => updatePreference('email_on_defect_update', e.target.checked)} style={{ width: 20, height: 20, accentColor: '#2563EB' }} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', margin: 0 }}>Defect Updates</p>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Email me when defects I reported are updated</p>
                      </div>
                    </label>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Email Digest</label>
                    <select value={preferences.email_digest_frequency} onChange={(e) => updatePreference('email_digest_frequency', e.target.value)}
                      style={{ width: '100%', maxWidth: 300, height: 44, padding: '0 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, backgroundColor: '#FFF' }}>
                      {DIGEST_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Date & Time Tab */}
              {activeTab === 'datetime' && (
                <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 24, border: '1px solid #E2E8F0' }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', margin: '0 0 24px' }}>Date & Time Preferences</h2>
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Date Format</label>
                    <select value={preferences.date_format} onChange={(e) => updatePreference('date_format', e.target.value)}
                      style={{ width: '100%', maxWidth: 300, height: 44, padding: '0 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, backgroundColor: '#FFF' }}>
                      {DATE_FORMAT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 28 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Time Format</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {['12h', '24h'].map((fmt) => {
                        const isSelected = preferences.time_format === fmt;
                        return (
                          <button key={fmt} onClick={() => updatePreference('time_format', fmt)}
                            style={{ padding: '12px 24px', borderRadius: 8, border: `1.5px solid ${isSelected ? '#2563EB' : '#E2E8F0'}`, backgroundColor: isSelected ? '#2563EB' : '#FFF', color: isSelected ? '#FFF' : '#0F172A', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                            {fmt === '12h' ? '12-hour (AM/PM)' : '24-hour'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Week Starts On</label>
                    <select value={preferences.week_starts_on} onChange={(e) => updatePreference('week_starts_on', parseInt(e.target.value))}
                      style={{ width: '100%', maxWidth: 300, height: 44, padding: '0 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, backgroundColor: '#FFF' }}>
                      <option value={0}>Sunday</option>
                      <option value={1}>Monday</option>
                      <option value={6}>Saturday</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 24, border: '1px solid #E2E8F0' }}>
                  <ActivityLog limit={30} showHeader={false} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
