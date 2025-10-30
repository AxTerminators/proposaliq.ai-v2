import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { PermissionChecker } from "../components/admin/PermissionChecker";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Users,
  DollarSign,
  Sparkles,
  Lock,
  Activity,
  FileText,
  UserCog,
  Zap,
  TrendingUp,
  Bug
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export default function AdminPortal() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error loading user:", error);
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
          <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading Admin Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionChecker requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-red-600" />
              <h1 className="text-3xl font-bold text-slate-900">Admin Portal</h1>
              {currentUser?.admin_role && (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                  {currentUser.admin_role.replace('_', ' ').toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-slate-600">Manage users, billing, content, and system configuration</p>
          </div>

          <Alert className="mb-6 bg-red-50 border-red-200">
            <Lock className="w-4 h-4 text-red-600" />
            <AlertDescription>
              <p className="font-semibold text-red-900 mb-1">Admin Access</p>
              <p className="text-sm text-red-800">
                You have administrative privileges. All actions are logged for security and compliance.
              </p>
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="subscribers" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12">
              <TabsTrigger value="subscribers" className="gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Subscribers</span>
              </TabsTrigger>
              <TabsTrigger value="feedback" className="gap-2">
                <Bug className="w-4 h-4" />
                <span className="hidden sm:inline">Feedback</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="gap-2">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Billing</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">AI</span>
              </TabsTrigger>
              <TabsTrigger value="content" className="gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Content</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="health" className="gap-2">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Health</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Reports</span>
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-2">
                <UserCog className="w-4 h-4" />
                <span className="hidden sm:inline">Roles</span>
              </TabsTrigger>
              <TabsTrigger value="workflows" className="gap-2">
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Workflows</span>
              </TabsTrigger>
              <TabsTrigger value="marketing" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Marketing</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Audit</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subscribers">
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <SubscribersModule />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="feedback">
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <FeedbackModule />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing">
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <BillingModule />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai">
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <AIConfigModule />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content">
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <ContentLibraryModule />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <SecurityModule />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health">
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <SystemHealthModule />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <ReportsModule />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles">
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <RolesModule />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workflows">
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <WorkflowModule />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="marketing">
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <MarketingModule />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit">
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <AuditLogModule />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PermissionChecker>
  );
}