import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ArrowRight, Briefcase, GitBranch, Users, BarChart3, Target, Shield } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/portfolio-room');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Catalyst Platform
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Enterprise Agile Management · Strategy to Execution
            </p>
            <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="p-6 rounded-lg border bg-card">
              <Briefcase className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Portfolio Management</h3>
              <p className="text-sm text-muted-foreground">
                Strategic themes, initiatives, and epics with full value stream traceability.
              </p>
            </div>
            
            <div className="p-6 rounded-lg border bg-card">
              <GitBranch className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Program Planning</h3>
              <p className="text-sm text-muted-foreground">
                PI planning, program boards, dependencies, and ROAM risk management.
              </p>
            </div>
            
            <div className="p-6 rounded-lg border bg-card">
              <Users className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Team Execution</h3>
              <p className="text-sm text-muted-foreground">
                Sprint boards, backlogs, stories, and real-time collaboration.
              </p>
            </div>
            
            <div className="p-6 rounded-lg border bg-card">
              <BarChart3 className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Insights & Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Predictability metrics, dependency risk, and portfolio insights.
              </p>
            </div>
            
            <div className="p-6 rounded-lg border bg-card">
              <Target className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">OKR Alignment</h3>
              <p className="text-sm text-muted-foreground">
                Objectives and key results cascaded from company to team level.
              </p>
            </div>
            
            <div className="p-6 rounded-lg border bg-card">
              <Shield className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Enterprise Security</h3>
              <p className="text-sm text-muted-foreground">
                Role-based permissions, audit logs, and secure data management.
              </p>
            </div>
          </div>

          {/* Architecture Highlights */}
          <div className="p-8 rounded-lg border bg-card/50 backdrop-blur">
            <h2 className="text-2xl font-bold mb-4">Built for Scale</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                <p><strong>5-Level Work Hierarchy:</strong> Theme → Epic → Feature → Story → Sub-task</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                <p><strong>4-Level Org Hierarchy:</strong> Portfolio → Program → Team</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                <p><strong>Guardrails:</strong> No Solution layer, no Capability layer - simplified yet powerful</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-primary mt-2" />
                <p><strong>Phase 1 MVP:</strong> Complete foundation with seed data ready to explore</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
