import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, Zap, CheckCircle } from "lucide-react";
import { format, addWeeks } from "date-fns";

export default function PIWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    portfolioId: "",
    startDate: "",
    durationWeeks: "12",
    iterationCount: "5",
    iterationLength: "2",
  });

  const { data: portfolios } = useQuery({
    queryKey: ["portfolios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolios")
        .select("*")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: programs } = useQuery({
    queryKey: ["programs", formData.portfolioId],
    queryFn: async () => {
      if (!formData.portfolioId) return [];
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("portfolio_id", formData.portfolioId)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!formData.portfolioId,
  });

  const { data: teams } = useQuery({
    queryKey: ["teams", formData.portfolioId],
    queryFn: async () => {
      if (!formData.portfolioId) return [];
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          programs!inner(portfolio_id)
        `)
        .eq("programs.portfolio_id", formData.portfolioId)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!formData.portfolioId,
  });

  const createPIMutation = useMutation({
    mutationFn: async () => {
      const startDate = new Date(formData.startDate);
      const endDate = addWeeks(startDate, parseInt(formData.durationWeeks));

      // Create PI
      const { data: pi, error: piError } = await supabase
        .from("program_increments")
        .insert({
          name: formData.name,
          portfolio_id: formData.portfolioId,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          state: "planned",
        })
        .select()
        .single();

      if (piError) throw piError;

      // Create iterations
      const iterationCount = parseInt(formData.iterationCount);
      const iterationLength = parseInt(formData.iterationLength);
      const iterations = [];

      for (let i = 0; i < iterationCount; i++) {
        const iterStart = addWeeks(startDate, i * iterationLength);
        const iterEnd = addWeeks(iterStart, iterationLength);
        iterations.push({
          name: `${formData.name} - Iteration ${i + 1}`,
          pi_id: pi.id,
          start_date: format(iterStart, "yyyy-MM-dd"),
          end_date: format(iterEnd, "yyyy-MM-dd"),
        });
      }

      const { error: iterError } = await supabase
        .from("iterations")
        .insert(iterations);

      if (iterError) throw iterError;

      return pi;
    },
    onSuccess: () => {
      toast({
        title: "PI Created Successfully",
        description: "Program Increment and iterations have been created.",
      });
      queryClient.invalidateQueries({ queryKey: ["program-increments"] });
      navigate("/program-increments");
    },
    onError: (error) => {
      toast({
        title: "Error Creating PI",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === 1 && (!formData.name || !formData.portfolioId || !formData.startDate)) {
      toast({
        title: "Required Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = () => {
    createPIMutation.mutate();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">PI Name *</Label>
              <Input
                id="name"
                placeholder="e.g., PI 2024 Q1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="portfolio">Portfolio *</Label>
              <Select
                value={formData.portfolioId}
                onValueChange={(value) => setFormData({ ...formData, portfolioId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select portfolio" />
                </SelectTrigger>
                <SelectContent>
                  {portfolios?.map((portfolio) => (
                    <SelectItem key={portfolio.id} value={portfolio.id}>
                      {portfolio.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="durationWeeks">PI Duration (weeks)</Label>
              <Select
                value={formData.durationWeeks}
                onValueChange={(value) => setFormData({ ...formData, durationWeeks: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8 weeks</SelectItem>
                  <SelectItem value="10">10 weeks</SelectItem>
                  <SelectItem value="12">12 weeks (Standard)</SelectItem>
                  <SelectItem value="16">16 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="iterationCount">Number of Iterations</Label>
              <Select
                value={formData.iterationCount}
                onValueChange={(value) => setFormData({ ...formData, iterationCount: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 iterations</SelectItem>
                  <SelectItem value="5">5 iterations (Standard)</SelectItem>
                  <SelectItem value="6">6 iterations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="iterationLength">Iteration Length (weeks)</Label>
              <Select
                value={formData.iterationLength}
                onValueChange={(value) => setFormData({ ...formData, iterationLength: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 week</SelectItem>
                  <SelectItem value="2">2 weeks (Standard)</SelectItem>
                  <SelectItem value="3">3 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <h4 className="font-semibold">PI Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{formData.name}</span>
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{formData.durationWeeks} weeks</span>
                <span className="text-muted-foreground">Iterations:</span>
                <span className="font-medium">{formData.iterationCount}</span>
                <span className="text-muted-foreground">Programs:</span>
                <span className="font-medium">{programs?.length || 0}</span>
                <span className="text-muted-foreground">Teams:</span>
                <span className="font-medium">{teams?.length || 0}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Click "Create PI" to generate the Program Increment with all iterations.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const steps = [
    { number: 1, title: "Basic Info", icon: Calendar },
    { number: 2, title: "Cadence", icon: Zap },
    { number: 3, title: "Review", icon: CheckCircle },
  ];

  return (
    <AdminGuard>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">PI Creation Wizard</h1>
          <p className="text-muted-foreground mt-1">
            Create a new Program Increment with automated iteration setup
          </p>
        </div>

        <div className="flex justify-between mb-8">
          {steps.map((s, index) => (
            <div key={s.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    step >= s.number ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <s.icon className="h-6 w-6" />
                </div>
                <span className="text-sm mt-2">{s.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 ${step > s.number ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Step {step}: {steps[step - 1].title}</CardTitle>
            <CardDescription>
              {step === 1 && "Enter basic PI information"}
              {step === 2 && "Configure PI cadence and iterations"}
              {step === 3 && "Review and create"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStep()}

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
              >
                Back
              </Button>
              {step < 3 ? (
                <Button onClick={handleNext}>Next</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={createPIMutation.isPending}>
                  {createPIMutation.isPending ? "Creating..." : "Create PI"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}