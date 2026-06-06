import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PragmaticBoard } from '@/components/kanban/PragmaticBoard';

const meta: Meta = {
  title: 'Enterprise Components/Kanban Board',
  parameters: { layout: 'fullscreen' },
};
export default meta;

export const Default: StoryObj = {
  render: () => (
    <div style={{ height: 600, padding: 16 }}>
      <PragmaticBoard
        projectKey="BAU"
        columns={[
          { id: 'todo', title: 'To Do', statusCategory: 'new' },
          { id: 'inprog', title: 'In Progress', statusCategory: 'indeterminate' },
          { id: 'done', title: 'Done', statusCategory: 'done' },
        ] as any}
        issues={[]}
        onOpenDetail={fn()}
        onStatusChange={fn()}
      />
    </div>
  ),
};
