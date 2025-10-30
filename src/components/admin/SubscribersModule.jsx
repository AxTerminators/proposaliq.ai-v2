import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  Edit, 
  Trash2,
  Shield,
  Building2,
  Mail,
  AlertCircle
} from "lucide-react";
import { hasPermission, logAdminAction, ROLE_PERMISSIONS, getRoleLabel, getRoleDescription } from "./PermissionChecker";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SubscribersModule({ currentUser }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: allUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    initialData: []
  });

  const { data: organizations } = useQuery({
    queryKey: ['all-orgs-admin'],
    queryFn: () => base44.entities.Organization.list('-created_date'),
    initialData: []
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }) => {
      await base44.entities.User.update(userId, updates);
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      await logAdminAction('user_updated', variables.updates, variables.userId);
      setShowEditDialog(false);
      alert("User updated successfully");
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.delete(userId);
    },
    onSuccess: async (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      await logAdminAction('user_deleted', { userId }, userId);
      alert("User deleted successfully");
    }
  });

  const handleEditUser = (user) => {
    setSelectedUser({...user});
    setShowEditDialog(true);
  };

  const filteredUsers = allUsers.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check permissions
  const canEditUsers = hasPermission(currentUser, "manage_users");
  const canDeleteUsers = hasPermission(currentUser, "manage_users");
  const isSuperAdmin = currentUser?.admin_role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Subscriber Management</h2>
          <p className="text-slate-600">Manage all platform users and their roles</p>
        </div>
      </div>

      {!canEditUsers && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription>
            <p className="font-semibold text-amber-900">Read-Only Access</p>
            <p className="text-sm text-amber-800">Your role ({getRoleLabel(currentUser.admin_role)}) has view-only access to this module.</p>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const userOrg = organizations.find(org => org.created_by === user.email);
              
              return (
                <div key={user.id} className="p-4 border rounded-lg hover:border-blue-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {user.full_name?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{user.full_name}</h3>
                          {user.role === 'admin' && (
                            <Badge variant="destructive">
                              <Shield className="w-3 h-3 mr-1" />
                              {user.admin_role ? getRoleLabel(user.admin_role) : 'Admin'}
                            </Badge>
                          )}
                          {!user.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </span>
                          {userOrg && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {userOrg.organization_name}
                            </span>
                          )}
                        </div>
                        {user.admin_role && (
                          <p className="text-xs text-slate-500 mt-1">
                            {getRoleDescription(user.admin_role)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {canEditUsers && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDeleteUsers && user.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this user?')) {
                              deleteUserMutation.mutate(user.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Modify user account settings and role assignments
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={selectedUser.full_name || ''}
                  onChange={(e) => setSelectedUser({...selectedUser, full_name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Email (Read-only)</Label>
                <Input
                  value={selectedUser.email || ''}
                  disabled
                  className="bg-slate-50"
                />
              </div>
              
              <div className="space-y-2">
                <Label>User Role</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value) => setSelectedUser({...selectedUser, role: value})}
                  disabled={!canEditUsers}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Regular User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {selectedUser.role === 'admin' ? 'User has access to Admin Portal' : 'Standard user access only'}
                </p>
              </div>
              
              {selectedUser.role === 'admin' && isSuperAdmin && (
                <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Label className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    Admin Role (Super Admin Only)
                  </Label>
                  <Select
                    value={selectedUser.admin_role || 'operations_admin'}
                    onValueChange={(value) => setSelectedUser({...selectedUser, admin_role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_PERMISSIONS).map(([key, role]) => (
                        <SelectItem key={key} value={key}>
                          <div className="py-1">
                            <div className="font-semibold">{role.label}</div>
                            <div className="text-xs text-slate-500">{role.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedUser.admin_role && (
                    <div className="mt-3 p-3 bg-white rounded border">
                      <p className="text-xs font-semibold text-slate-700 mb-2">Permissions:</p>
                      <div className="flex flex-wrap gap-1">
                        {ROLE_PERMISSIONS[selectedUser.admin_role]?.permissions.map(perm => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {selectedUser.role === 'admin' && !isSuperAdmin && (
                <Alert>
                  <Shield className="w-4 h-4" />
                  <AlertDescription>
                    <p className="text-sm font-semibold">Only Super Admins can assign admin roles</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Current role: {selectedUser.admin_role ? getRoleLabel(selectedUser.admin_role) : 'Not assigned'}
                    </p>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded">
                <input
                  type="checkbox"
                  checked={selectedUser.is_active ?? true}
                  onChange={(e) => setSelectedUser({...selectedUser, is_active: e.target.checked})}
                  className="w-4 h-4"
                  disabled={!canEditUsers}
                />
                <Label>Active Account</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const updates = {
                  full_name: selectedUser.full_name,
                  role: selectedUser.role,
                  is_active: selectedUser.is_active
                };
                
                // Only super admins can update admin_role
                if (isSuperAdmin && selectedUser.role === 'admin') {
                  updates.admin_role = selectedUser.admin_role;
                }
                
                updateUserMutation.mutate({
                  userId: selectedUser.id,
                  updates
                });
              }}
              disabled={!canEditUsers}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}