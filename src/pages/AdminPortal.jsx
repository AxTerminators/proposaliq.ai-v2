import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users,
  FileText,
  TrendingUp,
  Settings,
  Lock,
  Megaphone,
  Activity,
  ScrollText,
  Brain,
  DollarSign
} from "lucide-react";
import { ROLE_PERMISSIONS, canAccessModule } from "../components/admin/PermissionChecker";
import SubscribersModule from "../components/admin/SubscribersModule";
import AuditLogModule from "../components/admin/AuditLogModule";

export default function AdminPortal() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Check if user has any admin role
        const isAdmin = currentUser.role === 'admin' || currentUser.admin_role;
        if (!isAdmin) {
          window.location.href = '/';
        }
      } catch (error) {
        console.error("Error loading user:", error);
        window.location.href = '/';
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-slate-300 mb-4 animate-pulse" />
          <p className="text-slate-600">Loading Admin Portal...</p>
        </div>
      </div>
    );
  }

  const userRole = user.admin_role || 'super_admin';
  const roleInfo = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.super_admin;

  // Define all available modules
  const adminModules = [
    {
      id: "subscribers",
      label: "Subscribers",
      icon: Users,
      description: "Manage users and organizations",
      component: <SubscribersModule currentUser={user} />
    },
    {
      id: "roles",
      label: "Roles & Permissions",
      icon: Shield,
      description: "Manage admin roles",
      component: <div className="p-8 text-center text-slate-500">Role management module - Coming soon</div>
    },
    {
      id: "content",
      label: "Content Library",
      icon: FileText,
      description: "Templates and assets",
      component: <div className="p-8 text-center text-slate-500">Content library module - Coming soon</div>
    },
    {
      id: "workflow",
      label: "Workflow Dashboard",
      icon: Activity,
      description: "Proposal tracking",
      component: <div className="p-8 text-center text-slate-500">Workflow dashboard - Coming soon</div>
    },
    {
      id: "billing",
      label: "Billing & Invoices",
      icon: DollarSign,
      description: "Payment management",
      component: <div className="p-8 text-center text-slate-500">Billing module - Coming soon</div>
    },
    {
      id: "ai",
      label: "AI & Automation",
      icon: Brain,
      description: "AI settings and models",
      component: <div className="p-8 text-center text-slate-500">AI configuration - Coming soon</div>
    },
    {
      id: "security",
      label: "Security",
      icon: Lock,
      description: "Security settings",
      component: <div className="p-8 text-center text-slate-500">Security module - Coming soon</div>
    },
    {
      id: "marketing",
      label: "Marketing",
      icon: Megaphone,
      description: "Public pages and comms",
      component: <div className="p-8 text-center text-slate-500">Marketing module - Coming soon</div>
    },
    {
      id: "system",
      label: "System Health",
      icon: Settings,
      description: "Logs and maintenance",
      component: <div className="p-8 text-center text-slate-500">System health - Coming soon</div>
    },
    {
      id: "reports",
      label: "Reports",
      icon: TrendingUp,
      description: "Analytics and KPIs",
      component: <div className="p-8 text-center text-slate-500">Reports module - Coming soon</div>
    },
    {
      id: "audit",
      label: "Audit Logs",
      icon: ScrollText,
      description: "Admin action history",
      component: <AuditLogModule />
    }
  ];

  // Filter modules based on role permissions
  const accessibleModules = adminModules.filter(module => 
    canAccessModule(userRole, module.id)
  );

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 bg-gradient-to-br from-${roleInfo.color}-600 to-${roleInfo.color}-700 rounded-xl flex items-center justify-center`}>
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Admin Portal</h1>
              <p className="text-slate-600">Role-Based Access Control System</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <Badge className={`bg-${roleInfo.color}-600 text-white mb-2`}>
            {roleInfo.label}
          </Badge>
          <p className="text-sm text-slate-600">{user.email}</p>
        </div>
      </div>

      {/* Role Info Card */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-slate-50 to-white">
        <CardHeader>
          <CardTitle className="text-lg">Your Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-600 mb-2">Accessible Modules</p>
              <div className="flex flex-wrap gap-1">
                {accessibleModules.map(module => (
                  <Badge key={module.id} variant="secondary" className="text-xs">
                    {module.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-2">Edit Permissions</p>
              <div className="flex flex-wrap gap-1">
                {roleInfo.canEdit.map((entity, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {entity}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-2">Special Access</p>
              <div className="space-y-1 text-sm">
                {roleInfo.canImpersonate && (
                  <p className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Can Impersonate Users
                  </p>
                )}
                {roleInfo.canManageRoles && (
                  <p className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Can Manage Roles
                  </p>
                )}
                {roleInfo.canAccessBilling && (
                  <p className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Can Access Billing
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Modules */}
      <Card className="border-none shadow-lg">
        <Tabs defaultValue={accessibleModules[0]?.id} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-2 bg-slate-100 p-2">
            {accessibleModules.map((module) => {
              const Icon = module.icon;
              return (
                <TabsTrigger 
                  key={module.id} 
                  value={module.id}
                  className="flex items-center gap-2 data-[state=active]:bg-white"
                >
                  <Icon className="w-4 h-4" />
                  {module.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {accessibleModules.map((module) => (
            <TabsContent key={module.id} value={module.id} className="p-6">
              {module.component}
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      {/* Security Notice */}
      <Card className="border-none shadow-lg bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 mb-1">Security Notice</p>
              <p className="text-sm text-amber-800">
                All admin actions are logged and auditable. MFA is required for all admin roles. 
                {userRole !== 'super_admin' && ' You cannot modify Super Admin accounts or system configurations.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}