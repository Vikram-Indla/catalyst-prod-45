// Pre-built templates for common SAFe Epic/Feature patterns
export interface EFDTemplate {
  id: string;
  name: string;
  description: string;
  category: 'digital_transformation' | 'customer_experience' | 'platform' | 'compliance' | 'automation';
  epics: Array<{
    name: string;
    description: string;
    lbc_hypothesis: string;
    features: Array<{
      name: string;
      description: string;
      benefit_hypothesis: string;
      acceptance_criteria: string[];
    }>;
  }>;
}

export const EFD_TEMPLATES: EFDTemplate[] = [
  {
    id: 'customer-portal',
    name: 'Customer Self-Service Portal',
    description: 'A comprehensive customer-facing portal with account management, support tickets, and service requests.',
    category: 'customer_experience',
    epics: [
      {
        name: 'Customer Account Management',
        description: 'Enable customers to manage their account details, preferences, and security settings through a unified portal.',
        lbc_hypothesis: 'If we provide self-service account management, then customers will reduce support calls by 30% and satisfaction scores will improve.',
        features: [
          {
            name: 'User Registration & Authentication',
            description: 'Secure registration flow with email verification and multi-factor authentication support.',
            benefit_hypothesis: 'Secure onboarding will increase customer trust and reduce fraud incidents.',
            acceptance_criteria: [
              'Users can register with email and password',
              'Email verification is required before account activation',
              'MFA can be enabled/disabled by user',
              'Password reset flow works correctly',
            ],
          },
          {
            name: 'Profile Management',
            description: 'Allow customers to view and update their personal information and preferences.',
            benefit_hypothesis: 'Self-service profile updates will reduce support tickets by 25%.',
            acceptance_criteria: [
              'Users can update personal details',
              'Users can manage notification preferences',
              'Users can view account history',
              'Changes are saved and reflected immediately',
            ],
          },
        ],
      },
      {
        name: 'Support Ticket System',
        description: 'Enable customers to create, track, and manage support requests digitally.',
        lbc_hypothesis: 'If customers can self-serve support requests, then resolution time will decrease by 40%.',
        features: [
          {
            name: 'Ticket Creation',
            description: 'Allow customers to create support tickets with categorization and priority.',
            benefit_hypothesis: 'Structured ticket creation will improve routing accuracy.',
            acceptance_criteria: [
              'Users can create tickets with description',
              'Category selection is required',
              'File attachments are supported',
              'Ticket number is generated and displayed',
            ],
          },
          {
            name: 'Ticket Tracking Dashboard',
            description: 'Provide visibility into ticket status and history.',
            benefit_hypothesis: 'Transparency in ticket progress will reduce follow-up calls.',
            acceptance_criteria: [
              'Users can view all their tickets',
              'Status updates are visible in real-time',
              'Users can add comments to tickets',
              'Email notifications are sent on status changes',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'data-platform',
    name: 'Enterprise Data Platform',
    description: 'A centralized data platform for analytics, reporting, and data governance.',
    category: 'platform',
    epics: [
      {
        name: 'Data Ingestion Pipeline',
        description: 'Build scalable data ingestion capabilities to collect data from multiple sources.',
        lbc_hypothesis: 'A unified data pipeline will reduce data preparation time by 60% and improve data quality.',
        features: [
          {
            name: 'Batch Data Ingestion',
            description: 'Support scheduled batch imports from various data sources.',
            benefit_hypothesis: 'Automated batch processing will eliminate manual data transfers.',
            acceptance_criteria: [
              'Support for CSV, JSON, and Parquet formats',
              'Scheduling with cron expressions',
              'Error handling and retry logic',
              'Data validation before import',
            ],
          },
          {
            name: 'Real-time Streaming',
            description: 'Enable real-time data streaming for time-sensitive analytics.',
            benefit_hypothesis: 'Real-time data will enable faster decision making.',
            acceptance_criteria: [
              'Kafka/Event Hub integration',
              'Sub-second latency for events',
              'Automatic schema detection',
              'Dead letter queue for failed events',
            ],
          },
        ],
      },
      {
        name: 'Analytics & Reporting',
        description: 'Provide self-service analytics and reporting capabilities.',
        lbc_hypothesis: 'Self-service analytics will reduce report request backlog by 80%.',
        features: [
          {
            name: 'Dashboard Builder',
            description: 'Drag-and-drop dashboard creation for business users.',
            benefit_hypothesis: 'Non-technical users will be able to create their own reports.',
            acceptance_criteria: [
              'Drag-and-drop widget placement',
              'Multiple chart types available',
              'Real-time data refresh',
              'Dashboard sharing capabilities',
            ],
          },
          {
            name: 'Scheduled Reports',
            description: 'Automated report generation and distribution.',
            benefit_hypothesis: 'Automated reports will save 10+ hours per week.',
            acceptance_criteria: [
              'Email delivery on schedule',
              'PDF and Excel export formats',
              'Parameter-driven reports',
              'Report access controls',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'process-automation',
    name: 'Business Process Automation',
    description: 'Automate manual business processes with workflow orchestration and RPA.',
    category: 'automation',
    epics: [
      {
        name: 'Workflow Orchestration',
        description: 'Enable business process automation through visual workflow design.',
        lbc_hypothesis: 'Automated workflows will reduce process completion time by 50%.',
        features: [
          {
            name: 'Workflow Designer',
            description: 'Visual drag-and-drop workflow builder for business analysts.',
            benefit_hypothesis: 'No-code workflow design will accelerate automation initiatives.',
            acceptance_criteria: [
              'Visual drag-and-drop interface',
              'Conditional branching logic',
              'Loop and parallel execution support',
              'Version control for workflows',
            ],
          },
          {
            name: 'Task Assignment & Routing',
            description: 'Automatic task assignment based on rules and workload.',
            benefit_hypothesis: 'Smart routing will improve task distribution and reduce bottlenecks.',
            acceptance_criteria: [
              'Rule-based assignment logic',
              'Workload balancing',
              'Escalation rules',
              'SLA tracking',
            ],
          },
        ],
      },
      {
        name: 'Document Processing',
        description: 'Automate document-centric processes with AI-powered extraction.',
        lbc_hypothesis: 'Automated document processing will reduce manual data entry by 90%.',
        features: [
          {
            name: 'Document Classification',
            description: 'Automatically classify incoming documents by type.',
            benefit_hypothesis: 'Automatic classification will eliminate manual sorting.',
            acceptance_criteria: [
              'Support for PDF, images, and scans',
              'ML-based classification',
              'Confidence scoring',
              'Manual override option',
            ],
          },
          {
            name: 'Data Extraction',
            description: 'Extract structured data from unstructured documents.',
            benefit_hypothesis: 'Automated extraction will speed up processing by 10x.',
            acceptance_criteria: [
              'OCR for scanned documents',
              'Field extraction with validation',
              'Extraction templates',
              'Human-in-the-loop review',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'compliance-framework',
    name: 'Regulatory Compliance Framework',
    description: 'Ensure compliance with regulatory requirements through automated controls and reporting.',
    category: 'compliance',
    epics: [
      {
        name: 'Policy Management',
        description: 'Centralized management of compliance policies and procedures.',
        lbc_hypothesis: 'Centralized policy management will reduce compliance gaps by 70%.',
        features: [
          {
            name: 'Policy Repository',
            description: 'Central repository for all compliance policies with versioning.',
            benefit_hypothesis: 'Single source of truth will improve policy consistency.',
            acceptance_criteria: [
              'Policy version control',
              'Approval workflow for changes',
              'Policy acknowledgment tracking',
              'Search and categorization',
            ],
          },
          {
            name: 'Compliance Training',
            description: 'Mandatory training management and tracking.',
            benefit_hypothesis: 'Automated training will ensure 100% compliance awareness.',
            acceptance_criteria: [
              'Training assignment by role',
              'Completion tracking',
              'Certificate generation',
              'Reminder notifications',
            ],
          },
        ],
      },
      {
        name: 'Audit Management',
        description: 'Streamline audit preparation and evidence collection.',
        lbc_hypothesis: 'Automated audit management will reduce audit preparation time by 60%.',
        features: [
          {
            name: 'Evidence Collection',
            description: 'Automated collection and organization of audit evidence.',
            benefit_hypothesis: 'Automated evidence collection will ensure audit readiness.',
            acceptance_criteria: [
              'Evidence request workflow',
              'Document upload and tagging',
              'Evidence validity tracking',
              'Audit trail for all changes',
            ],
          },
          {
            name: 'Audit Reporting',
            description: 'Generate compliance reports for internal and external audits.',
            benefit_hypothesis: 'Standardized reports will improve audit efficiency.',
            acceptance_criteria: [
              'Pre-built report templates',
              'Real-time compliance status',
              'Gap analysis visualization',
              'Export to auditor-friendly formats',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'mobile-app',
    name: 'Mobile Application Platform',
    description: 'Native mobile application with offline support and push notifications.',
    category: 'digital_transformation',
    epics: [
      {
        name: 'Mobile Core Experience',
        description: 'Foundation mobile experience with authentication and navigation.',
        lbc_hypothesis: 'A mobile app will increase user engagement by 40%.',
        features: [
          {
            name: 'Mobile Authentication',
            description: 'Secure login with biometric support.',
            benefit_hypothesis: 'Biometric login will improve mobile user experience.',
            acceptance_criteria: [
              'Face ID / Touch ID support',
              'PIN fallback option',
              'Session management',
              'Secure token storage',
            ],
          },
          {
            name: 'Offline Mode',
            description: 'Enable core functionality without network connectivity.',
            benefit_hypothesis: 'Offline support will improve usability in low-connectivity areas.',
            acceptance_criteria: [
              'Local data caching',
              'Sync when online',
              'Conflict resolution',
              'Offline indicator',
            ],
          },
        ],
      },
      {
        name: 'Push Notifications',
        description: 'Real-time notifications to keep users informed.',
        lbc_hypothesis: 'Push notifications will increase user retention by 25%.',
        features: [
          {
            name: 'Notification Delivery',
            description: 'Reliable push notification delivery across platforms.',
            benefit_hypothesis: 'Timely notifications will improve user engagement.',
            acceptance_criteria: [
              'iOS and Android support',
              'Deep linking to app sections',
              'Notification grouping',
              'Delivery confirmation tracking',
            ],
          },
          {
            name: 'Preference Management',
            description: 'User control over notification types and frequency.',
            benefit_hypothesis: 'User control will reduce notification fatigue.',
            acceptance_criteria: [
              'Category-based opt-in/out',
              'Quiet hours setting',
              'Frequency controls',
              'Sync with server preferences',
            ],
          },
        ],
      },
    ],
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: 'digital_transformation', name: 'Digital Transformation', icon: '🚀' },
  { id: 'customer_experience', name: 'Customer Experience', icon: '👥' },
  { id: 'platform', name: 'Platform & Infrastructure', icon: '🏗️' },
  { id: 'compliance', name: 'Compliance & Governance', icon: '📋' },
  { id: 'automation', name: 'Automation', icon: '⚙️' },
] as const;
