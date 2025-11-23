import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Sparkles, Zap, Users, Globe, ChartBar, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const ROADMAP_ITEMS = [
  {
    category: "Core Platform",
    icon: Zap,
    color: "text-blue-600",
    items: [
      { name: "Enhanced RAG System", status: "completed", quarter: "Q4 2024" },
      { name: "Dynamic Modal Builder", status: "completed", quarter: "Q4 2024" },
      { name: "Multi-Board Kanban Workflow", status: "completed", quarter: "Q4 2024" },
      { name: "Performance Optimization", status: "in_progress", quarter: "Q1 2025" },
      { name: "Mobile-First Redesign", status: "planned", quarter: "Q1 2025" },
    ]
  },
  {
    category: "AI Features",
    icon: Sparkles,
    color: "text-purple-600",
    items: [
      { name: "AI Writing Assistant", status: "completed", quarter: "Q4 2024" },
      { name: "Smart Content Suggestions", status: "completed", quarter: "Q4 2024" },
      { name: "Predictive Analytics", status: "in_progress", quarter: "Q1 2025" },
      { name: "Advanced Citation System", status: "planned", quarter: "Q2 2025" },
      { name: "Multi-Language Support", status: "planned", quarter: "Q2 2025" },
    ]
  },
  {
    category: "Client Portal",
    icon: Users,
    color: "text-green-600",
    items: [
      { name: "Basic Client Portal", status: "completed", quarter: "Q4 2024" },
      { name: "Data Call System", status: "completed", quarter: "Q4 2024" },
      { name: "Client Feedback Workflow", status: "in_progress", quarter: "Q1 2025" },
      { name: "Custom Branding", status: "planned", quarter: "Q1 2025" },
      { name: "White Label Options", status: "planned", quarter: "Q2 2025" },
    ]
  },
  {
    category: "Integrations",
    icon: Globe,
    color: "text-orange-600",
    items: [
      { name: "SAM.gov Integration", status: "beta", quarter: "Q4 2024" },
      { name: "Calendar Sync (Google/Outlook)", status: "planned", quarter: "Q1 2025" },
      { name: "Document Management (Box/Dropbox)", status: "planned", quarter: "Q2 2025" },
      { name: "CRM Integration (Salesforce)", status: "planned", quarter: "Q2 2025" },
    ]
  },
  {
    category: "Analytics & Reporting",
    icon: ChartBar,
    color: "text-indigo-600",
    items: [
      { name: "Basic Pipeline Analytics", status: "completed", quarter: "Q4 2024" },
      { name: "Win/Loss Analysis", status: "in_progress", quarter: "Q1 2025" },
      { name: "Custom Report Builder", status: "planned", quarter: "Q1 2025" },
      { name: "Predictive Win Rates", status: "planned", quarter: "Q2 2025" },
    ]
  },
  {
    category: "Enterprise Features",
    icon: Shield,
    color: "text-red-600",
    items: [
      { name: "Multi-Organization Support", status: "completed", quarter: "Q4 2024" },
      { name: "Advanced Permissions", status: "in_progress", quarter: "Q1 2025" },
      { name: "SSO/SAML Integration", status: "planned", quarter: "Q2 2025" },
      { name: "Audit Logging", status: "planned", quarter: "Q2 2025" },
      { name: "API Access", status: "planned", quarter: "Q3 2025" },
    ]
  }
];

const STATUS_CONFIG = {
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Clock },
  beta: { label: "Beta", color: "bg-purple-100 text-purple-700", icon: Sparkles },
  planned: { label: "Planned", color: "bg-slate-100 text-slate-700", icon: Clock },
};

export default function ProductRoadmap() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Product Roadmap</h1>
          <p className="text-slate-600">
            Our vision for building the world's best government proposal platform
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const count = ROADMAP_ITEMS.reduce(
              (sum, category) => sum + category.items.filter(item => item.status === status).length,
              0
            );
            const Icon = config.icon;
            return (
              <Card key={status} className="border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">{config.label}</p>
                      <p className="text-3xl font-bold text-slate-900">{count}</p>
                    </div>
                    <Icon className="w-10 h-10 text-slate-400" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Roadmap Categories */}
        <div className="space-y-6">
          {ROADMAP_ITEMS.map((category) => {
            const CategoryIcon = category.icon;
            return (
              <Card key={category.category} className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <CategoryIcon className={cn("w-6 h-6", category.color)} />
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {category.items.map((item) => {
                      const statusConfig = STATUS_CONFIG[item.status];
                      const StatusIcon = statusConfig.icon;
                      return (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <StatusIcon className={cn("w-5 h-5", statusConfig.color.split(' ')[1])} />
                            <div>
                              <p className="font-medium text-slate-900">{item.name}</p>
                              <p className="text-sm text-slate-600">{item.quarter}</p>
                            </div>
                          </div>
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer Note */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> This roadmap is subject to change based on customer feedback and business priorities. 
              We're committed to building features that deliver real value to government contractors.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}