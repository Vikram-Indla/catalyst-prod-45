/**
 * TestCaseDetailDrawer — Inline drawer for viewing test case details
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  X,
  Edit,
  Play,
  History,
  Link2,
  MessageSquare,
  FileText,
  Clock,
  User,
  Calendar,
  Tag,
  Copy,
  ExternalLink,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge, PriorityBadge, TypeBadge } from './badges';
import { ExecutionStatusBadge } from './badges/ExecutionStatusBadge';
import { AutomationBadge } from './badges/AutomationBadge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TestStep {
  id: string;
  step: number;
  action: string;
  expectedResult: string;
}

interface TestCase {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'ready' | 'approved' | 'deprecated';
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'functional' | 'regression' | 'smoke' | 'integration' | 'e2e';
  steps?: TestStep[];
  preconditions?: string;
  postconditions?: string;
  tags?: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  lastRunStatus?: 'passed' | 'failed' | 'blocked' | 'not_run';
  automationStatus?: 'automated' | 'manual' | 'in_progress';
  linkedItems?: { type: string; id: string; title: string }[];
  executionHistory?: { date: string; status: string; executor: string; duration: string }[];
}

interface TestCaseDetailDrawerProps {
  testCase: TestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onExecute?: () => void;
}

export function TestCaseDetailDrawer({
  testCase,
  open,
  onOpenChange,
  onEdit,
  onExecute,
}: TestCaseDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('details');

  if (!testCase) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(testCase.id);
    toast.success('Test case ID copied');
  };

  // Mock data for demonstration
  const mockSteps: TestStep[] = testCase.steps || [
    { id: '1', step: 1, action: 'Navigate to login page', expectedResult: 'Login page is displayed' },
    { id: '2', step: 2, action: 'Enter valid credentials', expectedResult: 'Credentials are accepted' },
    { id: '3', step: 3, action: 'Click Sign In button', expectedResult: 'User is redirected to dashboard' },
    { id: '4', step: 4, action: 'Verify user profile is visible', expectedResult: 'User name and avatar are displayed' },
  ];

  const mockHistory = testCase.executionHistory || [
    { date: '2026-01-12 14:30', status: 'passed', executor: 'Sarah Chen', duration: '2m 45s' },
    { date: '2026-01-10 09:15', status: 'failed', executor: 'Mike Johnson', duration: '3m 12s' },
    { date: '2026-01-08 16:00', status: 'passed', executor: 'Sarah Chen', duration: '2m 30s' },
    { date: '2026-01-05 11:45', status: 'blocked', executor: 'Alex Rivera', duration: '0m 45s' },
  ];

  const mockLinkedItems = testCase.linkedItems || [
    { type: 'Story', id: 'STR-123', title: 'User authentication flow' },
    { type: 'Bug', id: 'BUG-456', title: 'Login fails on Safari' },
    { type: 'Requirement', id: 'REQ-789', title: 'OAuth 2.0 compliance' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <button 
                  onClick={handleCopyId}
                  className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  {testCase.id}
                </button>
                <Copy className="w-3 h-3 text-muted-foreground" />
              </div>
              <SheetTitle className="text-lg font-semibold line-clamp-2">
                {testCase.title}
              </SheetTitle>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
              <Button size="sm" onClick={onExecute}>
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Execute
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in new tab
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <StatusBadge status={testCase.status} size="sm" />
            <PriorityBadge priority={testCase.priority} size="sm" />
            <TypeBadge type={testCase.type} size="sm" />
            {testCase.automationStatus && (
              <AutomationBadge status={testCase.automationStatus} size="sm" />
            )}
            {testCase.lastRunStatus && (
              <ExecutionStatusBadge status={testCase.lastRunStatus} size="sm" />
            )}
          </div>
        </SheetHeader>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 grid grid-cols-4 w-auto">
            <TabsTrigger value="details" className="text-xs">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Details
            </TabsTrigger>
            <TabsTrigger value="steps" className="text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Steps
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <History className="w-3.5 h-3.5 mr-1.5" />
              History
            </TabsTrigger>
            <TabsTrigger value="links" className="text-xs">
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Links
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 px-6 py-4">
            {/* Details Tab */}
            <TabsContent value="details" className="mt-0 space-y-6">
              {/* Description */}
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Description</h4>
                <p className="text-sm">
                  {testCase.description || 'No description provided.'}
                </p>
              </div>
              
              {/* Preconditions */}
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Preconditions</h4>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                  {testCase.preconditions || 'User must be on the application homepage. Browser cookies should be cleared.'}
                </p>
              </div>
              
              {/* Tags */}
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(testCase.tags || ['authentication', 'login', 'security', 'smoke-test']).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* Metadata */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Created by
                  </span>
                  <span className="font-medium">{testCase.createdBy || 'Sarah Chen'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Created
                  </span>
                  <span className="font-medium">{testCase.createdAt || 'Jan 5, 2026'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Last updated
                  </span>
                  <span className="font-medium">{testCase.updatedAt || 'Jan 12, 2026'}</span>
                </div>
              </div>
            </TabsContent>
            
            {/* Steps Tab */}
            <TabsContent value="steps" className="mt-0">
              <div className="space-y-3">
                {mockSteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                        {step.step}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <span className="text-xs text-muted-foreground font-medium uppercase">Action</span>
                          <p className="text-sm mt-0.5">{step.action}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground font-medium uppercase">Expected Result</span>
                          <p className="text-sm mt-0.5 text-muted-foreground">{step.expectedResult}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
            
            {/* History Tab */}
            <TabsContent value="history" className="mt-0">
              <div className="space-y-3">
                {mockHistory.map((run, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {run.status === 'passed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : run.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium capitalize">{run.status}</p>
                        <p className="text-xs text-muted-foreground">{run.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{run.executor}</p>
                      <p className="text-xs text-muted-foreground">{run.duration}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
            
            {/* Links Tab */}
            <TabsContent value="links" className="mt-0">
              <div className="space-y-3">
                {mockLinkedItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{item.id}</p>
                        <p className="text-xs text-muted-foreground">{item.title}</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                ))}
                
                <Button variant="outline" className="w-full mt-4">
                  <Link2 className="w-4 h-4 mr-2" />
                  Link Work Item
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
