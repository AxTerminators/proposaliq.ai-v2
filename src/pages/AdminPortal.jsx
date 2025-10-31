
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, CreditCard, FileText, Brain, Lock, Activity, BarChart3, UserCog, Workflow, Mail, MessageSquare, Calendar as CalendarIcon, Eye, Globe, AlertCircle } from "lucide-react";

import SubscribersModule from "../components/admin/SubscribersModule";
import AuditLogModule from "../components/admin/AuditLogModule";
import BillingModule from "../components/admin/BillingModule";
import AIConfigModule from "../components/admin/AIConfigModule";
import ContentLibraryModule from "../components/admin/ContentLibraryModule";
import SecurityModule from "../components/admin/SecurityModule";
import SystemHealthModule from "../components/admin/SystemHealthModule";
import ReportsModule from "../components/admin/ReportsModule";
import RolesModule from "../components/admin/RolesModule";
import WorkflowModule from "../components/admin/WorkflowModule";
import MarketingModule from "../components/admin/MarketingModule";
import FeedbackModule from "../components/admin/FeedbackModule";
import OnboardingEmailModule from "../components/admin/OnboardingEmailModule";
import ClientManagementModule from "../components/admin/ClientManagementModule";
import GlobalProposalManagementModule from "../components/admin/GlobalProposalManagementModule";
import GlobalCalendarModule from "../components/admin/GlobalCalendarModule";
import EnhancedEmailTemplateModule from "../components/admin/EnhancedEmailTemplateModule";
import GlobalReportingModule from "../components/admin/GlobalReportingModule";

import AnalyticsDashboard from "../components/admin/AnalyticsDashboard";
import ErrorMonitoringDashboard from "../components/admin/ErrorMonitoringDashboard";

export default function AdminPortal() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (err) {
        console.error("Error loading user:", err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-6">You don't have permission to access the Admin Portal.</p>
        </div>
      </div>
    );
  }

  // Admin modules - organized by category
  const modules = [
    // Overview & Analytics
    { id: "overview", label: "Overview", icon: BarChart3, component: GlobalReportingModule, category: "analytics" },
    { id: "analytics", label: "Analytics", icon: BarChart3, component: AnalyticsDashboard, category: "analytics" },
    { id: "error-monitoring", label: "Error Monitor", icon: AlertCircle, component: ErrorMonitoringDashboard, category: "analytics" },
    { id: "reports", label: "Reports", icon: BarChart3, component: ReportsModule, category: "analytics" },
    
    // User & Client Management
    { id: "subscribers", label: "Users", icon: Users, component: SubscribersModule, category: "management" },
    { id: "clients", label: "Clients", icon: Eye, component: ClientManagementModule, category: "management" },
    { id: "roles", label: "Roles", icon: UserCog, component: RolesModule, category: "management" },
    
    // Content & Communication
    { id: "proposals", label: "Proposals", icon: FileText, component: GlobalProposalManagementModule, category: "content" },
    { id: "calendar", label: "Calendar", icon: CalendarIcon, component: GlobalCalendarModule, category: "content" },
    { id: "content", label: "Content Library", icon: FileText, component: ContentLibraryModule, category: "content" },
    { id: "email-templates", label: "Email Templates", icon: Mail, component: EnhancedEmailTemplateModule, category: "content" },
    { id: "onboarding", label: "Onboarding", icon: Mail, component: OnboardingEmailModule, category: "content" },
    
    // System & Configuration
    { id: "billing", label: "Billing", icon: CreditCard, component: BillingModule, category: "system" },
    { id: "ai", label: "AI Config", icon: Brain, component: AIConfigModule, category: "system" },
    { id: "workflows", label: "Workflows", icon: Workflow, component: WorkflowModule, category: "system" },
    { id: "marketing", label: "Marketing", icon: Globe, component: MarketingModule, category: "system" },
    
    // Security & Monitoring
    { id: "security", label: "Security", icon: Lock, component: SecurityModule, category: "security" },
    { id: "audit", label: "Audit Logs", icon: Shield, component: AuditLogModule, category: "security" },
    { id: "health", label: "System Health", icon: Activity, component: SystemHealthModule, category: "security" },
    
    // Support
    { id: "feedback", label: "Feedback", icon: MessageSquare, component: FeedbackModule, category: "support" }
  ];

  const categories = [
    { id: "analytics", label: "Analytics & Reporting", color: "blue" },
    { id: "management", label: "User Management", color: "purple" },
    { id: "content", label: "Content & Communication", color: "green" },
    { id: "system", label: "System Configuration", color: "indigo" },
    { id: "security", label: "Security & Compliance", color: "red" },
    { id: "support", label: "Support", color: "amber" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Shield className="w-8 h-8 text-red-600" />
                Admin Portal
              </h1>
              <p className="text-slate-600 mt-1">Comprehensive platform administration and management</p>
            </div>
            <Badge className="bg-red-100 text-red-700">
              <Shield className="w-3 h-3 mr-1" />
              {currentUser.admin_role || "Admin"}
            </Badge>
          </div>
        </div>

        {/* Quick Stats Overview */}
        {activeTab === "overview" && (
          <div className="mb-6">
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="p-4 border-none shadow-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-2xl font-bold">Comprehensive</p>
                <p className="text-sm opacity-90">Admin Dashboard</p>
              </Card>

              <Card className="p-4 border-none shadow-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Eye className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-2xl font-bold">Client Portal</p>
                <p className="text-sm opacity-90">Management</p>
              </Card>

              <Card className="p-4 border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-2xl font-bold">Global</p>
                <p className="text-sm opacity-90">Proposal View</p>
              </Card>

              <Card className="p-4 border-none shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-2xl font-bold">Advanced</p>
                <p className="text-sm opacity-90">Analytics</p>
              </Card>
            </div>
          </div>
        )}

        {/* Categorized Navigation */}
        <Card className="border-none shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b bg-slate-50">
              <div className="px-4 py-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Navigation</p>
                <div className="overflow-x-auto">
                  <TabsList className="flex flex-wrap gap-1 bg-transparent h-auto justify-start">
                    {modules.map((module) => {
                      const Icon = module.icon;
                      const category = categories.find(c => c.id === module.category);
                      return (
                        <TabsTrigger
                          key={module.id}
                          value={module.id}
                          className="flex items-center gap-2 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-2"
                        >
                          <Icon className="w-4 h-4" />
                          <span className="hidden sm:inline">{module.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              </div>
            </div>

            <div className="p-6">
              {modules.map((module) => {
                const Component = module.component;
                return (
                  <TabsContent key={module.id} value={module.id} className="mt-0">
                    <Component currentUser={currentUser} />
                  </TabsContent>
                );
              })}
            </div>
          </Tabs>
        </Card>

        {/* Category Legend */}
        <Card className="mt-6 border-none shadow-lg">
          <div className="p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">Module Categories:</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => {
                const categoryModules = modules.filter(m => m.category === cat.id);
                return (
                  <Badge 
                    key={cat.id} 
                    variant="outline"
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => {
                      const firstModule = categoryModules[0];
                      if (firstModule) setActiveTab(firstModule.id);
                    }}
                  >
                    {cat.label} ({categoryModules.length})
                  </Badge>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
