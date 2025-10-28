import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isSuperAdmin, hasSuperAdminTab, getSuperAdminTabs } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users,
  Building2,
  CreditCard,
  Sparkles,
  Lock,
  Activity,
  TrendingUp,
  Settings,
  FileText,
  Palette,
  Search,
  Eye,
  Edit,
  Trash2,
  UserCog,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const SUPER_ADMIN_ROLE_DEFINITIONS = {
  owner: {
    name: "App Owner / Super Admin",
    color: "bg-red-600 text-white",
    icon: Shield,
    description: "Platform owner with full, non-revocable control"
  },
  ops_admin: {
    name: "Operations Admin",
    color: "bg-blue-600 text-white",
    icon: Users,
    description: "Runs day-to-day operations and subscriber management"
  },
  content_manager: {
    name: "Content Manager",
    color: "bg-purple-600 text-white",
    icon: FileText,
    description: "Owns templates, libraries, and assets"
  },
  billing_manager: {
    name: "Billing Manager",
    color: "bg-green-600 text-white",
    icon: DollarSign,
    description: "Handles subscriptions, invoices, and billing"
  },
  ai_manager: {
    name: "AI Manager",
    color: "bg-indigo-600 text-white",
    icon: Sparkles,
    description: "Configures AI models, prompts, and usage"
  },
  security_officer: {
    name: "Security Officer",
    color: "bg-amber-600 text-white",
    icon: Lock,
    description: "Manages auth policies, MFA, and audits"
  },
  reviewer: {
    name: "Reviewer",
    color: "bg-slate-600 text-white",
    icon: Eye,
    description: "Read-only oversight of metrics and reports"
  },
  tech_support: {
    name: "Tech Support",
    color: "bg-cyan-600 text-white",
    icon: Settings,
    description: "Troubleshoots and provides technical support"
  },
  marketing_manager: {
    name: "Marketing Manager",
    color: "bg-pink-600 text-white",
    icon: Palette,
    description: "Owns public pages and branding"
  }
};

export default function SuperAdmin() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("subscribers");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        if (!isSuperAdmin(user)) {
          window.location.href = '/';
        } else {
          const availableTabs = getSuperAdminTabs(user);
          if (availableTabs.length > 0) {
            setActiveTab(availableTabs[0]);
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  const { data: allOrganizations } = useQuery({
    queryKey: ['super-admin-orgs'],
    queryFn: () => base44.entities.Organization.list('-created_date'),
    initialData: [],
    enabled: !!currentUser
  });

  const { data: allSubscriptions } = useQuery({
    queryKey: ['super-admin-subscriptions'],
    queryFn: () => base44.entities.Subscription.list('-created_date'),
    initialData: [],
    enabled: !!currentUser
  });

  const { data: allUsers } = useQuery({
    queryKey: ['super-admin-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    initialData: [],
    enabled: !!currentUser
  });

  const { data: allProposals } = useQuery({
    queryKey: ['super-admin-proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date', 100),
    initialData: [],
    enabled: !!currentUser
  });

  const { data: tokenUsage } = useQuery({
    queryKey: ['super-admin-tokens'],
    queryFn: () => base44.entities.TokenUsage.list('-created_date', 100),
    initialData: [],
    enabled: !!currentUser
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, userData }) => base44.entities.User.update(userId, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      setShowEditDialog(false);
      setEditingUser(null);
      alert("✓ User updated successfully!");
    }
  });

  const stats = {
    totalOrgs: allOrganizations.length,
    activeSubscriptions: allSubscriptions.filter(s => s.status === 'active').length,
    totalUsers: allUsers.length,
    totalProposals: allProposals.length,
    totalTokensUsed: tokenUsage.reduce((sum, t) => sum + (t.tokens_used || 0), 0),
    mrr: allSubscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.monthly_price || 0), 0)
  };

  const filteredOrgs = allOrganizations.filter(org =>
    org.organization_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableTabs = currentUser ? getSuperAdminTabs(currentUser) : [];
  
  if (!currentUser || !isSuperAdmin(currentUser)) {
    return null;
  }

  const roleDef = SUPER_ADMIN_ROLE_DEFINITIONS[currentUser.super_admin_role];
  const RoleIcon = roleDef?.icon || Shield;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${roleDef?.color || 'bg-red-600'}`}>
            <RoleIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Super Admin Portal</h1>
            <p className="text-slate-600">
              {roleDef?.name} - {roleDef?.description}
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organizations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{stats.totalOrgs}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Active Subs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{stats.activeSubscriptions}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{stats.totalUsers}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Proposals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-indigo-600">{stats.totalProposals}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tokens Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">
                {(stats.totalTokensUsed / 1000000).toFixed(1)}M
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                MRR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-600">${stats.mrr}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Card className="border-none shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="border-b">
              <TabsList className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                {availableTabs.includes("subscribers") && (
                  <TabsTrigger value="subscribers">
                    <Building2 className="w-4 h-4 mr-2" />
                    Subscribers
                  </TabsTrigger>
                )}
                {availableTabs.includes("roles_permissions") && (
                  <TabsTrigger value="roles_permissions">
                    <UserCog className="w-4 h-4 mr-2" />
                    Roles
                  </TabsTrigger>
                )}
                {availableTabs.includes("billing") && (
                  <TabsTrigger value="billing">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Billing
                  </TabsTrigger>
                )}
                {availableTabs.includes("ai") && (
                  <TabsTrigger value="ai">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI
                  </TabsTrigger>
                )}
                {availableTabs.includes("reports") && (
                  <TabsTrigger value="reports">
                    <Activity className="w-4 h-4 mr-2" />
                    Reports
                  </TabsTrigger>
                )}
              </TabsList>
            </CardHeader>

            <CardContent className="p-6">
              {/* Subscribers Tab */}
              <TabsContent value="subscribers" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <Input
                        placeholder="Search organizations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filteredOrgs.length === 0 ? (
                      <p className="text-center py-12 text-slate-500">No organizations found</p>
                    ) : (
                      filteredOrgs.map((org) => {
                        const sub = allSubscriptions.find(s => s.organization_id === org.id);
                        const orgUsers = allUsers.filter(u => u.organization_id === org.id);
                        const orgProposals = allProposals.filter(p => p.organization_id === org.id);

                        return (
                          <Card key={org.id} className="border-2">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                                    {org.organization_name}
                                  </h3>
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {sub && (
                                      <Badge className="capitalize">
                                        {sub.plan_type} Plan
                                      </Badge>
                                    )}
                                    {sub?.status === 'active' ? (
                                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                                    ) : (
                                      <Badge variant="outline">Inactive</Badge>
                                    )}
                                    {org.certifications?.map(cert => (
                                      <Badge key={cert} variant="outline">{cert}</Badge>
                                    ))}
                                  </div>
                                  <div className="grid md:grid-cols-2 gap-2 text-sm text-slate-600">
                                    <p>Contact: {org.contact_name}</p>
                                    <p>Email: {org.contact_email}</p>
                                    <p>Users: {orgUsers.length}</p>
                                    <p>Proposals: {orgProposals.length}</p>
                                    {org.uei && <p>UEI: {org.uei}</p>}
                                    {org.cage_code && <p>CAGE: {org.cage_code}</p>}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  {sub && (
                                    <div className="text-right">
                                      <p className="text-2xl font-bold text-slate-900">
                                        ${sub.monthly_price}/mo
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {((sub.token_credits - sub.token_credits_used) / 1000).toFixed(0)}k tokens left
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Roles & Permissions Tab */}
              <TabsContent value="roles_permissions" className="mt-0">
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {Object.entries(SUPER_ADMIN_ROLE_DEFINITIONS).map(([roleId, roleDef]) => {
                      const Icon = roleDef.icon;
                      const usersWithRole = allUsers.filter(u => u.super_admin_role === roleId).length;
                      
                      return (
                        <Card key={roleId} className="border-2">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3 mb-3">
                              <div className={`p-2 rounded-lg ${roleDef.color}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">{roleDef.name}</h4>
                                <Badge variant="outline" className="mt-1">{usersWithRole} admins</Badge>
                              </div>
                            </div>
                            <p className="text-xs text-slate-600">{roleDef.description}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <h3 className="text-lg font-semibold mb-3">Super Admin Users</h3>
                  <div className="space-y-3">
                    {allUsers.filter(u => u.super_admin_role).map((user) => {
                      const roleDef = SUPER_ADMIN_ROLE_DEFINITIONS[user.super_admin_role];
                      const Icon = roleDef?.icon || Shield;
                      
                      return (
                        <div key={user.id} className="p-4 border rounded-lg hover:border-blue-300 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {user.full_name?.[0]?.toUpperCase() || 'U'}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{user.full_name}</p>
                                <p className="text-sm text-slate-600">{user.email}</p>
                              </div>
                              <Badge className={roleDef?.color}>
                                <Icon className="w-3 h-3 mr-1" />
                                {roleDef?.name}
                              </Badge>
                            </div>
                            {currentUser.super_admin_role === 'owner' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user);
                                  setShowEditDialog(true);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="mt-0">
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <Card className="bg-gradient-to-br from-green-50 to-white">
                      <CardContent className="p-6">
                        <p className="text-sm text-slate-600 mb-2">Total MRR</p>
                        <p className="text-3xl font-bold text-green-600">${stats.mrr}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-50 to-white">
                      <CardContent className="p-6">
                        <p className="text-sm text-slate-600 mb-2">Active Subscriptions</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.activeSubscriptions}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-50 to-white">
                      <CardContent className="p-6">
                        <p className="text-sm text-slate-600 mb-2">Avg. Revenue Per User</p>
                        <p className="text-3xl font-bold text-amber-600">
                          ${stats.activeSubscriptions > 0 ? (stats.mrr / stats.activeSubscriptions).toFixed(0) : 0}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-3">
                    {allSubscriptions.map((sub) => {
                      const org = allOrganizations.find(o => o.id === sub.organization_id);
                      
                      return (
                        <div key={sub.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">{org?.organization_name || 'Unknown Org'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className="capitalize">{sub.plan_type}</Badge>
                                <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                                  {sub.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-slate-900">${sub.monthly_price}/mo</p>
                              <p className="text-sm text-slate-600">
                                {((sub.token_credits - sub.token_credits_used) / 1000).toFixed(0)}k / {(sub.token_credits / 1000).toFixed(0)}k tokens
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              {/* AI Tab */}
              <TabsContent value="ai" className="mt-0">
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <Card className="bg-gradient-to-br from-purple-50 to-white">
                      <CardContent className="p-6">
                        <p className="text-sm text-slate-600 mb-2">Total Tokens Used</p>
                        <p className="text-3xl font-bold text-purple-600">
                          {(stats.totalTokensUsed / 1000000).toFixed(2)}M
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-indigo-50 to-white">
                      <CardContent className="p-6">
                        <p className="text-sm text-slate-600 mb-2">Estimated Cost</p>
                        <p className="text-3xl font-bold text-indigo-600">
                          ${((stats.totalTokensUsed / 1000000) * 0.5).toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <h3 className="text-lg font-semibold mb-3">Recent AI Usage</h3>
                  <div className="space-y-3">
                    {tokenUsage.slice(0, 20).map((usage) => (
                      <div key={usage.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {usage.feature_type?.replace(/_/g, ' ')}
                            </Badge>
                            <Badge>{usage.llm_provider}</Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{(usage.tokens_used / 1000).toFixed(1)}K tokens</p>
                            <p className="text-xs text-slate-500">${(usage.cost_estimate || 0).toFixed(4)}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">{usage.prompt}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {usage.user_email} • {new Date(usage.created_date).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Reports Tab */}
              <TabsContent value="reports" className="mt-0">
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm text-slate-600 mb-2">Total Organizations</p>
                        <p className="text-3xl font-bold">{stats.totalOrgs}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm text-slate-600 mb-2">Total Users</p>
                        <p className="text-3xl font-bold">{stats.totalUsers}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm text-slate-600 mb-2">Total Proposals</p>
                        <p className="text-3xl font-bold">{stats.totalProposals}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm text-slate-600 mb-2">Active Subs</p>
                        <p className="text-3xl font-bold">{stats.activeSubscriptions}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Platform Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Monthly Recurring Revenue</span>
                          <span className="font-semibold text-lg">${stats.mrr}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Average Revenue Per User</span>
                          <span className="font-semibold text-lg">
                            ${stats.activeSubscriptions > 0 ? (stats.mrr / stats.activeSubscriptions).toFixed(2) : 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Proposals Per Organization</span>
                          <span className="font-semibold text-lg">
                            {stats.totalOrgs > 0 ? (stats.totalProposals / stats.totalOrgs).toFixed(1) : 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">AI Token Usage (Total)</span>
                          <span className="font-semibold text-lg">
                            {(stats.totalTokensUsed / 1000000).toFixed(2)}M
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Super Admin Role</DialogTitle>
              <DialogDescription>
                Modify super admin permissions for {editingUser?.full_name}
              </DialogDescription>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Super Admin Role</label>
                  <Select
                    value={editingUser.super_admin_role || ''}
                    onValueChange={(value) => setEditingUser({
                      ...editingUser,
                      super_admin_role: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None (Remove Super Admin)</SelectItem>
                      {Object.entries(SUPER_ADMIN_ROLE_DEFINITIONS).map(([roleId, roleDef]) => (
                        <SelectItem key={roleId} value={roleId}>
                          {roleDef.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editingUser.super_admin_role && (
                    <p className="text-xs text-slate-500">
                      {SUPER_ADMIN_ROLE_DEFINITIONS[editingUser.super_admin_role]?.description}
                    </p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => updateUserMutation.mutate({
                  userId: editingUser.id,
                  userData: {
                    super_admin_role: editingUser.super_admin_role || null
                  }
                })}
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}