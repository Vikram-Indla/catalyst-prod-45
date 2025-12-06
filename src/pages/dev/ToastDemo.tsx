import React from 'react';
import { useCatalystToastContext } from '@/contexts/CatalystToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ToastDemo = () => {
  const toast = useCatalystToastContext();

  const showInfoToast = () => {
    toast.info(
      'Added to starred',
      'Mining has been added to your starred items.',
      { label: 'View starred items', onClick: () => console.log('View starred clicked') }
    );
  };

  const showSuccessToast = () => {
    toast.success(
      'Business request created',
      'BR-2024-0156 has been successfully created and assigned.',
      { label: 'View request', onClick: () => console.log('View request clicked') }
    );
  };

  const showErrorToast = () => {
    toast.error(
      'Connection failed',
      'Unable to connect to the server. Check your network connection.',
      { label: 'Retry', onClick: () => console.log('Retry clicked') }
    );
  };

  const showWarningToast = () => {
    toast.warning(
      'Session expiring soon',
      'Your session will expire in 5 minutes. Save your work now.'
    );
  };

  const showMultipleToasts = () => {
    toast.success('Changes saved', 'Your changes have been saved successfully.');
    setTimeout(() => {
      toast.info('Notification', 'You have 3 new messages waiting.');
    }, 500);
    setTimeout(() => {
      toast.warning('Reminder', 'Don\'t forget to submit your timesheet.');
    }, 1000);
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Catalyst Toast Demo</h1>
        <p className="text-muted-foreground">Test the enterprise-grade toast notification system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Toast Types</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={showInfoToast} variant="outline">
            Info Toast (Star)
          </Button>
          <Button onClick={showSuccessToast} className="bg-green-600 hover:bg-green-700 text-white">
            Success Toast
          </Button>
          <Button onClick={showErrorToast} variant="destructive">
            Error Toast
          </Button>
          <Button onClick={showWarningToast} className="bg-amber-500 hover:bg-amber-600 text-white">
            Warning Toast
          </Button>
          <Button onClick={showMultipleToasts} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
            Multiple Toasts
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Auto-dismiss after 5 seconds (configurable)</li>
            <li>Pause on hover - timer stops when you hover over the toast</li>
            <li>Optional action buttons with hover effects</li>
            <li>Left accent bar with gradient matching toast type</li>
            <li>Icon container with type-specific colors</li>
            <li>Accessible with proper ARIA attributes</li>
            <li>RTL support for Arabic layouts</li>
            <li>Respects prefers-reduced-motion</li>
            <li>Max 5 toasts visible (oldest dismissed first)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ToastDemo;
