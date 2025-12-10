import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export function ListView() {
  return (
    <div className="h-full overflow-auto p-4">
      <div className="text-center py-12 text-muted-foreground">
        <p>List View - Coming Soon</p>
        <p className="text-sm mt-2">Table with Type, Key, Summary, Status, Comments, Assignee, Due date, Priority, Labels, Created, Updated, Reporter columns</p>
      </div>
    </div>
  );
}

export function AllWorkView() {
  return (
    <div className="h-full overflow-auto p-4">
      <div className="text-center py-12 text-muted-foreground">
        <p>All Work View - Coming Soon</p>
        <p className="text-sm mt-2">Basic/JQL mode toggle, filters, saved filters, hierarchy toggle</p>
      </div>
    </div>
  );
}

export function ReleasesView() {
  const navigate = useNavigate();
  const { projectKey } = useParams();
  
  return (
    <div className="h-full overflow-auto p-4">
      <div className="text-center py-12 text-muted-foreground">
        <p>Releases View - Coming Soon</p>
        <p className="text-sm mt-2">Release versions list with status, progress, dates</p>
      </div>
    </div>
  );
}

export function ReleaseDetailsView() {
  return (
    <div className="h-full overflow-auto p-4">
      <div className="text-center py-12 text-muted-foreground">
        <p>Release Details View - Coming Soon</p>
        <p className="text-sm mt-2">Release details with work items, side panel</p>
      </div>
    </div>
  );
}
