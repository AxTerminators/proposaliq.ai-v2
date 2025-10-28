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
  UserPlus
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
import { APP_ROLE_PERMISSIONS, hasAppPermission } from "../components/settings/AppRoleChecker";

export default function Settings() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");

  useEffect(() => {
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

  const canManageTeam = hasAppPermission(user?.organization_app_role, 'canManageTeam');
  const canInviteUsers = hasAppPermission(user?.organization_app_role, 'canInviteUsers');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
          <p className="text-slate-600">Manage your team, organization, and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="team" className="space-y-6">
        <TabsList>
          <TabsTrigger value="team">
            <Users className="w-4 h-4 mr-2" />
            Team Management
          </TabsTrigger>
          <TabsTrigger value="organization">
            <Building2 className="w-4 h-4 mr-2" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield className="w-4 h-4 mr-2" />
            Roles & Permissions
          </TabsTrigger>
        </TabsList>

        {/* Team Management */}
        <TabsContent value="team" className="space-y-6">
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
                  
                  return (
                    <div key={member.id} className="p-4 border rounded-lg hover:border-blue-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
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
                        {canManageTeam && member.email !== user?.email && (
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
              <CardDescription>Manage your organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {organization ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Organization Name</Label>
                      <Input value={organization.organization_name} disabled className="mt-1" />
                    </div>
                    <div>
                      <Label>Contact Email</Label>
                      <Input value={organization.contact_email} disabled className="mt-1" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>UEI</Label>
                      <Input value={organization.uei || 'Not provided'} disabled className="mt-1" />
                    </div>
                    <div>
                      <Label>CAGE Code</Label>
                      <Input value={organization.cage_code || 'Not provided'} disabled className="mt-1" />
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

        {/* Roles & Permissions */}
        <TabsContent value="roles" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {Object.entries(APP_ROLE_PERMISSIONS).map(([roleId, roleInfo]) => (
              <Card key={roleId} className="border-none shadow-lg">
                <CardHeader className={`bg-gradient-to-br from-${roleInfo.color}-50 to-white border-b`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-${roleInfo.color}-100 rounded-lg flex items-center justify-center`}>
                      <Shield className={`w-6 h-6 text-${roleInfo.color}-600`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{roleInfo.label}</CardTitle>
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
            ))}
          </div>
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
                  {Object.entries(APP_ROLE_PERMISSIONS).map(([roleId, roleInfo]) => (
                    <SelectItem key={roleId} value={roleId}>
                      {roleInfo.label}
                    </SelectItem>
                  ))}
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
                    {Object.entries(APP_ROLE_PERMISSIONS).map(([roleId, roleInfo]) => (
                      <SelectItem key={roleId} value={roleId}>
                        {roleInfo.label}
                      </SelectItem>
                    ))}
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