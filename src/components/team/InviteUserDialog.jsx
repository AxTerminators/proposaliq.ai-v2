import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { UserPlus, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  { value: 'organization_owner', label: 'Organization Owner', description: 'Full control over this workspace' },
  { value: 'organization_admin', label: 'Organization Admin', description: 'Manage users and settings' },
  { value: 'proposal_manager', label: 'Proposal Manager', description: 'Create and manage proposals' },
  { value: 'contributor', label: 'Contributor', description: 'Edit proposals and content' },
  { value: 'viewer', label: 'Viewer', description: 'View-only access' },
];

export default function InviteUserDialog({ isOpen, onClose, organization }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("contributor");
  const [fullName, setFullName] = useState("");

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role, fullName }) => {
      // Check if user already exists
      const existingUsers = await base44.entities.User.filter({ email });
      
      if (existingUsers.length > 0) {
        // User exists, update their client_accesses
        const existingUser = existingUsers[0];
        const currentAccesses = existingUser.client_accesses || [];
        
        // Check if already has access
        if (currentAccesses.some(acc => acc.organization_id === organization.id)) {
          throw new Error('User already has access to this organization');
        }

        // Add new access
        await base44.entities.User.update(existingUser.id, {
          client_accesses: [
            ...currentAccesses,
            {
              organization_id: organization.id,
              organization_name: organization.organization_name,
              organization_type: organization.organization_type,
              role,
              added_date: new Date().toISOString(),
              added_by: (await base44.auth.me()).email,
              is_favorite: false
            }
          ]
        });

        return { existing: true, user: existingUser };
      } else {
        // Need to invite new user to platform
        // This would typically go through your user invitation system
        throw new Error('User does not exist. Please invite them to the platform first through the main Settings > Team page.');
      }
    },
    onSuccess: ({ existing, user }) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success(`✅ ${user.full_name || user.email} granted access to ${organization.organization_name}!`);
      onClose();
      setEmail("");
      setFullName("");
      setSelectedRole("contributor");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleInvite = () => {
    if (!email?.trim()) {
      toast.error("Email is required");
      return;
    }

    inviteUserMutation.mutate({
      email: email.trim(),
      role: selectedRole,
      fullName: fullName.trim()
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Invite User to {organization?.organization_name}
          </DialogTitle>
          <DialogDescription>
            Grant access to this workspace for an existing platform user
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Email Address *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Role *</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    <div>
                      <p className="font-medium">{role.label}</p>
                      <p className="text-xs text-slate-500">{role.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              ℹ️ The user must already exist in the platform. If they don't, invite them through Settings → Team first.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            disabled={!email.trim() || inviteUserMutation.isPending}
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
  );
}