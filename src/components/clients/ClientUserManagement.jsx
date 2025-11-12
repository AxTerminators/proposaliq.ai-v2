import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Trash2,
  Mail,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Crown,
  Users,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ConfirmDialog from "../ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import OptimizedImage from "../ui/OptimizedImage"; // Added OptimizedImage import
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton import
import { Label } from "@/components/ui/label"; // Added Label import

const CLIENT_ROLES = [
  {
    value: 'organization_owner',
    label: 'Organization Owner',
    description: 'Full control over workspace',
    color: 'bg-purple-100 text-purple-700',
    icon: Crown
  },
  {
    value: 'organization_admin',
    label: 'Organization Admin',
    description: 'Manage users and settings',
    color: 'bg-blue-100 text-blue-700',
    icon: Shield
  },
  {
    value: 'proposal_manager',
    label: 'Proposal Manager',
    description: 'Create and manage proposals',
    color: 'bg-green-100 text-green-700',
    icon: Users
  },
  {
    value: 'contributor',
    label: 'Contributor',
    description: 'Edit proposals and content',
    color: 'bg-amber-100 text-amber-700',
    icon: Users
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'View-only access',
    color: 'bg-slate-100 text-slate-700',
    icon: Eye
  },
];

/**
 * Client User Management Component
 * Manages user access to a specific client organization workspace
 */
export default function ClientUserManagement({ clientOrganization, consultingFirm }) {
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("contributor");

  // Fetch all users who have access to this client organization
  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['all-users-for-client-org', clientOrganization?.id],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u =>
        u.email === clientOrganization?.created_by ||
        u.client_accesses?.some(acc => acc.organization_id === clientOrganization?.id)
      );
    },
    enabled: !!clientOrganization?.id,
  });

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      const users = await base44.entities.User.filter({ email });

      if (users.length === 0) {
        throw new Error('User not found in platform. Please invite them through main Settings > Team first.');
      }

      const existingUser = users[0];
      const currentAccesses = existingUser.client_accesses || [];

      if (currentAccesses.some(acc => acc.organization_id === clientOrganization.id)) {
        throw new Error('User already has access to this workspace');
      }

      const currentUserData = await base44.auth.me();

      await base44.entities.User.update(existingUser.id, {
        client_accesses: [
          ...currentAccesses,
          {
            organization_id: clientOrganization.id,
            organization_name: clientOrganization.organization_name,
            organization_type: clientOrganization.organization_type,
            role,
            added_date: new Date().toISOString(),
            added_by: currentUserData.email,
            is_favorite: false
          }
        ]
      });

      return existingUser;
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['all-users-for-client-org'] });
      toast.success(`✅ ${user.full_name || user.email} granted access!`);
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteRole("contributor");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (user) => {
      const currentAccesses = user.client_accesses || [];
      const updatedAccesses = currentAccesses.filter(
        acc => acc.organization_id !== clientOrganization.id
      );

      await base44.entities.User.update(user.id, {
        client_accesses: updatedAccesses
      });

      return user;
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['all-users-for-client-org'] });
      toast.success(`Access revoked for ${user.full_name || user.email}`);
      setShowRevokeConfirm(false);
      setUserToRevoke(null);
    },
    onError: (error) => {
      toast.error("Failed to revoke access: " + error.message);
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ user, newRole }) => {
      const currentAccesses = user.client_accesses || [];
      const updatedAccesses = currentAccesses.map(acc =>
        acc.organization_id === clientOrganization.id
          ? { ...acc, role: newRole }
          : acc
      );

      await base44.entities.User.update(user.id, {
        client_accesses: updatedAccesses
      });

      return user;
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['all-users-for-client-org'] });
      toast.success(`Updated role for ${user.full_name || user.email}`);
    },
    onError: (error) => {
      toast.error("Failed to update role: " + error.message);
    }
  });

  const handleInvite = () => {
    if (!inviteEmail?.trim()) {
      toast.error("Email is required");
      return;
    }

    inviteUserMutation.mutate({
      email: inviteEmail.trim(),
      role: inviteRole
    });
  };

  const handleRevoke = (user) => {
    setUserToRevoke(user);
    setShowRevokeConfirm(true);
  };

  const getUserRole = (user) => {
    if (user.email === clientOrganization?.created_by) {
      return 'organization_owner';
    }
    const access = user.client_accesses?.find(acc => acc.organization_id === clientOrganization?.id);
    return access?.role || 'viewer';
  };

  const getRoleInfo = (roleValue) => {
    return CLIENT_ROLES.find(r => r.value === roleValue) || CLIENT_ROLES[CLIENT_ROLES.length - 1];
  };

  return (
    <Card className="border-none shadow-lg"> {/* This Card now wraps the entire component content */}
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            User Access ({allUsers.length})
          </CardTitle>
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Grant Access
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6"> {/* New CardContent wraps the user list and dialogs */}
        {/* Users List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : allUsers.length === 0 ? ( // Changed filteredUsers to allUsers
          <div className="text-center py-8 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No users have access yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allUsers.map((user) => { // Changed filteredUsers to allUsers
              const userRole = getUserRole(user);
              const roleInfo = getRoleInfo(userRole);
              const Icon = roleInfo.icon; // Using Icon from roleInfo
              const isOwner = user.email === clientOrganization?.created_by;

              return (
                <Card key={user.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* UPDATED: Use OptimizedImage for user avatar if available */}
                      {user.profile_photo_url ? (
                        <OptimizedImage
                          src={user.profile_photo_url}
                          alt={user.full_name || 'User avatar'}
                          className="w-12 h-12 rounded-full object-cover"
                          containerClassName="w-12 h-12 rounded-full flex-shrink-0"
                          aspectRatio="1/1"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-semibold text-lg">
                            {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* User info (name, email, roles) */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {user.full_name || user.email}
                        </p>
                        <p className="text-sm text-slate-600 truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={cn(roleInfo.color)}>
                            <Icon className="w-3 h-3 mr-1" />
                            {roleInfo.label}
                          </Badge>
                          {isOwner && (
                            <Badge className="bg-purple-100 text-purple-700">
                              <Crown className="w-3 h-3 mr-1" />
                              Creator
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Role selector and revoke button */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isOwner && (
                          <>
                            <Select
                              value={userRole}
                              onValueChange={(newRole) => updateRoleMutation.mutate({ user, newRole })}
                              disabled={updateRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-40">
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
                              onClick={() => handleRevoke(user)}
                              title="Revoke access"
                              disabled={revokeAccessMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Invite Dialog - Moved inside this CardContent */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Grant Workspace Access
              </DialogTitle>
              <DialogDescription>
                Add a platform user to {clientOrganization?.organization_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Workspace Role *</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_ROLES.map(role => {
                      const RoleIcon = role.icon;
                      return (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-start gap-2">
                            <RoleIcon className="w-4 h-4 mt-0.5" />
                            <div>
                              <p className="font-medium">{role.label}</p>
                              <p className="text-xs text-slate-500">{role.description}</p>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  ℹ️ User must exist in the platform. New users should be invited through main Settings → Team first.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviteUserMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {inviteUserMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Granting...
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

        {/* Revoke Confirmation - Moved inside this CardContent */}
        <ConfirmDialog
          isOpen={showRevokeConfirm}
          onClose={() => {
            setShowRevokeConfirm(false);
            setUserToRevoke(null);
          }}
          onConfirm={() => revokeAccessMutation.mutate(userToRevoke)}
          title="Revoke Workspace Access?"
          variant="danger"
          confirmText="Yes, Revoke Access"
          isLoading={revokeAccessMutation.isPending}
        >
          <div className="space-y-3">
            <p className="text-slate-700">
              Are you sure you want to revoke access for <strong>{userToRevoke?.full_name || userToRevoke?.email}</strong> from {clientOrganization?.organization_name}?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-900">
                ⚠️ They will lose access to all proposals, files, and data within this client workspace.
              </p>
            </div>
          </div>
        </ConfirmDialog>
      </CardContent>
    </Card>
  );
}