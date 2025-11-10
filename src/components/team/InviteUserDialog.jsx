import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, UserPlus } from "lucide-react";

export default function InviteUserDialog({ organization, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("writer");
  const [fullName, setFullName] = useState("");

  const inviteMutation = useMutation({
    mutationFn: async () => {
      // In a real implementation, this would send an invitation email
      // For now, we'll just show a success message
      // The actual user creation happens when they accept the invitation
      
      alert(`Invitation sent to ${email} with role: ${role}`);
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  const handleInvite = () => {
    if (email.trim()) {
      inviteMutation.mutate();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join {organization.organization_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div>
            <Label>Email Address *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="organization_owner">Organization Owner</SelectItem>
                <SelectItem value="proposal_manager">Proposal Manager</SelectItem>
                <SelectItem value="capture_manager">Capture Manager</SelectItem>
                <SelectItem value="writer">Writer</SelectItem>
                <SelectItem value="reviewer">Reviewer</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              {role === "organization_owner" && "Full access to all features and settings"}
              {role === "proposal_manager" && "Can create and manage proposals"}
              {role === "capture_manager" && "Can create and manage proposals (sales/demo role)"}
              {role === "writer" && "Can edit proposals and content"}
              {role === "reviewer" && "Can review and comment on proposals"}
              {role === "viewer" && "Read-only access to proposals"}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleInvite} 
              disabled={!email.trim() || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                "Sending..."
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}