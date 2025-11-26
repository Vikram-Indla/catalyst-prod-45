import { useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function PlaceholderPage() {
  const location = useLocation();
  const pageName = location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Page';

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] p-8">
      <Card className="p-12 text-center max-w-md">
        <Construction className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-semibold mb-2 capitalize">{pageName}</h1>
        <p className="text-muted-foreground">
          Coming soon - This page is under construction
        </p>
      </Card>
    </div>
  );
}
