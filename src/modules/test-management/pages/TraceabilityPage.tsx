/**
 * Traceability Page
 * Dedicated page for requirement-to-test traceability matrix and analysis
 * Route: /tests/traceability
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitBranch, 
  Download, 
  RefreshCw, 
  Plus, 
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Target,
  Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useProjectStore } from '../stores/projectStore';

export function TraceabilityPage() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectStore();
  const [activeTab, setActiveTab] = useState('matrix');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock stats - will be replaced with real data
  const stats = {
    totalRequirements: 0,
    coveredRequirements: 0,
    uncoveredRequirements: 0,
    coveragePercentage: 0,
    totalTestCases: 0,
    linkedTestCases: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Traceability</h1>
          <p className="text-sm text-muted-foreground">
            Track requirements coverage and test case linkage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync from Jira
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Matrix
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Link Requirement
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requirements</p>
                <p className="text-2xl font-bold">{stats.totalRequirements}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Covered</p>
                <p className="text-2xl font-bold">{stats.coveredRequirements}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Uncovered</p>
                <p className="text-2xl font-bold">{stats.uncoveredRequirements}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Coverage</p>
                <p className="text-2xl font-bold">{stats.coveragePercentage}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <GitBranch className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="matrix">Traceability Matrix</TabsTrigger>
            <TabsTrigger value="coverage">Coverage Analysis</TabsTrigger>
            <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <GitBranch className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Traceability Matrix</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    View and manage the relationships between requirements and test cases.
                    Import requirements from Jira or create them manually to build coverage.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate('/tests/requirements')}>
                    <Target className="h-4 w-4 mr-2" />
                    Go to Requirements
                  </Button>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Import Requirements
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          <Card>
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Coverage Analysis</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Analyze test coverage across requirements. See which requirements 
                    have sufficient test coverage and which need more attention.
                  </p>
                </div>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Coverage Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps" className="mt-4">
          <Card>
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Gap Analysis</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Identify requirements without test coverage and prioritize 
                    test creation based on business impact.
                  </p>
                </div>
                <Button variant="outline">
                  <Link2 className="h-4 w-4 mr-2" />
                  Find Coverage Gaps
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TraceabilityPage;