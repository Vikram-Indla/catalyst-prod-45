/**
 * Admin Empty State - Reusable empty state for admin child pages
 * Displays contextual empty state based on the admin section type
 */
import { Button } from '@/components/ui/button';
import AddIcon from '@atlaskit/icon/core/add';
import ArchiveBoxIcon from '@atlaskit/icon/core/archive-box';
import BoardsIcon from '@atlaskit/icon/core/boards';
import BriefcaseIcon from '@atlaskit/icon/core/briefcase';
import ChartBarIcon from '@atlaskit/icon/core/chart-bar';
import ChartTrendIcon from '@atlaskit/icon/core/chart-trend';
import ClockIcon from '@atlaskit/icon/core/clock';
import CreditCardIcon from '@atlaskit/icon/core/credit-card';
import DatabaseIcon from '@atlaskit/icon/core/database';
import FileIcon from '@atlaskit/icon/core/file';
import GlobeIcon from '@atlaskit/icon/core/globe';
import LinkIcon from '@atlaskit/icon/core/link';
import NotificationIcon from '@atlaskit/icon/core/notification';
import OfficeBuildingIcon from '@atlaskit/icon/core/office-building';
import PaintPaletteIcon from '@atlaskit/icon/core/paint-palette';
import PeopleGroupIcon from '@atlaskit/icon/core/people-group';
import SettingsIcon from '@atlaskit/icon/core/settings';
import ShieldIcon from '@atlaskit/icon/core/shield';
import UploadIcon from '@atlaskit/icon/core/upload';
import LocationIcon from '@atlaskit/icon/glyph/location';
type AdminSectionType = 
  | 'users'
  | 'roles-permissions'
  | 'programs' // formerly projects
  | 'portfolios' // formerly programs
  | 'departments'
  | 'business-owners'
  | 'modules-packages'
  | 'product-settings'
  | 'work-codes'
  | 'details-panels'
  | 'terminology'
  | 'team-settings'
  | 'program-settings'
  | 'portfolio-settings'
  | 'progress-bars'
  | 'estimation'
  | 'general-settings'
  | 'theme-groups'
  | 'announcements'
  | 'jira-config'
  | 'import-data'
  | 'activity'
  | 'changes'
  | 'changes-log'
  | 'usage-trends'
  | 'security'
  | 'design-audit';

interface SectionConfig {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  showCta: boolean;
}

const SECTION_CONFIG: Record<AdminSectionType, SectionConfig> = {
  'users': {
    icon: PeopleGroupIcon,
    title: 'No users found',
    subtitle: 'Add users to give them access to Catalyst.',
    ctaLabel: 'Add user',
    showCta: true,
  },
  'roles-permissions': {
    icon: ShieldIcon,
    title: 'No roles configured',
    subtitle: 'Create roles to manage user permissions across the platform.',
    ctaLabel: 'Create role',
    showCta: true,
  },
  'programs': {
    icon: BoardsIcon,
    title: 'No projects found',
    subtitle: 'Create projects to organize features and track delivery.',
    ctaLabel: 'Create project',
    showCta: true,
  },
  'portfolios': {
    icon: GlobeIcon,
    title: 'No programs found',
    subtitle: 'Create programs to group related epics and strategic initiatives.',
    ctaLabel: 'Create program',
    showCta: true,
  },
  'departments': {
    icon: OfficeBuildingIcon,
    title: 'No departments configured',
    subtitle: 'Add departments to categorize business requests and ownership.',
    ctaLabel: 'Add department',
    showCta: true,
  },
  'business-owners': {
    icon: BriefcaseIcon,
    title: 'No business owners defined',
    subtitle: 'Add business owners to assign accountability for requests.',
    ctaLabel: 'Add business owner',
    showCta: true,
  },
  'modules-packages': {
    icon: ArchiveBoxIcon,
    title: 'No modules configured',
    subtitle: 'Configure modules and packages to enable platform features.',
    showCta: false,
  },
  'product-settings': {
    icon: SettingsIcon,
    title: 'Product settings empty',
    subtitle: 'Configure product module settings including fields and workflows.',
    showCta: false,
  },
  'work-codes': {
    icon: FileIcon,
    title: 'No work codes defined',
    subtitle: 'Create work codes for categorizing and tracking work items.',
    ctaLabel: 'Add work code',
    showCta: true,
  },
  'details-panels': {
    icon: DatabaseIcon,
    title: 'No detail panels configured',
    subtitle: 'Configure detail panels for different work item types.',
    showCta: false,
  },
  'terminology': {
    icon: FileIcon,
    title: 'Terminology not configured',
    subtitle: 'Customize terminology used throughout the platform.',
    showCta: false,
  },
  'team-settings': {
    icon: SettingsIcon,
    title: 'Team settings empty',
    subtitle: 'Configure settings for team management and operations.',
    showCta: false,
  },
  'program-settings': {
    icon: SettingsIcon,
    title: 'Project settings empty',
    subtitle: 'Configure project-level settings and defaults.',
    showCta: false,
  },
  'portfolio-settings': {
    icon: SettingsIcon,
    title: 'Program settings empty',
    subtitle: 'Configure program-level settings and defaults.',
    showCta: false,
  },
  'progress-bars': {
    icon: ChartBarIcon,
    title: 'No progress bar configs',
    subtitle: 'Configure how progress is calculated and displayed.',
    showCta: false,
  },
  'estimation': {
    icon: ChartBarIcon,
    title: 'Estimation not configured',
    subtitle: 'Set up estimation methods and point scales.',
    showCta: false,
  },
  'general-settings': {
    icon: SettingsIcon,
    title: 'General settings',
    subtitle: 'Configure general platform settings.',
    showCta: false,
  },
  'theme-groups': {
    icon: PaintPaletteIcon,
    title: 'No theme groups created',
    subtitle: 'Create theme groups to organize strategic themes.',
    ctaLabel: 'Add theme group',
    showCta: true,
  },
  'announcements': {
    icon: NotificationIcon,
    title: 'No announcements',
    subtitle: 'Create announcements to communicate with platform users.',
    ctaLabel: 'Create announcement',
    showCta: true,
  },
  'jira-config': {
    icon: LinkIcon,
    title: 'Jira not connected',
    subtitle: 'Configure Jira integration to sync work items.',
    ctaLabel: 'Connect Jira',
    showCta: true,
  },
  'import-data': {
    icon: UploadIcon,
    title: 'No imports yet',
    subtitle: 'Import data from external sources like CSV or Excel.',
    ctaLabel: 'Start import',
    showCta: true,
  },
  'activity': {
    icon: ChartTrendIcon,
    title: 'No recent activity',
    subtitle: 'Activity logs will appear here as users interact with the platform.',
    showCta: false,
  },
  'changes': {
    icon: ClockIcon,
    title: 'No changes recorded',
    subtitle: 'Change history will appear here as data is modified.',
    showCta: false,
  },
  'changes-log': {
    icon: FileIcon,
    title: 'No change logs',
    subtitle: 'Detailed change logs will appear here.',
    showCta: false,
  },
  'usage-trends': {
    icon: ChartBarIcon,
    title: 'No usage data yet',
    subtitle: 'Usage trends will appear as users interact with the platform.',
    showCta: false,
  },
  'security': {
    icon: ShieldIcon,
    title: 'Security settings',
    subtitle: 'Configure security policies and access controls.',
    showCta: false,
  },
  'design-audit': {
    icon: PaintPaletteIcon,
    title: 'Design audit empty',
    subtitle: 'Run a design audit to check UI consistency.',
    ctaLabel: 'Run audit',
    showCta: true,
  },
};

interface AdminEmptyStateProps {
  sectionType: AdminSectionType;
  onAction?: () => void;
}

export function AdminEmptyState({ sectionType, onAction }: AdminEmptyStateProps) {
  const config = SECTION_CONFIG[sectionType];
  
  if (!config) {
    return null;
  }

  const Icon = config.icon;

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: 'var(--surface-2)' }}
      >
        <Icon label="" size="large" primaryColor="var(--ds-icon-subtle, #626F86)" />
      </div>
      
      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
        {config.title}
      </h2>
      
      <p className="text-sm max-w-md mb-8" style={{ color: 'var(--text-2)' }}>
        {config.subtitle}
      </p>

      {config.showCta && config.ctaLabel && onAction && (
        <Button 
          onClick={onAction}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white"
        >
          <AddIcon label="" size="small" />
          {config.ctaLabel}
        </Button>
      )}
    </div>
  );
}

export { type AdminSectionType };
