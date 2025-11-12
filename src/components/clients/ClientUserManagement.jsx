import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Mail,
  Shield,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Users
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "../ui/ConfirmDialog";
import { cn } from "@/lib/utils";

const CLIENT_ROLES = [
  { 
    value: "client_admin", 
    label: "Admin", 
    description: "Full access to client workspace",
    color: "bg-purple-100 text-purple-700"
  },
  { 
    value: "client_reviewer", 
    label: "Reviewer", 
    description: "Can review and comment on proposals",
    color: "bg-blue-100 text-blue-700"
  },
  { 
    value: "client_contributor", 
    label: "Contributor", 
    description: "Can upload files and provide feedback",
    color: "bg-green-100 text-green-700"
  },
  { 
    value: "client_observer", 
    label: "Observer", 
    description: "Read-only access",
    color: "bg-slate-100 text-slate-700"
  }
];

/**
 * Client User Management Component
 * Manages user access to a specific client_organization workspace
 */
export default function ClientUserManagement({ clientOrganization, consultingFirm }) {
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState(null);

  const [inviteData, setInviteData] = useState({
    email: "",
    full_name: "",
    role: "client_reviewer"
  });

  // Fetch all users with access to this client organization
  const { data: clientUsers = [], isLoading } = useQuery({
    queryKey: ['client-org-users', clientOrganization?.id],
    queryFn: async () => {
      if (!clientOrganization?.id) return [];
      
      // Find all users who have this organization in their client_accesses
      const allUsers = await base44.entities.User.list();
      
      return allUsers.filter(user =>
        user.client_accesses?.some(access => 
          access.organization_id === clientOrganization.id
        )
      ).map(user => {
        const access = user.client_accesses.find(acc => 
          acc.organization_id === clientOrganization.id
        );
        return {
          ...user,
          client_role: access?.role,
          access_added_date: access?.added_date,
          access_added_by: access?.added_by
        };
      });
    },
    enabled: !!clientOrganization?.id,
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (data) => {
      // Check if user already exists
      const existingUsers = await base44.entities.User.filter({
        email: data.email
      });

      let targetUser;
      
      if (existingUsers.length > 0) {
        // User exists - add access to their client_accesses
        targetUser = existingUsers[0];
        const currentAccesses = targetUser.client_accesses || [];
        
        // Check if already has access
        if (currentAccesses.some(acc => acc.organization_id === clientOrganization.id)) {
          throw new Error("User already has access to this organization");
        }

        await base44.entities.User.update(targetUser.id, {
          client_accesses: [
            ...currentAccesses,
            {
              organization_id: clientOrganization.id,
              organization_name: clientOrganization.organization_name,
              organization_type: 'client_organization',
              role: data.role,
              added_date: new Date().toISOString(),
              added_by: consultingFirm.contact_email,
              is_favorite: false
            }
          ]
        });
      } else {
        // New user - create with access (would typically use Base44 invite system)
        toast.error("User does not exist. Use Base44's invite user feature to create new users.");
        throw new Error("User must be invited through Base44 platform");
      }

      return targetUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-org-users'] });
      toast.success("User access granted successfully!");
      setShowInviteDialog(false);
      setInviteData({ email: "", full_name: "", role: "client_reviewer" });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to grant access");
    }
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (userId) => {
      const user = clientUsers.find(u => u.id === userId);
      if (!user) throw new Error("User not found");

      const updatedAccesses = (user.client_accesses || []).filter(
        acc => acc.organization_id !== clientOrganization.id
      );

      await base44.entities.User.update(userId, {
        client_accesses: updatedAccesses
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-org-users'] });
      toast.success("Access revoked successfully");
      setShowRevokeConfirm(false);
      setUserToRevoke(null);
    },
    onError: (error) => {
      toast.error("Failed to revoke access: " + error.message);
    }
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      const user = clientUsers.find(u => u.id === userId);
      if (!user) throw new Error("User not found");

      const updatedAccesses = (user.client_accesses || []).map(acc =>
        acc.organization_id === clientOrganization.id
          ? { ...acc, role: newRole }
          : acc
      );

      await base44.entities.User.update(userId, {
        client_accesses: updatedAccesses
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-org-users'] });
      toast.success("User role updated!");
    },
    onError: (error) => {
      toast.error("Failed to update role: " + error.message);
    }
  });

  const handleInvite = () => {
    if (!inviteData.email?.trim()) {
      toast.error("Email is required");
      return;
    }

    inviteUserMutation.mutate(inviteData);
  };

  const getRoleInfo = (roleValue) => {
    return CLIENT_ROLES.find(r => r.value === roleValue) || CLIENT_ROLES[0];
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                User Access Management
              </h2>
              <p className="text-slate-600 text-sm">
                Manage who can access <strong>{clientOrganization?.organization_name}</strong> workspace
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-900">{clientUsers.length}</div>
              <div className="text-sm text-blue-700">Active User{clientUsers.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add User Button */}
      <Button onClick={() => setShowInviteDialog(true)} className="bg-blue-600 hover:bg-blue-700">
        <UserPlus className="w-4 h-4 mr-2" />
        Grant User Access
      </Button>

      {/* Users List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : clientUsers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Users Yet</h3>
            <p className="text-slate-600 mb-6">
              Grant access to users who should work within this client workspace
            </p>
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add First User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clientUsers.map((user) => {
            const roleInfo = getRoleInfo(user.client_role);

            return (
              <Card key={user.id} className="border-none shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {user.full_name?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {user.full_name || 'Unnamed User'}
                        </p>
                        <p className="text-sm text-slate-600 truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={roleInfo.color}>
                            {roleInfo.label}
                          </Badge>
                          {user.access_added_date && (
                            <span className="text-xs text-slate-500">
                              Added {moment(user.access_added_date).fromNow()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Select
                        value={user.client_role}
                        onValueChange={(newRole) => 
                          updateUserRoleMutation.mutate({ userId: user.id, newRole })
                        }
                        disabled={updateUserRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLIENT_ROLES.map(role => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setUserToRevoke(user);
                          setShowRevokeConfirm(true);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Grant User Access
            </DialogTitle>
            <DialogDescription>
              Add an existing user to this client workspace
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>User Email *</Label>
              <Input
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                placeholder="user@example.com"
              />
              <p className="text-xs text-slate-500 mt-1">
                User must already have a ProposalIQ.ai account
              </p>
            </div>

            <div>
              <Label>Role *</Label>
              <Select 
                value={inviteData.role} 
                onValueChange={(v) => setInviteData({...inviteData, role: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{role.label}</span>
                        <span className="text-xs text-slate-500">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                💡 The user will receive access to this client workspace only. They can switch between workspaces using the organization switcher.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!inviteData.email?.trim() || inviteUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {inviteUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Granting Access...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Grant Access
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Access Confirmation */}
      <ConfirmDialog
        isOpen={showRevokeConfirm}
        onClose={() => {
          setShowRevokeConfirm(false);
          setUserToRevoke(null);
        }}
        onConfirm={() => revokeAccessMutation.mutate(userToRevoke.id)}
        title="Revoke User Access?"
        variant="warning"
        confirmText="Yes, Revoke Access"
        isLoading={revokeAccessMutation.isPending}
      >
        <p className="text-slate-700">
          Remove <strong>{userToRevoke?.full_name || userToRevoke?.email}</strong>'s access to <strong>{clientOrganization?.organization_name}</strong>?
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
          <p className="text-sm text-amber-900">
            ⚠️ They will no longer be able to access this client's workspace or data.
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}