import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Shield, 
  Users,
  Search,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import { 
  ROLE_PERMISSIONS, 
  PERMISSION_DESCRIPTIONS,
  getRoleLabel, 
  getRoleDescription 
} from "./PermissionChecker";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function RolesModule() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRoles, setExpandedRoles] = useState({});

  const { data: allUsers } = useQuery({
    queryKey: ['all-users-roles'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  // Count users per role
  const usersByRole = allUsers.reduce((acc, user) => {
    if (user.admin_role) {
      acc[user.admin_role] = (acc[user.admin_role] || 0) + 1;
    }
    return acc;
  }, {});

  const toggleRole = (roleKey) => {
    setExpandedRoles(prev => ({
      ...prev,
      [roleKey]: !prev[roleKey]
    }));
  };

  const filteredRoles = Object.entries(ROLE_PERMISSIONS).filter(([key, role]) =>
    role.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.permissions.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get all unique permissions across all roles
  const allPermissions = [...new Set(
    Object.values(ROLE_PERMISSIONS).flatMap(role => role.permissions)
  )].filter(p => p !== 'all').sort();

  const getRoleColor = (roleKey) => {
    const colors = {
      super_admin: "bg-red-100 text-red-800 border-red-300",
      operations_admin: "bg-blue-100 text-blue-800 border-blue-300",
      billing_manager: "bg-green-100 text-green-800 border-green-300",
      content_manager: "bg-purple-100 text-purple-800 border-purple-300",
      ai_manager: "bg-indigo-100 text-indigo-800 border-indigo-300",
      security_officer: "bg-amber-100 text-amber-800 border-amber-300",
      marketing_manager: "bg-pink-100 text-pink-800 border-pink-300",
      reviewer: "bg-cyan-100 text-cyan-800 border-cyan-300",
      tech_support: "bg-slate-100 text-slate-800 border-slate-300",
      workflow_manager: "bg-emerald-100 text-emerald-800 border-emerald-300"
    };
    return colors[roleKey] || "bg-slate-100 text-slate-800 border-slate-300";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Roles & Permissions</h2>
        <p className="text-slate-600">View and understand admin role permissions</p>
      </div>

      {/* Statistics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Shield className="w-10 h-10 text-blue-500" />
              <div className="text-right">
                <p className="text-3xl font-bold">{Object.keys(ROLE_PERMISSIONS).length}</p>
                <p className="text-sm text-slate-600">Total Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
              <div className="text-right">
                <p className="text-3xl font-bold">{allPermissions.length}</p>
                <p className="text-sm text-slate-600">Permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Users className="w-10 h-10 text-purple-500" />
              <div className="text-right">
                <p className="text-3xl font-bold">{allUsers.filter(u => u.admin_role).length}</p>
                <p className="text-sm text-slate-600">Admin Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Shield className="w-10 h-10 text-red-500" />
              <div className="text-right">
                <p className="text-3xl font-bold">{usersByRole['super_admin'] || 0}</p>
                <p className="text-sm text-slate-600">Super Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search roles or permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Roles List */}
      <div className="space-y-4">
        {filteredRoles.map(([roleKey, role]) => (
          <Card key={roleKey} className={`border-2 shadow-lg ${getRoleColor(roleKey)}`}>
            <Collapsible
              open={expandedRoles[roleKey]}
              onOpenChange={() => toggleRole(roleKey)}
            >
              <CardHeader className="cursor-pointer" onClick={() => toggleRole(roleKey)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-6 h-6" />
                      <CardTitle className="text-xl">{role.label}</CardTitle>
                      {usersByRole[roleKey] && (
                        <Badge variant="secondary">
                          <Users className="w-3 h-3 mr-1" />
                          {usersByRole[roleKey]} {usersByRole[roleKey] === 1 ? 'user' : 'users'}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm">
                      {role.description}
                    </CardDescription>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon">
                      {expandedRoles[roleKey] ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {role.permissions.includes('all') ? (
                    <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      All Permissions
                    </Badge>
                  ) : (
                    <>
                      {role.permissions.slice(0, 5).map(perm => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {perm.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                      {role.permissions.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{role.permissions.length - 5} more
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Full Permission List
                    </h4>
                    {role.permissions.includes('all') ? (
                      <div className="p-4 bg-white/50 rounded-lg border">
                        <p className="font-semibold text-red-900 mb-2">
                          🔥 Unrestricted Access
                        </p>
                        <p className="text-sm text-slate-700">
                          This role has complete access to all features and capabilities within the admin portal. 
                          No restrictions apply.
                        </p>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-3">
                        {allPermissions.map(perm => {
                          const hasPermission = role.permissions.includes(perm);
                          return (
                            <div
                              key={perm}
                              className={`p-3 rounded-lg border ${
                                hasPermission 
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-slate-50 border-slate-200 opacity-50'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {hasPermission ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${
                                    hasPermission ? 'text-green-900' : 'text-slate-500'
                                  }`}>
                                    {perm.replace(/_/g, ' ')}
                                  </p>
                                  <p className="text-xs text-slate-600 mt-0.5">
                                    {PERMISSION_DESCRIPTIONS[perm] || 'No description available'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Users with this role */}
                    {usersByRole[roleKey] > 0 && (
                      <div className="mt-4 p-4 bg-white/50 rounded-lg border">
                        <h4 className="font-semibold mb-2 text-sm">
                          Users with this role ({usersByRole[roleKey]})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {allUsers
                            .filter(u => u.admin_role === roleKey)
                            .map(u => (
                              <Badge key={u.id} variant="outline">
                                {u.full_name} ({u.email})
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {filteredRoles.length === 0 && (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No roles found matching your search</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}