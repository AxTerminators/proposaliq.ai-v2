import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Plus,
  Mail,
  Shield,
  Eye,
  MessageSquare,
  Trash2,
  RefreshCw,
  Crown,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

export default function ClientTeamManager({ client }) {
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteData, setInviteData] = useState({
    member_name: "",
    member_email: "",
    member_title: "",
    team_role: "reviewer"
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['client-team-members', client.id],
    queryFn: () => base44.entities.ClientTeamMember.filter({ client_id: client.id }),
    initialData: []
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (memberData) => {
      const token = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
      
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setMonth(tokenExpiresAt.getMonth() + 6);

      const permissions = {
        can_approve: memberData.team_role === 'owner' || memberData.team_role === 'approver',
        can_comment: true,
        can_upload_files: memberData.team_role !== 'observer',
        can_invite_others: memberData.team_role === 'owner',
        can_see_internal_comments: true
      };

      return await base44.entities.ClientTeamMember.create({
        ...memberData,
        client_id: client.id,
        access_token: token,
        token_expires_at: tokenExpiresAt.toISOString(),
        invited_by: client.contact_email,
        invitation_status: 'pending',
        permissions,
        is_active: true
      });
    },
    onSuccess: async (newMember) => {
      queryClient.invalidateQueries({ queryKey: ['client-team-members'] });
      
      // Send invitation email
      try {
        await base44.integrations.Core.SendEmail({
          to: newMember.member_email,
          subject: `You've been invited to join ${client.client_name || client.client_organization}'s proposal team`,
          body: `Hi ${newMember.member_name},

You've been invited to join the proposal review team for ${client.client_name || client.client_organization}.

Your role: ${newMember.team_role}

Access the client portal here:
${window.location.origin}/ClientPortal?token=${newMember.access_token}

This link will expire on ${moment(newMember.token_expires_at).format('MMMM D, YYYY')}.

Best regards,
${client.contact_name}`
        });
      } catch (error) {
        console.error("Error sending invitation:", error);
      }

      setShowInviteDialog(false);
      resetInviteForm();
      alert(`Invitation sent to ${newMember.member_email}`);
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, data }) => {
      return await base44.entities.ClientTeamMember.update(memberId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-team-members'] });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId) => {
      return await base44.entities.ClientTeamMember.delete(memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-team-members'] });
      alert("Team member removed");
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (member) => {
      await base44.integrations.Core.SendEmail({
        to: member.member_email,
        subject: `Reminder: You've been invited to join ${client.client_name || client.client_organization}'s proposal team`,
        body: `Hi ${member.member_name},

This is a reminder that you've been invited to join the proposal review team.

Access the client portal here:
${window.location.origin}/ClientPortal?token=${member.access_token}

Best regards,
${client.contact_name}`
      });
    },
    onSuccess: () => {
      alert("Invitation resent");
    },
  });

  const handleInvite = () => {
    if (!inviteData.member_name || !inviteData.member_email) {
      alert("Please fill in name and email");
      return;
    }
    inviteMemberMutation.mutate(inviteData);
  };

  const resetInviteForm = () => {
    setInviteData({
      member_name: "",
      member_email: "",
      member_title: "",
      team_role: "reviewer"
    });
  };

  const getRoleBadge = (role) => {
    const configs = {
      owner: { icon: Crown, color: "bg-indigo-100 text-indigo-700", label: "Owner" },
      approver: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: "Approver" },
      reviewer: { icon: MessageSquare, color: "bg-blue-100 text-blue-700", label: "Reviewer" },
      observer: { icon: Eye, color: "bg-slate-100 text-slate-700", label: "Observer" }
    };
    const config = configs[role] || configs.observer;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { icon: Clock, color: "bg-yellow-100 text-yellow-700", label: "Pending" },
      accepted: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: "Accepted" },
      declined: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Declined" }
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage who can access and review proposals
              </CardDescription>
            </div>
            <Button onClick={() => setShowInviteDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="mb-2">No team members yet</p>
              <p className="text-sm">Invite colleagues to collaborate on proposals</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="p-4 border-2 rounded-lg hover:border-blue-300 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold">
                          {member.member_name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{member.member_name}</h3>
                          {getRoleBadge(member.team_role)}
                          {getStatusBadge(member.invitation_status)}
                        </div>
                        <p className="text-sm text-slate-600">{member.member_email}</p>
                        {member.member_title && (
                          <p className="text-xs text-slate-500">{member.member_title}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-slate-500">
                          {member.last_access && (
                            <span>Last active: {moment(member.last_access).fromNow()}</span>
                          )}
                          {member.invitation_status === 'pending' && (
                            <span>Invited: {moment(member.created_date).fromNow()}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {member.invitation_status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resendInviteMutation.mutate(member)}
                          title="Resend Invitation"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Remove ${member.member_name} from team?`)) {
                            deleteMemberMutation.mutate(member.id);
                          }
                        }}
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  {/* Permissions Display */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {member.permissions?.can_approve && (
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Can Approve
                      </Badge>
                    )}
                    {member.permissions?.can_comment && (
                      <Badge variant="outline" className="text-xs">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Can Comment
                      </Badge>
                    )}
                    {member.permissions?.can_upload_files && (
                      <Badge variant="outline" className="text-xs">
                        Can Upload Files
                      </Badge>
                    )}
                    {member.permissions?.can_invite_others && (
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        Can Invite Others
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card className="border-none shadow-lg bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg">Team Roles Explained</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Crown className="w-4 h-4 text-indigo-600 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-900">Owner</p>
              <p className="text-indigo-700">Full control: approve, comment, upload, invite others</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Approver</p>
              <p className="text-green-700">Can approve/reject proposals, comment, and upload files</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Reviewer</p>
              <p className="text-blue-700">Can comment and upload files</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Eye className="w-4 h-4 text-slate-600 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">Observer</p>
              <p className="text-slate-700">View-only access</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your proposal review team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="member_name">Full Name *</Label>
              <Input
                id="member_name"
                value={inviteData.member_name}
                onChange={(e) => setInviteData({ ...inviteData, member_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="member_email">Email Address *</Label>
              <Input
                id="member_email"
                type="email"
                value={inviteData.member_email}
                onChange={(e) => setInviteData({ ...inviteData, member_email: e.target.value })}
                placeholder="john@company.com"
              />
            </div>

            <div>
              <Label htmlFor="member_title">Job Title</Label>
              <Input
                id="member_title"
                value={inviteData.member_title}
                onChange={(e) => setInviteData({ ...inviteData, member_title: e.target.value })}
                placeholder="VP of Operations"
              />
            </div>

            <div>
              <Label htmlFor="team_role">Team Role *</Label>
              <Select
                value={inviteData.team_role}
                onValueChange={(value) => setInviteData({ ...inviteData, team_role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner (Full Control)</SelectItem>
                  <SelectItem value="approver">Approver (Can Approve)</SelectItem>
                  <SelectItem value="reviewer">Reviewer (Can Comment)</SelectItem>
                  <SelectItem value="observer">Observer (View Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowInviteDialog(false);
                resetInviteForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteMemberMutation.isPending}>
              <Mail className="w-4 h-4 mr-2" />
              {inviteMemberMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}