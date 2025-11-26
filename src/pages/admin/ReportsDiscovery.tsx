import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Search, BarChart3, LineChart, PieChart, Table2, PlayCircle } from "lucide-react";

const defaultReports = [
  {
    name: "PI Predictability",
    description: "Track planned vs actual business value delivery across PIs",
    category: "predictability",
    report_type: "chart",
    icon: LineChart,
  },
  {
    name: "Feature Flow Metrics",
    description: "Cycle time, lead time, and throughput analysis",
    category: "flow",
    report_type: "dashboard",
    icon: BarChart3,
  },
  {
    name: "Team Velocity Trends",
    description: "Sprint velocity and capacity utilization over time",
    category: "execution",
    report_type: "chart",
    icon: LineChart,
  },
  {
    name: "Dependency Risk Analysis",
    description: "Critical path and cross-team dependency impact",
    category: "planning",
    report_type: "table",
    icon: Table2,
  },
  {
    name: "WSJF Prioritization",
    description: "Weighted Shortest Job First scoring distribution",
    category: "planning",
    report_type: "chart",
    icon: PieChart,
  },
  {
    name: "Epic Progress Dashboard",
    description: "Real-time epic completion and health status",
    category: "execution",
    report_type: "dashboard",
    icon: BarChart3,
  },
  {
    name: "Commitment Reliability",
    description: "Team and program commitment vs delivery rates",
    category: "predictability",
    report_type: "chart",
    icon: LineChart,
  },
  {
    name: "Blocker Analysis",
    description: "Blocked features, impact, and resolution time",
    category: "execution",
    report_type: "table",
    icon: Table2,
  },
];

export default function ReportsDiscovery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: customReports } = useQuery({
    queryKey: ["report-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_definitions")
        .select("*")
        .eq("enabled", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const allReports = [...defaultReports, ...(customReports || [])];

  const filteredReports = allReports.filter((report) => {
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || report.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: "all", label: "All Reports" },
    { value: "planning", label: "Planning" },
    { value: "execution", label: "Execution" },
    { value: "predictability", label: "Predictability" },
    { value: "flow", label: "Flow Metrics" },
  ];

  const renderReportIcon = (reportType: string) => {
    switch (reportType) {
      case "chart":
        return <LineChart className="h-6 w-6" />;
      case "table":
        return <Table2 className="h-6 w-6" />;
      case "dashboard":
        return <BarChart3 className="h-6 w-6" />;
      default:
        return <PieChart className="h-6 w-6" />;
    }
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports Discovery</h1>
          <p className="text-muted-foreground mt-1">
            Explore and run SAFe-aligned reports and analytics
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList>
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map((report, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          {renderReportIcon(report.report_type)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{report.name}</CardTitle>
                          <Badge variant="secondary" className="mt-1">
                            {report.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {report.description}
                    </CardDescription>
                    <Button className="w-full" size="sm">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Run Report
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredReports.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No reports found matching your criteria</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminGuard>
  );
}