/**
 * Admin Empty State - Reusable empty state for admin child pages
 * Displays contextual empty state based on the admin section type
 */
import { 
  Users, 
  Shield, 
  Settings, 
  Database, 
  Link2, 
  Activity,
  Building2,
  UserCog,
  Briefcase,
  MapPin,
  Globe,
  DollarSign,
  FolderKanban,
  Layers,
  FileText,
  Bell,
  Palette,
  Import,
  KeyRound,
  Package,
  BarChart3,
  Clock,
  type LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

type AdminSectionType = 
  | 'users'
  | 'roles-permissions'
  | 'team-roles'
  | 'system-roles'
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
  icon: LucideIcon;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  showCta: boolean;
}

const SECTION_CONFIG: Record<AdminSectionType, SectionConfig> = {
  'users': {
    icon: Users,
    title: 'No users found',
    subtitle: 'Add users to give them access to Catalyst.',
    ctaLabel: 'Add user',
    showCta: true,
  },
  'roles-permissions': {
    icon: Shield,
    title: 'No roles configured',
    subtitle: 'Create roles to manage user permissions across the platform.',
    ctaLabel: 'Create role',
    showCta: true,
  },
  'team-roles': {
    icon: UserCog,
    title: 'No team roles defined',
    subtitle: 'Define team roles like Scrum Master, Product Owner, or Developer.',
    ctaLabel: 'Add team role',
    showCta: true,
  },
  'system-roles': {
    icon: KeyRound,
    title: 'No system roles configured',
    subtitle: 'System roles control access to administrative functions.',
    ctaLabel: 'Add system role',
    showCta: true,
  },
  'programs': {
    icon: FolderKanban,
    title: 'No projects found',
    subtitle: 'Create projects to organize features and track delivery.',
    ctaLabel: 'Create project',
    showCta: true,
  },
  'portfolios': {
    icon: Layers,
    title: 'No programs found',
    subtitle: 'Create programs to group related epics and strategic initiatives.',
    ctaLabel: 'Create program',
    showCta: true,
  },
  'departments': {
    icon: Building2,
    title: 'No departments configured',
    subtitle: 'Add departments to categorize business requests and ownership.',
    ctaLabel: 'Add department',
    showCta: true,
  },
  'business-owners': {
    icon: Briefcase,
    title: 'No business owners defined',
    subtitle: 'Add business owners to assign accountability for requests.',
    ctaLabel: 'Add business owner',
    showCta: true,
  },
  'modules-packages': {
    icon: Package,
    title: 'No modules configured',
    subtitle: 'Configure modules and packages to enable platform features.',
    showCta: false,
  },
  'product-settings': {
    icon: Settings,
    title: 'Product settings empty',
    subtitle: 'Configure product module settings including fields and workflows.',
    showCta: false,
  },
  'work-codes': {
    icon: FileText,
    title: 'No work codes defined',
    subtitle: 'Create work codes for categorizing and tracking work items.',
    ctaLabel: 'Add work code',
    showCta: true,
  },
  'details-panels': {
    icon: Layers,
    title: 'No detail panels configured',
    subtitle: 'Configure detail panels for different work item types.',
    showCta: false,
  },
  'terminology': {
    icon: FileText,
    title: 'Terminology not configured',
    subtitle: 'Customize terminology used throughout the platform.',
    showCta: false,
  },
  'team-settings': {
    icon: Settings,
    title: 'Team settings empty',
    subtitle: 'Configure settings for team management and operations.',
    showCta: false,
  },
  'program-settings': {
    icon: Settings,
    title: 'Project settings empty',
    subtitle: 'Configure project-level settings and defaults.',
    showCta: false,
  },
  'portfolio-settings': {
    icon: Settings,
    title: 'Program settings empty',
    subtitle: 'Configure program-level settings and defaults.',
    showCta: false,
  },
  'progress-bars': {
    icon: BarChart3,
    title: 'No progress bar configs',
    subtitle: 'Configure how progress is calculated and displayed.',
    showCta: false,
  },
  'estimation': {
    icon: BarChart3,
    title: 'Estimation not configured',
    subtitle: 'Set up estimation methods and point scales.',
    showCta: false,
  },
  'general-settings': {
    icon: Settings,
    title: 'General settings',
    subtitle: 'Configure general platform settings.',
    showCta: false,
  },
  'theme-groups': {
    icon: Palette,
    title: 'No theme groups created',
    subtitle: 'Create theme groups to organize strategic themes.',
    ctaLabel: 'Add theme group',
    showCta: true,
  },
  'announcements': {
    icon: Bell,
    title: 'No announcements',
    subtitle: 'Create announcements to communicate with platform users.',
    ctaLabel: 'Create announcement',
    showCta: true,
  },
  'jira-config': {
    icon: Link2,
    title: 'Jira not connected',
    subtitle: 'Configure Jira integration to sync work items.',
    ctaLabel: 'Connect Jira',
    showCta: true,
  },
  'import-data': {
    icon: Import,
    title: 'No imports yet',
    subtitle: 'Import data from external sources like CSV or Excel.',
    ctaLabel: 'Start import',
    showCta: true,
  },
  'activity': {
    icon: Activity,
    title: 'No recent activity',
    subtitle: 'Activity logs will appear here as users interact with the platform.',
    showCta: false,
  },
  'changes': {
    icon: Clock,
    title: 'No changes recorded',
    subtitle: 'Change history will appear here as data is modified.',
    showCta: false,
  },
  'changes-log': {
    icon: FileText,
    title: 'No change logs',
    subtitle: 'Detailed change logs will appear here.',
    showCta: false,
  },
  'usage-trends': {
    icon: BarChart3,
    title: 'No usage data yet',
    subtitle: 'Usage trends will appear as users interact with the platform.',
    showCta: false,
  },
  'security': {
    icon: Shield,
    title: 'Security settings',
    subtitle: 'Configure security policies and access controls.',
    showCta: false,
  },
  'design-audit': {
    icon: Palette,
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
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <h2 className="text-xl font-semibold text-foreground mb-2">
        {config.title}
      </h2>
      
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        {config.subtitle}
      </p>

      {config.showCta && config.ctaLabel && onAction && (
        <Button 
          onClick={onAction}
          className="bg-brand-gold hover:bg-brand-gold-hover text-background"
        >
          <Plus className="w-4 h-4 mr-2" />
          {config.ctaLabel}
        </Button>
      )}
    </div>
  );
}

export { type AdminSectionType };
