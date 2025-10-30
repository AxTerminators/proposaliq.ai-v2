import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, CreditCard, FileText, Brain, Lock, Activity, BarChart3, UserCog, Workflow, Mail, MessageSquare, Settings, Palette, Bell, Calendar } from "lucide-react";

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
import ClientPortalAdminModule from "../components/admin/ClientPortalAdminModule";
import EmailNotificationsModule from "../components/admin/EmailNotificationsModule";
import CalendarIntegrationModule from "../components/admin/CalendarIntegrationModule";
import AnalyticsDashboardModule from "../components/admin/AnalyticsDashboardModule";

export default function AdminPortal() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

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

  // Admin modules organized by category
  const coreModules = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, component: AnalyticsDashboardModule },
    { id: "subscribers", label: "Users", icon: Users, component: SubscribersModule },
    { id: "billing", label: "Billing", icon: CreditCard, component: BillingModule },
    { id: "roles", label: "Roles", icon: UserCog, component: RolesModule },
  ];

  const clientFeatures = [
    { id: "client-portal", label: "Client Portal", icon: Palette, component: ClientPortalAdminModule },
    { id: "email-notifications", label: "Email System", icon: Bell, component: EmailNotificationsModule },
    { id: "calendar-integration", label: "Calendar Sync", icon: Calendar, component: CalendarIntegrationModule },
  ];

  const contentAndAI = [
    { id: "content", label: "Content", icon: FileText, component: ContentLibraryModule },
    { id: "ai", label: "AI Config", icon: Brain, component: AIConfigModule },
    { id: "workflows", label: "Workflows", icon: Workflow, component: WorkflowModule },
  ];

  const systemModules = [
    { id: "security", label: "Security", icon: Lock, component: SecurityModule },
    { id: "audit", label: "Audit Logs", icon: Shield, component: AuditLogModule },
    { id: "health", label: "System Health", icon: Activity, component: SystemHealthModule },
  ];

  const engagementModules = [
    { id: "reports", label: "Reports", icon: BarChart3, component: ReportsModule },
    { id: "marketing", label: "Marketing", icon: Mail, component: MarketingModule },
    { id: "feedback", label: "Feedback", icon: MessageSquare, component: FeedbackModule },
    { id: "onboarding", label: "Onboarding", icon: Mail, component: OnboardingEmailModule },
  ];

  const allModules = [
    ...coreModules,
    ...clientFeatures,
    ...contentAndAI,
    ...systemModules,
    ...engagementModules
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Shield className="w-8 h-8 text-red-600" />
                Admin Portal
              </h1>
              <p className="text-slate-600 mt-1">Complete system administration and configuration</p>
            </div>
            <Badge className="bg-red-100 text-red-700 px-4 py-2">
              <Shield className="w-3 h-3 mr-1" />
              {currentUser.admin_role || "Admin"}
            </Badge>
          </div>
        </div>

        {/* Main Admin Interface */}
        <Card className="border-none shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Horizontal Scrollable Tab Navigation */}
            <div className="border-b bg-slate-50 overflow-x-auto">
              <TabsList className="flex flex-nowrap h-auto bg-transparent p-2 gap-1 min-w-max">
                {/* Core Section */}
                <div className="flex gap-1 border-r pr-2 mr-2">
                  {coreModules.map((module) => {
                    const Icon = module.icon;
                    return (
                      <TabsTrigger
                        key={module.id}
                        value={module.id}
                        className="flex items-center gap-2 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{module.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </div>

                {/* Client Features Section */}
                <div className="flex gap-1 border-r pr-2 mr-2">
                  <div className="flex items-center px-2 text-xs font-semibold text-slate-500">
                    CLIENT FEATURES
                  </div>
                  {clientFeatures.map((module) => {
                    const Icon = module.icon;
                    return (
                      <TabsTrigger
                        key={module.id}
                        value={module.id}
                        className="flex items-center gap-2 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{module.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </div>

                {/* Content & AI Section */}
                <div className="flex gap-1 border-r pr-2 mr-2">
                  <div className="flex items-center px-2 text-xs font-semibold text-slate-500">
                    CONTENT & AI
                  </div>
                  {contentAndAI.map((module) => {
                    const Icon = module.icon;
                    return (
                      <TabsTrigger
                        key={module.id}
                        value={module.id}
                        className="flex items-center gap-2 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{module.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </div>

                {/* System Section */}
                <div className="flex gap-1 border-r pr-2 mr-2">
                  <div className="flex items-center px-2 text-xs font-semibold text-slate-500">
                    SYSTEM
                  </div>
                  {systemModules.map((module) => {
                    const Icon = module.icon;
                    return (
                      <TabsTrigger
                        key={module.id}
                        value={module.id}
                        className="flex items-center gap-2 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{module.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </div>

                {/* Engagement Section */}
                <div className="flex gap-1">
                  <div className="flex items-center px-2 text-xs font-semibold text-slate-500">
                    ENGAGEMENT
                  </div>
                  {engagementModules.map((module) => {
                    const Icon = module.icon;
                    return (
                      <TabsTrigger
                        key={module.id}
                        value={module.id}
                        className="flex items-center gap-2 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{module.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </div>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {allModules.map((module) => {
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
      </div>
    </div>
  );
}