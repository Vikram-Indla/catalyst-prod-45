/**
 * Document Export Component
 * Source: https://support.atlassian.com/confluence-cloud/docs/export-content-from-confluence-cloud/
 * - Export to PDF or Word format
 * - Preserves document formatting
 */
import { useState } from 'react';
import { Download, FileText, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface DocumentExportProps {
  title: string;
  content: string;
}

export function DocumentExport({ title, content }: DocumentExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Convert HTML content to plain text for basic export
  const getPlainText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  // Export as HTML file (preserves formatting)
  const exportAsHTML = () => {
    setIsExporting(true);
    try {
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; }
    h1 { border-bottom: 2px solid #c69c6d; padding-bottom: 10px; }
    h2, h3 { color: #1a1a1a; }
    blockquote { border-left: 4px solid #c69c6d; margin: 1em 0; padding-left: 1em; color: #666; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #1a1a1a; color: #f8f8f8; padding: 16px; border-radius: 6px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f4f4f4; }
    .info-panel { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 12px 16px; margin: 1em 0; }
    .warning-panel { background: #fff3e0; border-left: 4px solid #ff9800; padding: 12px 16px; margin: 1em 0; }
    .note-panel { background: #f3e5f5; border-left: 4px solid #9c27b0; padding: 12px 16px; margin: 1em 0; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${content}
  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
    Exported from Catalyst Knowledge Hub on ${new Date().toLocaleDateString()}
  </footer>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Exported as HTML');
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Export as Markdown
  const exportAsMarkdown = () => {
    setIsExporting(true);
    try {
      // Basic HTML to Markdown conversion
      let markdown = content;
      
      // Convert common HTML elements
      markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
      markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
      markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
      markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
      markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
      markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
      markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
      markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
      markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
      markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
      markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
      markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
      markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
      markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n');
      markdown = markdown.replace(/<hr\s*\/?>/gi, '\n---\n');
      
      // Remove remaining HTML tags
      markdown = markdown.replace(/<[^>]+>/g, '');
      
      // Clean up whitespace
      markdown = markdown.replace(/\n{3,}/g, '\n\n');
      
      // Add title
      markdown = `# ${title}\n\n${markdown.trim()}\n\n---\n*Exported from Catalyst Knowledge Hub on ${new Date().toLocaleDateString()}*`;

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Exported as Markdown');
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Export as plain text
  const exportAsText = () => {
    setIsExporting(true);
    try {
      const plainText = `${title}\n${'='.repeat(title.length)}\n\n${getPlainText(content)}\n\n---\nExported from Catalyst Knowledge Hub on ${new Date().toLocaleDateString()}`;

      const blob = new Blob([plainText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Exported as Text');
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsHTML}>
          <FileText className="h-4 w-4 mr-2" />
          Export as HTML
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsMarkdown}>
          <File className="h-4 w-4 mr-2" />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsText}>
          <File className="h-4 w-4 mr-2" />
          Export as Plain Text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
