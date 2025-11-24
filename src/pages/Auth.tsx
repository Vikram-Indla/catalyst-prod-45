import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signUpForm, setSignUpForm] = useState({ email: '', password: '', fullName: '' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateSignIn = () => {
    const newErrors: { [key: string]: string } = {};
    
    try {
      emailSchema.parse(signInForm.email);
    } catch {
      newErrors.signInEmail = 'Invalid email address';
    }
    
    try {
      passwordSchema.parse(signInForm.password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.signInPassword = e.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignUp = () => {
    const newErrors: { [key: string]: string } = {};
    
    try {
      emailSchema.parse(signUpForm.email);
    } catch {
      newErrors.signUpEmail = 'Invalid email address';
    }
    
    try {
      passwordSchema.parse(signUpForm.password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.signUpPassword = e.errors[0].message;
      }
    }
    
    if (!signUpForm.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignIn()) return;
    
    setIsLoading(true);
    const { error } = await signIn(signInForm.email, signInForm.password);
    setIsLoading(false);
    
    if (!error) {
      navigate('/portfolio-room');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignUp()) return;
    
    setIsLoading(true);
    const { error } = await signUp(signUpForm.email, signUpForm.password, signUpForm.fullName);
    setIsLoading(false);
    
    if (!error) {
      setSignUpForm({ email: '', password: '', fullName: '' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Catalyst Platform</CardTitle>
          <CardDescription>Enterprise Agile Management</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="name@company.com"
                    value={signInForm.email}
                    onChange={(e) => setSignInForm({ ...signInForm, email: e.target.value })}
                    required
                  />
                  {errors.signInEmail && (
                    <p className="text-sm text-destructive">{errors.signInEmail}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={signInForm.password}
                    onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })}
                    required
                  />
                  {errors.signInPassword && (
                    <p className="text-sm text-destructive">{errors.signInPassword}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signUpForm.fullName}
                    onChange={(e) => setSignUpForm({ ...signUpForm, fullName: e.target.value })}
                    required
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@company.com"
                    value={signUpForm.email}
                    onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })}
                    required
                  />
                  {errors.signUpEmail && (
                    <p className="text-sm text-destructive">{errors.signUpEmail}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={signUpForm.password}
                    onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })}
                    required
                  />
                  {errors.signUpPassword && (
                    <p className="text-sm text-destructive">{errors.signUpPassword}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground text-center">
          <p className="w-full">
            Auto-confirm is enabled for testing. Production deployments should verify emails.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
