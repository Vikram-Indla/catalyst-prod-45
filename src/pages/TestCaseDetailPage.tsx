import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TestStepsEditor } from '@/components/test-management/TestStepsEditor';
import { WorkItemLink } from '@/components/test-management/WorkItemLink';
import { ExecutionResults } from '@/components/test-management/ExecutionResults';
import { TestExecutionModal } from '@/components/test-management/TestExecutionModal';
import { TestDataTable } from '@/components/test-management/TestDataTable';
import { useTestCase, useUpdateTestCase, useDeleteTestCase, useTestFolders } from '@/hooks/useTestManagement';
import { useTestDataRows } from '@/hooks/useTestData';
import { useToast } from '@/hooks/use-toast';
import type { TestStep } from '@/types/test-management';

export const TestCaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: testCase, isLoading } = useTestCase(id!);
  const { data: folders } = useTestFolders();
  const { data: dataRows = [] } = useTestDataRows(id!);
  const updateMutation = useUpdateTestCase();
  const deleteMutation = useDeleteTestCase();

  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    preconditions: '',
    expected_result: '',
    test_type: 'manual' as 'manual' | 'automated' | 'bdd',
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    status: 'draft' as 'draft' | 'approved' | 'deprecated',
    folder_id: ''
  });

  React.useEffect(() => {
    if (testCase) {
      setFormData({
        title: testCase.title,
        description: testCase.description || '',
        preconditions: testCase.preconditions || '',
        expected_result: testCase.expected_result || '',
        test_type: testCase.test_type,
        priority: testCase.priority,
        status: testCase.status,
        folder_id: testCase.folder_id || ''
      });
    }
  }, [testCase]);

  const handleSave = async () => {
    if (!id) return;

    try {
      await updateMutation.mutateAsync({
        id,
        ...formData,
        folder_id: formData.folder_id || undefined
      });

      toast({
        title: 'Success',
        description: 'Test case updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update test case',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this test case?')) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: 'Success',
        description: 'Test case deleted successfully'
      });
      navigate('/tests/cases');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete test case',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold" />
      </div>
    );
  }

  if (!testCase) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold mb-4">Test Case Not Found</h2>
        <Button onClick={() => navigate('/tests/cases')}>
          Back to Test Cases
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/tests/cases')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              Test Case #{testCase.id.slice(0, 8)}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsExecutionModalOpen(true)}
              className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
            >
              <Play className="h-4 w-4 mr-2" />
              Execute Test
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              onClick={handleSave}
              className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="data">
              Data
              {dataRows.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-brand-gold text-brand-dark">
                  {dataRows.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="executions">Execution History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-0">
            <div className="bg-card rounded-lg border border-border p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter test case title"
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter test case description"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preconditions">Preconditions</Label>
                  <Textarea
                    id="preconditions"
                    value={formData.preconditions}
                    onChange={(e) => setFormData({ ...formData, preconditions: e.target.value })}
                    placeholder="What needs to be set up before testing?"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expected_result">Expected Result</Label>
                  <Textarea
                    id="expected_result"
                    value={formData.expected_result}
                    onChange={(e) => setFormData({ ...formData, expected_result: e.target.value })}
                    placeholder="What should happen after the test?"
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test_type">Test Type</Label>
                  <Select
                    value={formData.test_type}
                    onValueChange={(value: any) => setFormData({ ...formData, test_type: value })}
                  >
                    <SelectTrigger id="test_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automated">Automated</SelectItem>
                      <SelectItem value="bdd">BDD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="deprecated">Deprecated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="folder">Folder</Label>
                  <Select
                    value={formData.folder_id || undefined}
                    onValueChange={(value) => setFormData({ ...formData, folder_id: value })}
                  >
                    <SelectTrigger id="folder">
                      <SelectValue placeholder="Select folder" />
                    </SelectTrigger>
                    <SelectContent>
                      {folders?.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <WorkItemLink
                linkedWorkItemId={testCase.linked_work_item_id}
                linkedWorkItemType={testCase.linked_work_item_type}
                testCaseId={testCase.id}
              />
            </div>
          </TabsContent>

          <TabsContent value="steps" className="space-y-0">
            <div className="bg-card rounded-lg border border-border p-6">
              <TestStepsEditor testCaseId={testCase.id} />
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-0">
            <div className="bg-card rounded-lg border border-border p-6">
              <TestDataTable testCaseId={testCase.id} />
            </div>
          </TabsContent>

          <TabsContent value="executions" className="space-y-0">
            <div className="bg-card rounded-lg border border-border p-6">
              <ExecutionResults testCaseId={testCase.id} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {isExecutionModalOpen && (
        <TestExecutionModal
          testCase={testCase}
          isOpen={isExecutionModalOpen}
          onClose={() => setIsExecutionModalOpen(false)}
        />
      )}
    </div>
  );
};
