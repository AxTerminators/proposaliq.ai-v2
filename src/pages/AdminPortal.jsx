import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, CreditCard, FileText, Brain, Lock, Activity, BarChart3, ArrowLeft, UserCog, Workflow, Mail, MessageSquare } from "lucide-react";

// Import admin modules
import SubscribersModule from "../components/admin/SubscribersModule";
import BillingModule from "../components/admin/BillingModule";
import ContentLibraryModule from "../components/admin/ContentLibraryModule";
import AIConfigModule from "../components/admin/AIConfigModule";
import SecurityModule from "../components/admin/SecurityModule";
import AuditLogModule from "../components/admin/AuditLogModule";
import SystemHealthModule from "../components/admin/SystemHealthModule";
import ReportsModule from "../components/admin/ReportsModule";
import RolesModule from "../components/admin/RolesModule";
import WorkflowModule from "../components/admin/WorkflowModule";
import MarketingModule from "../components/admin/MarketingModule";
import FeedbackModule from "../components/admin/FeedbackModule";
import OnboardingEmailModule from "../components/admin/OnboardingEmailModule";

export default function AdminPortal() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState(null);

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

  // Admin modules available
  const modules = [
    { id: "subscribers", label: "Subscribers", icon: Users, description: "Manage user accounts and roles", component: SubscribersModule },
    { id: "billing", label: "Billing", icon: CreditCard, description: "Manage subscriptions and payments", component: BillingModule },
    { id: "content", label: "Content Library", icon: FileText, description: "Manage templates and resources", component: ContentLibraryModule },
    { id: "ai", label: "AI Configuration", icon: Brain, description: "Configure AI models", component: AIConfigModule },
    { id: "security", label: "Security", icon: Lock, description: "Security settings", component: SecurityModule },
    { id: "audit", label: "Audit Logs", icon: Shield, description: "View audit trail", component: AuditLogModule },
    { id: "health", label: "System Health", icon: Activity, description: "Monitor performance", component: SystemHealthModule },
    { id: "reports", label: "Reports", icon: BarChart3, description: "Analytics and reporting", component: ReportsModule },
    { id: "roles", label: "Roles & Permissions", icon: UserCog, description: "View role permissions", component: RolesModule },
    { id: "workflows", label: "Workflows", icon: Workflow, description: "Workflow configurations", component: WorkflowModule },
    { id: "marketing", label: "Marketing", icon: Mail, description: "Marketing campaigns", component: MarketingModule },
    { id: "feedback", label: "Feedback", icon: MessageSquare, description: "User feedback and support", component: FeedbackModule },
    { id: "onboarding", label: "Onboarding Emails", icon: Mail, description: "Automated onboarding emails", component: OnboardingEmailModule }
  ];

  // If a module is active, render it
  if (activeModule) {
    const module = modules.find(m => m.id === activeModule);
    if (module) {
      const Component = module.component;
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => setActiveModule(null)}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin Portal
              </Button>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <module.icon className="w-8 h-8 text-blue-600" />
                    {module.label}
                  </h1>
                  <p className="text-slate-600 mt-1">{module.description}</p>
                </div>
                <Badge className="bg-red-100 text-red-700">
                  <Shield className="w-3 h-3 mr-1" />
                  {currentUser.admin_role || "Admin"}
                </Badge>
              </div>
            </div>

            <Card className="border-none shadow-xl">
              <div className="p-6">
                <Component currentUser={currentUser} />
              </div>
            </Card>
          </div>
        </div>
      );
    }
  }

  // Show module grid (homepage)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Shield className="w-8 h-8 text-red-600" />
                Admin Portal
              </h1>
              <p className="text-slate-600 mt-1">System administration and configuration</p>
            </div>
            <Badge className="bg-red-100 text-red-700">
              <Shield className="w-3 h-3 mr-1" />
              {currentUser.admin_role || "Admin"}
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card 
                key={module.id} 
                className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105"
                onClick={() => setActiveModule(module.id)}
              >
                <div className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{module.label}</h3>
                  <p className="text-sm text-slate-600">{module.description}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="border-none shadow-xl p-6 mt-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Your Account</h2>
          <div className="space-y-2">
            <p className="text-slate-600">Name: {currentUser.full_name}</p>
            <p className="text-slate-600">Email: {currentUser.email}</p>
            <p className="text-slate-600">Role: {currentUser.role}</p>
            <p className="text-slate-600">Admin Role: {currentUser.admin_role || "Not assigned (using default permissions)"}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}