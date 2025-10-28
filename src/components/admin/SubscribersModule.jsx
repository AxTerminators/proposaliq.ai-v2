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
  Mail
} from "lucide-react";
import { canEdit, canDelete, logAdminAction } from "./PermissionChecker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const userRole = currentUser.admin_role || currentUser.role;
  const canEditUsers = canEdit(userRole, 'subscribers');
  const canDeleteUsers = canDelete(userRole, 'subscribers');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Subscriber Management</h2>
          <p className="text-slate-600">Manage all platform users and their organizations</p>
        </div>
      </div>

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
                              {user.admin_role || 'Admin'}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
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
                <Label>Role</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value) => setSelectedUser({...selectedUser, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedUser.role === 'admin' && userRole === 'super_admin' && (
                <div className="space-y-2">
                  <Label>Admin Role</Label>
                  <Select
                    value={selectedUser.admin_role || 'operations_admin'}
                    onValueChange={(value) => setSelectedUser({...selectedUser, admin_role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operations_admin">Operations Admin</SelectItem>
                      <SelectItem value="content_manager">Content Manager</SelectItem>
                      <SelectItem value="billing_manager">Billing Manager</SelectItem>
                      <SelectItem value="ai_manager">AI Manager</SelectItem>
                      <SelectItem value="security_officer">Security Officer</SelectItem>
                      <SelectItem value="reviewer">Reviewer</SelectItem>
                      <SelectItem value="tech_support">Tech Support</SelectItem>
                      <SelectItem value="marketing_manager">Marketing Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedUser.is_active ?? true}
                  onChange={(e) => setSelectedUser({...selectedUser, is_active: e.target.checked})}
                  className="w-4 h-4"
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
                updateUserMutation.mutate({
                  userId: selectedUser.id,
                  updates: {
                    full_name: selectedUser.full_name,
                    role: selectedUser.role,
                    admin_role: selectedUser.admin_role,
                    is_active: selectedUser.is_active
                  }
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