import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  PermissionChecker, 
  hasPermission, 
  hasAnyPermission,
  getRoleLabel 
} from "../components/admin/PermissionChecker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  CreditCard, 
  FileText, 
  Shield, 
  Activity,
  BarChart3,
  Brain,
  Lock,
  Workflow,
  Mail,
  MessageSquare,
  UserCog
} from "lucide-react";

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

export default function AdminPortal() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        console.log("Current user:", user);
        console.log("User role:", user.role);
        console.log("User admin_role:", user.admin_role);
        setCurrentUser(user);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  // Define tabs with their required permissions
  const tabs = [
    {
      id: "subscribers",
      label: "Subscribers",
      icon: Users,
      component: SubscribersModule,
      permissions: ["manage_users", "view_users"],
      description: "Manage user accounts and roles"
    },
    {
      id: "billing",
      label: "Billing",
      icon: CreditCard,
      component: BillingModule,
      permissions: ["manage_billing", "view_billing", "manage_subscriptions", "view_subscriptions"],
      description: "Manage subscriptions and payments"
    },
    {
      id: "content",
      label: "Content Library",
      icon: FileText,
      component: ContentLibraryModule,
      permissions: ["manage_content", "view_content"],
      description: "Manage templates and resources"
    },
    {
      id: "ai",
      label: "AI Configuration",
      icon: Brain,
      component: AIConfigModule,
      permissions: ["manage_ai_config", "view_ai_config"],
      description: "Configure AI models and settings"
    },
    {
      id: "security",
      label: "Security",
      icon: Lock,
      component: SecurityModule,
      permissions: ["manage_security", "view_security"],
      description: "Security settings and policies"
    },
    {
      id: "audit",
      label: "Audit Logs",
      icon: Shield,
      component: AuditLogModule,
      permissions: ["view_audit_logs"],
      description: "View system audit trail"
    },
    {
      id: "health",
      label: "System Health",
      icon: Activity,
      component: SystemHealthModule,
      permissions: ["view_system_health"],
      description: "Monitor system performance"
    },
    {
      id: "reports",
      label: "Reports",
      icon: BarChart3,
      component: ReportsModule,
      permissions: ["view_reports"],
      description: "Analytics and reporting"
    },
    {
      id: "roles",
      label: "Roles & Permissions",
      icon: UserCog,
      component: RolesModule,
      permissions: ["manage_users", "view_users"],
      description: "View role permissions"
    },
    {
      id: "workflows",
      label: "Workflows",
      icon: Workflow,
      component: WorkflowModule,
      permissions: ["manage_workflows", "view_workflows"],
      description: "Workflow configurations"
    },
    {
      id: "marketing",
      label: "Marketing",
      icon: Mail,
      component: MarketingModule,
      permissions: ["manage_marketing", "view_marketing"],
      description: "Marketing campaigns"
    },
    {
      id: "feedback",
      label: "Feedback",
      icon: MessageSquare,
      component: FeedbackModule,
      permissions: ["manage_feedback"],
      description: "User feedback and support"
    },
    {
      id: "onboarding",
      label: "Onboarding Emails",
      icon: Mail,
      component: OnboardingEmailModule,
      permissions: ["manage_email_templates", "manage_email_campaigns"],
      description: "Automated onboarding emails"
    }
  ];

  // Filter tabs based on user permissions
  const availableTabs = currentUser ? tabs.filter(tab => {
    const hasAccess = hasAnyPermission(currentUser, tab.permissions);
    console.log(`Tab ${tab.id}: permissions=${JSON.stringify(tab.permissions)}, hasAccess=${hasAccess}`);
    return hasAccess;
  }) : [];

  console.log("Available tabs count:", availableTabs.length);
  console.log("Available tabs:", availableTabs.map(t => t.id));

  // Set initial active tab to first available
  useEffect(() => {
    if (availableTabs.length > 0 && !activeTab) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionChecker requiredRole="admin">
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
                <p className="text-slate-600 mt-1">
                  System administration and configuration
                </p>
              </div>
              <Badge className="bg-red-100 text-red-700">
                <Shield className="w-3 h-3 mr-1" />
                {getRoleLabel(currentUser.admin_role)}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">
              You have access to {availableTabs.length} of {tabs.length} admin modules
            </p>
          </div>

          {/* Tabs */}
          {availableTabs.length > 0 ? (
            <Card className="border-none shadow-xl">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b bg-slate-50 p-2 overflow-x-auto">
                  <TabsList className="flex flex-wrap gap-1 bg-transparent">
                    {availableTabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                          <Icon className="w-4 h-4" />
                          <span className="hidden md:inline">{tab.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                <div className="p-6">
                  {availableTabs.map((tab) => {
                    const Component = tab.component;
                    return (
                      <TabsContent key={tab.id} value={tab.id} className="mt-0">
                        <Component currentUser={currentUser} />
                      </TabsContent>
                    );
                  })}
                </div>
              </Tabs>
            </Card>
          ) : (
            /* No Access Message */
            <Card className="border-none shadow-xl p-12 text-center">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">No Admin Modules Available</h2>
              <p className="text-slate-600 mb-4">
                Your admin role ({getRoleLabel(currentUser.admin_role)}) doesn't have access to any admin modules.
              </p>
              <p className="text-sm text-slate-500">
                Please contact a Super Admin for assistance.
              </p>
            </Card>
          )}
        </div>
      </div>
    </PermissionChecker>
  );
}