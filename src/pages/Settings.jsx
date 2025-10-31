
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, 
  Users,
  Mail,
  Shield,
  Building2,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Crown,
  CreditCard,
  AlertTriangle,
  Bug
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_ROLE_PERMISSIONS, hasAppPermission, isOrganizationOwner } from "../components/settings/AppRoleChecker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Import Team and Feedback page components
const TeamPageContent = React.lazy(() => import("./Team"));
const FeedbackPageContent = React.lazy(() => import("./Feedback"));

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState(null);
  const [organization, setOrganization] = React.useState(null);
  const [showInviteDialog, setShowInviteDialog] = React.useState(false);
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("viewer");

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      // Get all users - in a real app, you'd filter by organization
      const allUsers = await base44.entities.User.list('-created_date');
      return allUsers;
    },
    initialData: [],
    enabled: !!organization?.id
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      const subs = await base44.entities.Subscription.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );
      return subs.length > 0 ? subs[0] : null;
    },
    enabled: !!organization?.id,
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      await base44.entities.User.update(userId, {
        organization_app_role: newRole
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setShowEditDialog(false);
      alert("Team member role updated successfully!");
    }
  });

  const handleInvite = async () => {
    if (!inviteEmail) {
      alert("Please enter an email address");
      return;
    }

    // In a real implementation, this would send an invitation email
    // For now, we'll just show a success message
    alert(`Invitation sent to ${inviteEmail} with role: ${APP_ROLE_PERMISSIONS[inviteRole].label}`);
    setShowInviteDialog(false);
    setInviteEmail("");
    setInviteRole("viewer");
  };

  const handleEditRole = (member) => {
    setSelectedUser(member);
    setShowEditDialog(true);
  };

  const userIsOwner = isOrganizationOwner(user?.organization_app_role);
  const canManageTeam = hasAppPermission(user?.organization_app_role, 'canManageTeam');
  const canInviteUsers = hasAppPermission(user?.organization_app_role, 'canInviteUsers');
  const canAccessBilling = hasAppPermission(user?.organization_app_role, 'canAccessBilling');
  const canEditOrganization = hasAppPermission(user?.organization_app_role, 'canEditOrganization');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
          <p className="text-slate-600">Manage your team, organization, and preferences</p>
        </div>
        {userIsOwner && (
          <Badge className="bg-indigo-100 text-indigo-700 border-none">
            <Crown className="w-3 h-3 mr-1" />
            Organization Owner
          </Badge>
        )}
      </div>

      <Tabs defaultValue="team-management" className="space-y-6">
        <TabsList>
          <TabsTrigger value="team-management">
            <Users className="w-4 h-4 mr-2" />
            Team Management
          </TabsTrigger>
          <TabsTrigger value="organization">
            <Building2 className="w-4 h-4 mr-2" />
            Organization
          </TabsTrigger>
          {userIsOwner && (
            <TabsTrigger value="billing">
              <CreditCard className="w-4 h-4 mr-2" />
              Billing & Subscription
            </TabsTrigger>
          )}
          <TabsTrigger value="roles">
            <Shield className="w-4 h-4 mr-2" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="w-4 h-4 mr-2" />
            Team
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <Bug className="w-4 h-4 mr-2" />
            Feedback
          </TabsTrigger>
        </TabsList>

        {/* Team Management */}
        <TabsContent value="team-management" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage your team and assign roles</CardDescription>
                </div>
                {canInviteUsers && (
                  <Button onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {teamMembers.map((member) => {
                  const roleInfo = APP_ROLE_PERMISSIONS[member.organization_app_role || 'viewer'];
                  const memberIsOwner = isOrganizationOwner(member.organization_app_role);
                  
                  return (
                    <div key={member.id} className="p-4 border rounded-lg hover:border-blue-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-12 h-12 bg-gradient-to-br ${memberIsOwner ? 'from-indigo-500 to-purple-500' : 'from-blue-500 to-indigo-500'} rounded-full flex items-center justify-center`}>
                            <span className="text-white font-bold text-lg">
                              {member.full_name?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-slate-900">{member.full_name}</h3>
                              {member.email === user?.email && (
                                <Badge variant="secondary">You</Badge>
                              )}
                              {memberIsOwner && (
                                <Badge className="bg-indigo-100 text-indigo-700 border-none">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Owner
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-slate-600 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {member.email}
                              </span>
                              <Badge className={`bg-${roleInfo?.color}-100 text-${roleInfo?.color}-700`}>
                                {roleInfo?.label || 'Viewer'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {userIsOwner && member.email !== user?.email && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRole(member)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {canManageTeam && !userIsOwner && member.email !== user?.email && !memberIsOwner && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRole(member)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {teamMembers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600 mb-4">No team members yet</p>
                    {canInviteUsers && (
                      <Button onClick={() => setShowInviteDialog(true)}>
                        Invite Your First Team Member
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Settings */}
        <TabsContent value="organization" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>
                {canEditOrganization ? 'Manage your organization details' : 'View your organization details'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canEditOrganization && (
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Only the Organization Owner can edit organization details. Contact your owner to make changes.
                  </AlertDescription>
                </Alert>
              )}
              {organization ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Organization Name</Label>
                      <Input value={organization.organization_name} disabled={!canEditOrganization} className="mt-1" />
                    </div>
                    <div>
                      <Label>Contact Email</Label>
                      <Input value={organization.contact_email} disabled={!canEditOrganization} className="mt-1" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>UEI</Label>
                      <Input value={organization.uei || 'Not provided'} disabled={!canEditOrganization} className="mt-1" />
                    </div>
                    <div>
                      <Label>CAGE Code</Label>
                      <Input value={organization.cage_code || 'Not provided'} disabled={!canEditOrganization} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label>Certifications</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {organization.certifications?.map((cert, idx) => (
                        <Badge key={idx} variant="secondary">{cert}</Badge>
                      ))}
                      {(!organization.certifications || organization.certifications.length === 0) && (
                        <span className="text-sm text-slate-500">No certifications</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-slate-500">No organization information available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing & Subscription (Owner Only) */}
        {userIsOwner && (
          <TabsContent value="billing" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Subscription & Billing</CardTitle>
                <CardDescription>Manage your subscription plan and billing information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {subscription ? (
                  <>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Current Plan</Label>
                        <div className="flex items-center gap-2">
                          <Badge className="text-lg py-1 px-3 capitalize">
                            {subscription.plan_type}
                          </Badge>
                          <Badge variant="outline">{subscription.status}</Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Monthly Cost</Label>
                        <p className="text-2xl font-bold text-slate-900">
                          ${subscription.monthly_price}/month
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Token Credits</Label>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600">
                          {((subscription.token_credits - subscription.token_credits_used) / 1000).toFixed(0)}K / {(subscription.token_credits / 1000).toFixed(0)}K
                        </span>
                        <span className="text-sm font-semibold">
                          {(((subscription.token_credits - subscription.token_credits_used) / subscription.token_credits) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all ${
                            ((subscription.token_credits - subscription.token_credits_used) / subscription.token_credits) > 0.5 ? 'bg-green-500' :
                            ((subscription.token_credits - subscription.token_credits_used) / subscription.token_credits) > 0.2 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${((subscription.token_credits - subscription.token_credits_used) / subscription.token_credits) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button 
                        onClick={() => window.open(createPageUrl("Pricing"), '_blank')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        View Plans & Upgrade
                      </Button>
                      <Button variant="outline">
                        View Billing History
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600 mb-4">No active subscription</p>
                    <Button onClick={() => window.open(createPageUrl("Pricing"), '_blank')}>
                      View Plans
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {subscription && (
              <Card className="border-none shadow-lg border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions for your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-900">Delete Organization Account</p>
                      <p className="text-sm text-slate-600">Permanently delete this organization and all associated data</p>
                    </div>
                    <Button variant="destructive">
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Roles & Permissions */}
        <TabsContent value="roles" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {Object.entries(APP_ROLE_PERMISSIONS).map(([roleId, roleInfo]) => {
              const isOwnerRole = roleId === 'organization_owner';
              
              return (
                <Card key={roleId} className={`border-none shadow-lg ${isOwnerRole ? 'ring-2 ring-indigo-200' : ''}`}>
                  <CardHeader className={`bg-gradient-to-br from-${roleInfo.color}-50 to-white border-b`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-${roleInfo.color}-100 rounded-lg flex items-center justify-center`}>
                        {isOwnerRole ? (
                          <Crown className={`w-6 h-6 text-${roleInfo.color}-600`} />
                        ) : (
                          <Shield className={`w-6 h-6 text-${roleInfo.color}-600`} />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{roleInfo.label}</CardTitle>
                        {isOwnerRole && (
                          <Badge className="bg-indigo-600 text-white mt-1">
                            Highest Authority
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-600 mb-3">{roleInfo.description}</p>
                    <div className="space-y-1 text-sm">
                      {Object.entries(roleInfo.capabilities).map(([capability, hasPermission]) => (
                        hasPermission && (
                          <div key={capability} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            <span className="text-slate-700">
                              {capability.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Team Tab - Embedded Team Page */}
        <TabsContent value="team" className="space-y-6">
          <React.Suspense fallback={<div className="text-center py-12"><p>Loading Team...</p></div>}>
            <TeamPageContent />
          </React.Suspense>
        </TabsContent>

        {/* Feedback Tab - Embedded Feedback Page */}
        <TabsContent value="feedback" className="space-y-6">
          <React.Suspense fallback={<div className="text-center py-12"><p>Loading Feedback...</p></div>}>
            <FeedbackPageContent />
          </React.Suspense>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(APP_ROLE_PERMISSIONS).map(([roleId, roleInfo]) => {
                    // Only owner can assign owner role
                    if (roleId === 'organization_owner' && !userIsOwner) return null;
                    
                    return (
                      <SelectItem key={roleId} value={roleId}>
                        {roleInfo.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                {APP_ROLE_PERMISSIONS[inviteRole]?.description}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite}>
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={selectedUser.organization_app_role || 'viewer'}
                  onValueChange={(value) => setSelectedUser({...selectedUser, organization_app_role: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(APP_ROLE_PERMISSIONS).map(([roleId, roleInfo]) => {
                      // Only owner can assign owner role
                      if (roleId === 'organization_owner' && !userIsOwner) return null;
                      
                      return (
                        <SelectItem key={roleId} value={roleId}>
                          {roleInfo.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {APP_ROLE_PERMISSIONS[selectedUser.organization_app_role || 'viewer']?.description}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateUserRoleMutation.mutate({
                  userId: selectedUser.id,
                  newRole: selectedUser.organization_app_role
                });
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
