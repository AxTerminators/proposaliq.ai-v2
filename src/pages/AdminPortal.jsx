
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Users,
  FileText,
  Activity,
  CreditCard,
  Brain,
  Lock,
  Settings,
  TrendingUp,
  MessageSquare,
  Mail,
  UserCog,
  Zap,
  BarChart3,
  Building2,
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

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
import AnalyticsDashboard from "./AnalyticsDashboard";
import ErrorMonitoringDashboard from "./ErrorMonitoringDashboard";
import AdminPagesModule from "../components/admin/AdminPagesModule"; // Added this import

export default function AdminPortal() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get initial tab from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

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

  const modules = [
    { id: "admin-pages", label: "Admin Pages", icon: FileText, category: "admin", component: AdminPagesModule }, // Added this module
    { id: "analytics", label: "Analytics", icon: Activity, category: "analytics", component: AnalyticsDashboard },
    { id: "error-monitoring", label: "Error Monitor", icon: TrendingUp, category: "analytics", component: ErrorMonitoringDashboard },
    { id: "overview", label: "Overview", icon: BarChart3, category: "analytics", component: GlobalReportingModule },
    { id: "reports", label: "Reports", icon: BarChart3, category: "analytics", component: ReportsModule },

    { id: "subscribers", label: "Users", icon: Users, category: "management", component: SubscribersModule },
    { id: "clients", label: "Clients", icon: Building2, category: "management", component: ClientManagementModule },
    { id: "roles", label: "Roles", icon: UserCog, category: "management", component: RolesModule },

    { id: "proposals", label: "Proposals", icon: FileText, category: "content", component: GlobalProposalManagementModule },
    { id: "calendar", label: "Calendar", icon: Calendar, category: "content", component: GlobalCalendarModule },
    { id: "content", label: "Content Library", icon: FileText, category: "content", component: ContentLibraryModule },
    { id: "email-templates", label: "Email Templates", icon: Mail, category: "content", component: EnhancedEmailTemplateModule },
    { id: "onboarding", label: "Onboarding", icon: Mail, category: "content", component: OnboardingEmailModule },

    { id: "billing", label: "Billing", icon: CreditCard, category: "system", component: BillingModule },
    { id: "ai", label: "AI Config", icon: Brain, category: "system", component: AIConfigModule },
    { id: "workflows", label: "Workflows", icon: Zap, category: "system", component: WorkflowModule },
    { id: "marketing", label: "Marketing", icon: TrendingUp, category: "system", component: MarketingModule },

    { id: "security", label: "Security", icon: Lock, category: "security", component: SecurityModule },
    { id: "audit", label: "Audit Logs", icon: Shield, category: "security", component: AuditLogModule },
    { id: "health", label: "System Health", icon: Settings, category: "security", component: SystemHealthModule },

    { id: "feedback", label: "Feedback", icon: MessageSquare, category: "support", component: FeedbackModule }
  ];

  const categories = [
    { id: "admin", label: "Admin Tools", color: "purple" }, // Added this category
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

        {activeTab === "analytics" && (
          <div className="mb-6">
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="p-4 border-none shadow-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-2xl font-bold">User Analytics</p>
                <p className="text-sm opacity-90">Track behavior</p>
              </Card>

              <Card className="p-4 border-none shadow-lg bg-gradient-to-br from-red-500 to-orange-500 text-white">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-2xl font-bold">Error Monitor</p>
                <p className="text-sm opacity-90">Track issues</p>
              </Card>

              <Card className="p-4 border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-2xl font-bold">Advanced Reports</p>
                <p className="text-sm opacity-90">Deep insights</p>
              </Card>

              <Card className="p-4 border-none shadow-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Building2 className="w-8 h-8 opacity-80" />
                </div>
                <p className="text-2xl font-bold">Real-time Data</p>
                <p className="text-sm opacity-90">Live monitoring</p>
              </Card>
            </div>
          </div>
        )}

        <Card className="border-none shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b bg-slate-50">
              <div className="px-4 py-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Navigation</p>
                <div className="overflow-x-auto">
                  <TabsList className="flex flex-wrap gap-1 bg-transparent h-auto justify-start">
                    {modules.map((module) => {
                      const Icon = module.icon;
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
