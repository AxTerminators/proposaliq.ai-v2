import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield,
  Users,
  FileText,
  DollarSign,
  Brain,
  Lock,
  Eye,
  Wrench,
  Megaphone,
  CheckCircle2,
  XCircle,
  Crown
} from "lucide-react";
import { ROLE_PERMISSIONS } from "./PermissionChecker";

export default function RolesModule() {
  const roleIcons = {
    super_admin: Crown,
    operations_admin: Shield,
    content_manager: FileText,
    billing_manager: DollarSign,
    ai_manager: Brain,
    security_officer: Lock,
    reviewer: Eye,
    tech_support: Wrench,
    marketing_manager: Megaphone
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Roles & Permissions</h2>
        <p className="text-slate-600">View and understand the role-based access control structure</p>
      </div>

      {/* Role Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-6">
            <Shield className="w-10 h-10 text-red-600 mb-3" />
            <p className="text-3xl font-bold text-slate-900">9</p>
            <p className="text-sm text-slate-600">Admin Roles</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <Users className="w-10 h-10 text-blue-600 mb-3" />
            <p className="text-3xl font-bold text-slate-900">11</p>
            <p className="text-sm text-slate-600">Module Types</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <CheckCircle2 className="w-10 h-10 text-green-600 mb-3" />
            <p className="text-3xl font-bold text-slate-900">100%</p>
            <p className="text-sm text-slate-600">RBAC Coverage</p>
          </CardContent>
        </Card>
      </div>

      {/* Roles Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {Object.entries(ROLE_PERMISSIONS).map(([roleId, roleInfo]) => {
          const RoleIcon = roleIcons[roleId] || Shield;
          
          return (
            <Card key={roleId} className="border-none shadow-lg">
              <CardHeader className={`bg-gradient-to-br from-${roleInfo.color}-50 to-white border-b`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 bg-${roleInfo.color}-100 rounded-lg flex items-center justify-center`}>
                    <RoleIcon className={`w-6 h-6 text-${roleInfo.color}-600`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{roleInfo.label}</CardTitle>
                    <Badge className={`bg-${roleInfo.color}-600 text-white mt-1`}>
                      {roleId.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Accessible Modules:</p>
                    <div className="flex flex-wrap gap-1">
                      {roleInfo.modules.includes('all') ? (
                        <Badge variant="secondary">All Modules</Badge>
                      ) : (
                        roleInfo.modules.map((module, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {module}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Permissions:</p>
                    <div className="space-y-1 text-sm">
                      {roleInfo.canImpersonate && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span>Can Impersonate Users</span>
                        </div>
                      )}
                      {roleInfo.canManageRoles && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span>Can Manage Roles</span>
                        </div>
                      )}
                      {roleInfo.canAccessBilling === true && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span>Full Billing Access</span>
                        </div>
                      )}
                      {roleInfo.canAccessBilling === "read" && (
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-blue-600" />
                          <span>View-Only Billing Access</span>
                        </div>
                      )}
                      {roleInfo.canConfigureAI && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span>Configure AI Settings</span>
                        </div>
                      )}
                      {roleInfo.canAccessSecurity === true && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span>Full Security Access</span>
                        </div>
                      )}
                      {roleInfo.canAccessSecurity === "read" && (
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-blue-600" />
                          <span>View-Only Security Access</span>
                        </div>
                      )}
                      {roleInfo.canAccessSystem && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span>System Health Access</span>
                        </div>
                      )}
                      {!roleInfo.canImpersonate && !roleInfo.canManageRoles && !roleInfo.canAccessBilling && !roleInfo.canConfigureAI && !roleInfo.canAccessSecurity && !roleInfo.canAccessSystem && (
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-500">Limited Permissions</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Can Edit:</p>
                    <div className="flex flex-wrap gap-1">
                      {roleInfo.canEdit.includes('all') ? (
                        <Badge variant="outline">All Entities</Badge>
                      ) : roleInfo.canEdit.length > 0 ? (
                        roleInfo.canEdit.map((entity, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {entity}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs text-slate-500">Read-Only</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Permission Matrix */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>Quick reference for module access by role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">Module</th>
                  <th className="text-center p-2 font-semibold">Super Admin</th>
                  <th className="text-center p-2 font-semibold">Ops Admin</th>
                  <th className="text-center p-2 font-semibold">Content</th>
                  <th className="text-center p-2 font-semibold">Billing</th>
                  <th className="text-center p-2 font-semibold">AI</th>
                  <th className="text-center p-2 font-semibold">Security</th>
                  <th className="text-center p-2 font-semibold">Reviewer</th>
                  <th className="text-center p-2 font-semibold">Support</th>
                  <th className="text-center p-2 font-semibold">Marketing</th>
                </tr>
              </thead>
              <tbody>
                {['subscribers', 'roles', 'content', 'workflow', 'billing', 'ai', 'security', 'marketing', 'system', 'reports', 'audit'].map((module) => (
                  <tr key={module} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-medium capitalize">{module}</td>
                    {Object.keys(ROLE_PERMISSIONS).map((roleId) => {
                      const role = ROLE_PERMISSIONS[roleId];
                      const hasAccess = role.modules.includes('all') || role.modules.includes(module);
                      return (
                        <td key={roleId} className="text-center p-2">
                          {hasAccess ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}