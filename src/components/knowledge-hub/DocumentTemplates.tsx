import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ListChecks, Lightbulb, BookOpen, Target, Users } from 'lucide-react';

interface DocumentTemplatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (content: string, title: string) => void;
}

const templates = [
  {
    id: 'blank',
    title: 'Blank Document',
    description: 'Start with a clean slate',
    icon: FileText,
    content: '<p></p>',
  },
  {
    id: 'meeting-notes',
    title: 'Meeting Notes',
    description: 'Capture meeting discussions and action items',
    icon: Users,
    content: `
      <h1>Meeting Notes</h1>
      <p><strong>Date:</strong> [Date]</p>
      <p><strong>Attendees:</strong> [List attendees]</p>
      <h2>Agenda</h2>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>
      <h2>Discussion</h2>
      <p>[Meeting discussion notes]</p>
      <h2>Action Items</h2>
      <ul class="task-list">
        <li>[ ] Action item 1 - Owner: [Name]</li>
        <li>[ ] Action item 2 - Owner: [Name]</li>
      </ul>
      <h2>Next Steps</h2>
      <p>[Next steps and follow-up items]</p>
    `,
  },
  {
    id: 'requirements',
    title: 'Requirements Document',
    description: 'Document product or feature requirements',
    icon: ListChecks,
    content: `
      <h1>Requirements Document</h1>
      <h2>Overview</h2>
      <p>[Brief description of the feature or product]</p>
      <h2>Objectives</h2>
      <ul>
        <li>Objective 1</li>
        <li>Objective 2</li>
      </ul>
      <h2>User Stories</h2>
      <p><strong>As a</strong> [user type], <strong>I want</strong> [goal], <strong>so that</strong> [benefit].</p>
      <h2>Functional Requirements</h2>
      <table>
        <tr><th>ID</th><th>Requirement</th><th>Priority</th></tr>
        <tr><td>FR-001</td><td>[Requirement description]</td><td>High</td></tr>
        <tr><td>FR-002</td><td>[Requirement description]</td><td>Medium</td></tr>
      </table>
      <h2>Non-Functional Requirements</h2>
      <ul>
        <li>Performance: [Requirements]</li>
        <li>Security: [Requirements]</li>
        <li>Scalability: [Requirements]</li>
      </ul>
      <h2>Acceptance Criteria</h2>
      <ul>
        <li>Criterion 1</li>
        <li>Criterion 2</li>
      </ul>
    `,
  },
  {
    id: 'decision',
    title: 'Decision Document',
    description: 'Document important decisions and rationale',
    icon: Target,
    content: `
      <h1>Decision Document</h1>
      <p><strong>Status:</strong> [Proposed/Accepted/Deprecated]</p>
      <p><strong>Date:</strong> [Date]</p>
      <p><strong>Decision Makers:</strong> [Names]</p>
      <h2>Context</h2>
      <p>[Describe the context and background for this decision]</p>
      <h2>Problem Statement</h2>
      <p>[What problem are we trying to solve?]</p>
      <h2>Options Considered</h2>
      <h3>Option 1: [Name]</h3>
      <p><strong>Pros:</strong></p>
      <ul><li>Pro 1</li></ul>
      <p><strong>Cons:</strong></p>
      <ul><li>Con 1</li></ul>
      <h3>Option 2: [Name]</h3>
      <p><strong>Pros:</strong></p>
      <ul><li>Pro 1</li></ul>
      <p><strong>Cons:</strong></p>
      <ul><li>Con 1</li></ul>
      <h2>Decision</h2>
      <p>[The decision that was made]</p>
      <h2>Rationale</h2>
      <p>[Why this decision was made]</p>
      <h2>Consequences</h2>
      <p>[What are the implications of this decision?]</p>
    `,
  },
  {
    id: 'retrospective',
    title: 'Retrospective',
    description: 'Sprint or project retrospective',
    icon: Lightbulb,
    content: `
      <h1>Retrospective</h1>
      <p><strong>Sprint/Project:</strong> [Name]</p>
      <p><strong>Date:</strong> [Date]</p>
      <p><strong>Participants:</strong> [Names]</p>
      <h2>What Went Well 🎉</h2>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
      <h2>What Could Be Improved 🔧</h2>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
      <h2>Action Items 📋</h2>
      <table>
        <tr><th>Action</th><th>Owner</th><th>Due Date</th></tr>
        <tr><td>[Action item]</td><td>[Name]</td><td>[Date]</td></tr>
      </table>
      <h2>Key Learnings 💡</h2>
      <ul>
        <li>Learning 1</li>
        <li>Learning 2</li>
      </ul>
    `,
  },
  {
    id: 'how-to',
    title: 'How-To Guide',
    description: 'Step-by-step instructional guide',
    icon: BookOpen,
    content: `
      <h1>How-To Guide: [Topic]</h1>
      <h2>Overview</h2>
      <p>[Brief description of what this guide covers]</p>
      <h2>Prerequisites</h2>
      <ul>
        <li>Prerequisite 1</li>
        <li>Prerequisite 2</li>
      </ul>
      <h2>Steps</h2>
      <h3>Step 1: [Title]</h3>
      <p>[Description of step 1]</p>
      <h3>Step 2: [Title]</h3>
      <p>[Description of step 2]</p>
      <h3>Step 3: [Title]</h3>
      <p>[Description of step 3]</p>
      <h2>Tips & Best Practices</h2>
      <ul>
        <li>Tip 1</li>
        <li>Tip 2</li>
      </ul>
      <h2>Troubleshooting</h2>
      <p><strong>Issue:</strong> [Common issue]</p>
      <p><strong>Solution:</strong> [How to resolve]</p>
      <h2>Related Resources</h2>
      <ul>
        <li><a href="#">Resource 1</a></li>
        <li><a href="#">Resource 2</a></li>
      </ul>
    `,
  },
];

export function DocumentTemplates({
  open,
  onOpenChange,
  onSelectTemplate
}: DocumentTemplatesProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-brand-gold transition-colors"
                onClick={() => {
                  onSelectTemplate(template.content, template.title);
                  onOpenChange(false);
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-md bg-brand-gold/10">
                      <Icon className="h-5 w-5 text-brand-gold" />
                    </div>
                  </div>
                  <CardTitle className="text-sm">{template.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs">
                    {template.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
