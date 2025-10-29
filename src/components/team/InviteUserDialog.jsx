import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useClient } from "@/contexts/ClientContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_ROLE_PERMISSIONS } from "../settings/AppRoleChecker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Info } from "lucide-react";

export default function InviteUserDialog({ open, onOpenChange }) {
  const { activeClientId, activeClientName, activeClientRole } = useClient();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("writer");
  const [error, setError] = useState("");

  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      // Check if user exists
      const users = await base44.entities.User.filter({ email }, '-created_date', 1);
      
      if (users.length === 0) {
        // User doesn't exist - would need to send invitation email
        // For now, we'll create a placeholder and notify them
        throw new Error("User not found. They need to sign up first at ProposalIQ.ai");
      }

      const existingUser = users[0];
      const clientAccesses = existingUser.client_accesses || [];

      // Check if already has access
      const existingAccess = clientAccesses.find(a => a.organization_id === activeClientId);
      if (existingAccess) {
        throw new Error("This user already has access to this client organization.");
      }

      // Add new client access
      const newAccess = {
        organization_id: activeClientId,
        organization_name: activeClientName,
        role: role,
        added_date: new Date().toISOString(),
        added_by: (await base44.auth.me()).email
      };

      await base44.entities.User.update(existingUser.id, {
        client_accesses: [...clientAccesses, newAccess]
      });

      // Create notification for the invited user
      await base44.entities.Notification.create({
        user_email: email,
        notification_type: "invitation",
        title: "New client access granted",
        message: `You've been granted ${APP_ROLE_PERMISSIONS[role].label} access to ${activeClientName}`,
        is_read: false
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setInviteEmail("");
      setInviteRole("writer");
      setError("");
      onOpenChange(false);
      alert(`✓ Successfully invited ${inviteEmail} to ${activeClientName}!`);
    },
    onError: (error) => {
      setError(error.message || "Failed to invite user");
    }
  });

  const handleInvite = () => {
    setError("");

    if (!inviteEmail || !inviteEmail.includes('@')) {
      setError("Please enter a valid email address");
      return;
    }

    if (!inviteRole) {
      setError("Please select a role");
      return;
    }

    // Only owner can assign owner role
    if (inviteRole === 'organization_owner' && activeClientRole !== 'organization_owner') {
      setError("Only the organization owner can assign owner roles");
      return;
    }

    inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User to {activeClientName}</DialogTitle>
          <DialogDescription>
            Grant access to an existing ProposalIQ.ai user for this client organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              The user must already have a ProposalIQ.ai account. They'll receive a notification and can switch to this client from their client selector.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Enter the email address of an existing ProposalIQ.ai user
            </p>
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
                  if (roleId === 'organization_owner' && activeClientRole !== 'organization_owner') {
                    return null;
                  }
                  
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
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={inviteUserMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleInvite}
            disabled={inviteUserMutation.isPending}
          >
            {inviteUserMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Invite User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}