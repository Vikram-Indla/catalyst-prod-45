import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import {
  CheckCircle,
  Edit,
  FileText,
  Calendar,
  Settings,
  MoreHorizontal,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

// ============================================
// HIERARCHICAL MOCK DATA
// ============================================

interface Subtask {
  key: string;
  summary: string;
  status: string;
  statusVariant: 'default' | 'secondary' | 'outline' | 'destructive';
  assignee: string;
  priority: string;
  created: string;
}

interface Story {
  key: string;
  summary: string;
  status: string;
  statusVariant: 'default' | 'secondary' | 'outline' | 'destructive';
  assignee: string;
  priority: string;
  created: string;
  subtasks: Subtask[];
}

interface Feature {
  key: string;
  summary: string;
  status: string;
  statusVariant: 'default' | 'secondary' | 'outline' | 'destructive';
  assignee: string;
  priority: string;
  created: string;
  stories: Story[];
}

const mockHierarchicalData: Feature[] = [
  {
    key: 'FEAT-1',
    summary: 'User Authentication System',
    status: 'In Progress',
    statusVariant: 'secondary',
    assignee: 'John Doe',
    priority: 'High',
    created: 'Oct 22, 2024',
    stories: [
      {
        key: 'STORY-1',
        summary: 'Implement login page',
        status: 'Done',
        statusVariant: 'default',
        assignee: 'Jane Smith',
        priority: 'High',
        created: 'Oct 23, 2024',
        subtasks: [
          {
            key: 'SUB-1',
            summary: 'Design login form',
            status: 'Done',
            statusVariant: 'default',
            assignee: 'Jane Smith',
            priority: 'Medium',
            created: 'Oct 24, 2024',
          },
          {
            key: 'SUB-2',
            summary: 'Implement form validation',
            status: 'Done',
            statusVariant: 'default',
            assignee: 'Jane Smith',
            priority: 'Medium',
            created: 'Oct 24, 2024',
          },
        ],
      },
      {
        key: 'STORY-2',
        summary: 'Add password reset functionality',
        status: 'In Progress',
        statusVariant: 'secondary',
        assignee: 'Bob Johnson',
        priority: 'Medium',
        created: 'Oct 25, 2024',
        subtasks: [
          {
            key: 'SUB-3',
            summary: 'Create reset password email template',
            status: 'To Do',
            statusVariant: 'outline',
            assignee: 'Bob Johnson',
            priority: 'Medium',
            created: 'Oct 26, 2024',
          },
        ],
      },
      {
        key: 'STORY-3',
        summary: 'Implement OAuth integration',
        status: 'To Do',
        statusVariant: 'outline',
        assignee: 'Alice Brown',
        priority: 'Low',
        created: 'Oct 27, 2024',
        subtasks: [],
      },
    ],
  },
  {
    key: 'FEAT-2',
    summary: 'Payment Gateway Integration',
    status: 'To Do',
    statusVariant: 'outline',
    assignee: 'Alice Brown',
    priority: 'High',
    created: 'Oct 20, 2024',
    stories: [
      {
        key: 'STORY-4',
        summary: 'Integrate Stripe API',
        status: 'To Do',
        statusVariant: 'outline',
        assignee: 'Alice Brown',
        priority: 'High',
        created: 'Oct 21, 2024',
        subtasks: [
          {
            key: 'SUB-4',
            summary: 'Set up Stripe account',
            status: 'To Do',
            statusVariant: 'outline',
            assignee: 'Alice Brown',
            priority: 'High',
            created: 'Oct 21, 2024',
          },
          {
            key: 'SUB-5',
            summary: 'Implement payment form',
            status: 'To Do',
            statusVariant: 'outline',
            assignee: 'Alice Brown',
            priority: 'High',
            created: 'Oct 21, 2024',
          },
        ],
      },
      {
        key: 'STORY-5',
        summary: 'Add PayPal support',
        status: 'To Do',
        statusVariant: 'outline',
        assignee: 'Charlie Wilson',
        priority: 'Medium',
        created: 'Oct 22, 2024',
        subtasks: [],
      },
    ],
  },
  {
    key: 'FEAT-3',
    summary: 'Dashboard Analytics Module',
    status: 'In Progress',
    statusVariant: 'secondary',
    assignee: 'David Lee',
    priority: 'Medium',
    created: 'Oct 18, 2024',
    stories: [
      {
        key: 'STORY-6',
        summary: 'Create chart components',
        status: 'Done',
        statusVariant: 'default',
        assignee: 'David Lee',
        priority: 'Medium',
        created: 'Oct 19, 2024',
        subtasks: [
          {
            key: 'SUB-6',
            summary: 'Bar chart component',
            status: 'Done',
            statusVariant: 'default',
            assignee: 'David Lee',
            priority: 'Medium',
            created: 'Oct 19, 2024',
          },
          {
            key: 'SUB-7',
            summary: 'Pie chart component',
            status: 'Done',
            statusVariant: 'default',
            assignee: 'David Lee',
            priority: 'Medium',
            created: 'Oct 19, 2024',
          },
        ],
      },
      {
        key: 'STORY-7',
        summary: 'Implement data fetching',
        status: 'In Progress',
        statusVariant: 'secondary',
        assignee: 'Emma Garcia',
        priority: 'High',
        created: 'Oct 20, 2024',
        subtasks: [],
      },
    ],
  },
];

// ============================================
// SUMMARY VIEW
// ============================================

function SummaryView() {
  const metrics = {
    completed: 4,
    updated: 8,
    created: 12,
    dueSoon: 3,
  };

  const statusData = [
    { name: 'To Do', value: 8, color: '#4C9AFF' },
    { name: 'In Progress', value: 5, color: '#0747A6' },
    { name: 'Done', value: 4, color: '#36B37E' },
  ];

  const priorityData = [
    { name: 'High', value: 5 },
    { name: 'Medium', value: 7 },
    { name: 'Low', value: 5 },
  ];

  const typesData = [
    { name: 'Feature', value: 18, icon: '📦' },
    { name: 'Story', value: 41, icon: '📗' },
    { name: 'Subtask', value: 41, icon: '☑️' },
  ];

  const totalWorkItems = statusData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="mt-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-medium">{metrics.completed}</div>
                <div className="text-sm text-foreground">completed</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">in the last 7 days</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Edit className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-medium">{metrics.updated}</div>
                <div className="text-sm text-foreground">updated</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">in the last 7 days</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-medium">{metrics.created}</div>
                <div className="text-sm text-foreground">created</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">in the last 7 days</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-amber-600" />
              <div>
                <div className="text-2xl font-medium">{metrics.dueSoon}</div>
                <div className="text-sm text-foreground">due soon</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">in the next 7 days</div>
          </CardContent>
        </Card>
      </div>

      {/* Widgets - 2 Columns */}
      <div className="grid grid-cols-2 gap-4">
        {/* Status Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Status overview</CardTitle>
            <p className="text-xs text-muted-foreground">
              Get a snapshot of the status of your work items.{' '}
              <Link to="#" className="text-primary hover:underline">View all work items</Link>
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-10 py-4">
              <div className="relative w-44 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-medium">{totalWorkItems}</div>
                  <div className="text-[11px] text-muted-foreground">Total items</div>
                </div>
              </div>

              <div className="flex-1">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ background: item.color }}
                    />
                    <span className="text-sm">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Types of Work */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Types of work</CardTitle>
            <p className="text-xs text-muted-foreground">
              Get a breakdown of work items by their types.{' '}
              <Link to="#" className="text-primary hover:underline">View all items</Link>
            </p>
          </CardHeader>
          <CardContent className="py-4">
            {typesData.map((type) => (
              <div key={type.name} className="flex items-center gap-3 mb-3">
                <span className="text-base">{type.icon}</span>
                <span className="text-sm w-20">{type.name}</span>
                <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-muted-foreground/40 flex items-center pl-2"
                    style={{ width: `${type.value}%` }}
                  >
                    <span className="text-xs font-semibold text-foreground">
                      {type.value}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Priority breakdown</CardTitle>
            <p className="text-xs text-muted-foreground">
              Get a holistic view of how your work is being prioritized.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-48 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Bar dataKey="value" fill="hsl(var(--muted-foreground))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground">
              Activity will appear here as work progresses.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// LIST VIEW - HIERARCHICAL TABLE
// ============================================

function ListView() {
  const [expandedFeatures, setExpandedFeatures] = useState<string[]>(['FEAT-1', 'FEAT-3']);
  const [expandedStories, setExpandedStories] = useState<string[]>(['STORY-1', 'STORY-6']);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFeature = (key: string) => {
    setExpandedFeatures((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleStory = (key: string) => {
    setExpandedStories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="mt-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative max-w-[280px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-1" />
          Filter
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox /></TableHead>
              <TableHead className="w-12">Type</TableHead>
              <TableHead className="w-24">Key</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28">Assignee</TableHead>
              <TableHead className="w-20">Priority</TableHead>
              <TableHead className="w-28">Created</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockHierarchicalData.map((feature) => {
              const isFeatureExpanded = expandedFeatures.includes(feature.key);
              return (
                <>
                  {/* Feature Row */}
                  <TableRow key={feature.key}>
                    <TableCell><Checkbox /></TableCell>
                    <TableCell>📦</TableCell>
                    <TableCell>
                      <Link to={`/browse/${feature.key}`} className="text-primary font-medium hover:underline">
                        {feature.key}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleFeature(feature.key)} className="p-0.5 hover:bg-muted rounded">
                          {isFeatureExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <span className="font-medium">{feature.summary}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={feature.statusVariant}>{feature.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">{getInitials(feature.assignee)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="text-sm">{feature.priority}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{feature.created}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>

                  {/* Stories */}
                  {isFeatureExpanded && feature.stories.map((story) => {
                    const isStoryExpanded = expandedStories.includes(story.key);
                    const hasSubtasks = story.subtasks.length > 0;
                    return (
                      <>
                        <TableRow key={story.key} className="bg-muted/30">
                          <TableCell><Checkbox /></TableCell>
                          <TableCell className="pl-6">📗</TableCell>
                          <TableCell>
                            <Link to={`/browse/${story.key}`} className="text-primary font-medium hover:underline">
                              {story.key}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 pl-5">
                              {hasSubtasks && (
                                <button onClick={() => toggleStory(story.key)} className="p-0.5 hover:bg-muted rounded">
                                  {isStoryExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              )}
                              <span>{story.summary}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={story.statusVariant}>{story.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{getInitials(story.assignee)}</AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="text-sm">{story.priority}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{story.created}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>

                        {/* Subtasks */}
                        {isStoryExpanded && hasSubtasks && story.subtasks.map((subtask) => (
                          <TableRow key={subtask.key} className="bg-muted/50">
                            <TableCell><Checkbox /></TableCell>
                            <TableCell className="pl-12">☑️</TableCell>
                            <TableCell>
                              <Link to={`/browse/${subtask.key}`} className="text-primary font-medium hover:underline">
                                {subtask.key}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <span className="pl-10">{subtask.summary}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={subtask.statusVariant}>{subtask.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">{getInitials(subtask.assignee)}</AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="text-sm">{subtask.priority}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{subtask.created}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>Edit</DropdownMenuItem>
                                  <DropdownMenuItem>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    );
                  })}
                </>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ============================================
// KANBAN VIEW
// ============================================

function KanbanView() {
  const columns = [
    { id: 'todo', name: 'To Do', items: mockHierarchicalData.filter((f) => f.status === 'To Do') },
    { id: 'inprogress', name: 'In Progress', items: mockHierarchicalData.filter((f) => f.status === 'In Progress') },
    { id: 'done', name: 'Done', items: [] },
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="mt-4 flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className="min-w-[280px] max-w-[280px] bg-muted/50 rounded-md p-2"
        >
          <div className="flex items-center justify-between p-2 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              {column.name}
            </span>
            <span className="text-xs text-muted-foreground">{column.items.length}</span>
          </div>

          <div className="flex flex-col gap-2">
            {column.items.map((item) => (
              <Card key={item.key} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="text-sm mb-2">{item.summary}</div>
                  <div className="flex items-center justify-between">
                    <Link to={`/browse/${item.key}`} className="text-xs text-primary hover:underline">
                      {item.key}
                    </Link>
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">{getInitials(item.assignee)}</AvatarFallback>
                    </Avatar>
                  </div>
                </CardContent>
              </Card>
            ))}

            {column.items.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No items
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ProjectSummaryPage() {
  const { projectKey: routeProjectKey } = useParams();
  const projectKey = routeProjectKey || 'TEST';
  const projectName = 'Test Project';

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/projects">Projects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{projectName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Project Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
          <span className="text-sm font-medium text-purple-700">{projectKey.charAt(0)}</span>
        </div>
        <h1 className="text-xl font-medium">{projectName}</h1>
        <Button variant="ghost" size="icon" className="ml-auto" asChild>
          <Link to={`/projects/${projectKey}/settings`}>
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <SummaryView />
        </TabsContent>

        <TabsContent value="list">
          <ListView />
        </TabsContent>

        <TabsContent value="kanban">
          <KanbanView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
