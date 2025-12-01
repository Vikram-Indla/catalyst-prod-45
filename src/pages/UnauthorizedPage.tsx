import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-2xl border-destructive/50">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-destructive/10">
                <Lock className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground">Access Denied</CardTitle>
            <CardDescription className="text-base text-muted-foreground mt-2">
              You don't have permission to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-sm text-muted-foreground">
              This page requires specific permissions that your current role doesn't have. 
              Please contact your administrator if you believe you should have access.
            </p>
            <Button 
              onClick={() => navigate('/home')}
              className="bg-brand-gold hover:bg-brand-gold/90 text-background"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
