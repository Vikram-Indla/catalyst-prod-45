import React from 'react';
import { Eye, Copy, Trash2, Search, List, Grid } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const mockHistory = [
  { id: 'GEN-001', title: 'Document Management System', program: 'Digital Services Program', items: 20, epics: 2, features: 5, stories: 12, status: 'published', createdAt: 'Jan 10, 2026', createdBy: { name: 'Vikram Kumar', initials: 'VK' } },
  { id: 'GEN-002', title: 'API Gateway Implementation', program: 'Infrastructure Modernization', items: 15, epics: 1, features: 4, stories: 10, status: 'published', createdAt: 'Jan 9, 2026', createdBy: { name: 'Abdullah Alshammari', initials: 'AA' } },
  { id: 'GEN-003', title: 'Portal Redesign Requirements', program: 'Citizen Experience', items: 8, epics: 1, features: 2, stories: 5, status: 'draft', createdAt: 'Jan 8, 2026', createdBy: { name: 'Vikram Kumar', initials: 'VK' } },
  { id: 'GEN-004', title: 'Mobile App Authentication', program: 'Digital Services Program', items: 0, epics: 0, features: 0, stories: 0, status: 'failed', createdAt: 'Jan 7, 2026', createdBy: { name: 'Abdullah Alshammari', initials: 'AA' } },
];

export default function RequirementAssistHistory() {
  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-muted text-muted-foreground',
      published: 'bg-emerald-100 text-emerald-600',
      failed: 'bg-red-100 text-red-600',
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by title or ID..." className="pl-9" />
        </div>
        <Select defaultValue="">
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="">
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Programs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Programs</SelectItem>
            <SelectItem value="dsp">Digital Services Program</SelectItem>
            <SelectItem value="infra">Infrastructure Modernization</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border rounded-lg overflow-hidden ml-auto">
          <Button variant="ghost" size="sm" className="rounded-none bg-primary/10 text-primary"><List className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" className="rounded-none"><Grid className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-4">
        {[{ label: 'Total', count: 247 }, { label: 'Drafts', count: 12 }, { label: 'Published', count: 221 }, { label: 'Failed', count: 14 }].map((stat, i) => (
          <button key={i} className={cn("flex items-center gap-2 px-4 py-2 border rounded-full text-[13px] transition-colors", i === 0 ? "border-primary bg-primary/5 text-primary" : "hover:border-primary")}>
            <span>{stat.label}</span>
            <strong>{stat.count}</strong>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
              <th className="p-3.5 text-left font-semibold w-10"><input type="checkbox" /></th>
              <th className="p-3.5 text-left font-semibold">Title</th>
              <th className="p-3.5 text-left font-semibold w-44">Program</th>
              <th className="p-3.5 text-left font-semibold w-24">Items</th>
              <th className="p-3.5 text-left font-semibold w-28">Status</th>
              <th className="p-3.5 text-left font-semibold w-32">Created</th>
              <th className="p-3.5 text-left font-semibold w-40">Created By</th>
              <th className="p-3.5 text-left font-semibold w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockHistory.map(item => (
              <tr key={item.id} className="border-t hover:bg-muted/30 cursor-pointer">
                <td className="p-4"><input type="checkbox" /></td>
                <td className="p-4">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.id}</div>
                </td>
                <td className="p-4 text-sm">{item.program}</td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    <span>{item.items}</span>
                    {item.epics > 0 && <span className="w-2 h-2 rounded-full bg-violet-500" title={`${item.epics} Epics`} />}
                    {item.features > 0 && <span className="w-2 h-2 rounded-full bg-teal-500" title={`${item.features} Features`} />}
                    {item.stories > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500" title={`${item.stories} Stories`} />}
                  </div>
                </td>
                <td className="p-4">
                  <span className={cn("px-2.5 py-1 rounded text-xs font-medium capitalize", getStatusBadge(item.status))}>
                    {item.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-muted-foreground">{item.createdAt}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center text-white text-[11px] font-semibold">
                      {item.createdBy.initials}
                    </div>
                    <span className="text-sm">{item.createdBy.name}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm"><Copy className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between p-4 border-t bg-muted/30 text-sm text-muted-foreground">
          <span>Showing 1-4 of 247 generations</span>
          <div className="flex gap-1">
            {[1, 2, 3, '...', 62].map((p, i) => (
              <Button key={i} variant={p === 1 ? 'default' : 'outline'} size="sm" className="min-w-9">{p}</Button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
