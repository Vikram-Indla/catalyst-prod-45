import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CaseStatusesSettings, 
  CasePrioritiesSettings, 
  RunStatusesSettings,
  EmailPreferencesPanel 
} from '@/components/settings';
import { Settings, FileText, Tag, Play, Mail } from 'lucide-react';

// Source documents:
// - Customize_Case_Statuses.doc
// - Customize_Case_Priorities.doc
// - Run_Statuses.doc
// - Email_Preferences.doc

export default function TestManagementSettingsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="h-8 w-8 text-brand-gold" />
          Test Management Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure test management settings for your project. Only admins can modify these settings.
        </p>
      </div>

      <Tabs defaultValue="case-statuses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="case-statuses" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Case Statuses</span>
          </TabsTrigger>
          <TabsTrigger value="case-priorities" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Case Priorities</span>
          </TabsTrigger>
          <TabsTrigger value="run-statuses" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Run Statuses</span>
          </TabsTrigger>
          <TabsTrigger value="email-preferences" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email Preferences</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="case-statuses">
          <CaseStatusesSettings />
        </TabsContent>

        <TabsContent value="case-priorities">
          <CasePrioritiesSettings />
        </TabsContent>

        <TabsContent value="run-statuses">
          <RunStatusesSettings />
        </TabsContent>

        <TabsContent value="email-preferences">
          <EmailPreferencesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
