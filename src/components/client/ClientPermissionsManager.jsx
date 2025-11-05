import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Shield,
  Eye,
  MessageSquare,
  FileUp,
  CheckCircle,
  UserPlus,
  Edit,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

const PERMISSION_PRESETS = {
  owner: {
    label: "Owner",
    description: "Full control over the proposal and team",
    color: "bg-purple-100 text-purple-700",
    permissions: {
      can_approve: true,
      can_comment: true,
      can_upload_files: true,
      can_invite_others: true,
      can_see_internal_comments: true,
      can_edit_annotations: true,
      can_download_files: true,
      can_see_pricing: true,
      can_request_changes: true,
      can_accept_proposal: true
    }
  },
  approver: {
    label: "Approver",
    description: "Can approve/reject proposals and provide feedback",
    color: "bg-green-100 text-green-700",
    permissions: {
      can_approve: true,
      can_comment: true,
      can_upload_files: true,
      can_invite_others: false,
      can_see_internal_comments: false,
      can_edit_annotations: true,
      can_download_files: true,
      can_see_pricing: true,
      can_request_changes: true,
      can_accept_proposal: true
    }
  },
  reviewer: {
    label: "Reviewer",
    description: "Can comment and upload files",
    color: "bg-blue-100 text-blue-700",
    permissions: {
      can_approve: false,
      can_comment: true,
      can_upload_files: true,
      can_invite_others: false,
      can_see_internal_comments: false,
      can_edit_annotations: true,
      can_download_files: true,
      can_see_pricing: false,
      can_request_changes: true,
      can_accept_proposal: false
    }
  },
  observer: {
    label: "Observer",
    description: "View-only access with commenting",
    color: "bg-slate-100 text-slate-700",
    permissions: {
      can_approve: false,
      can_comment: true,
      can_upload_files: false,
      can_invite_others: false,
      can_see_internal_comments: false,
      can_edit_annotations: false,
      can_download_files: true,
      can_see_pricing: false,
      can_request_changes: false,
      can_accept_proposal: false
    }
  }
};

export default function ClientPermissionsManager({ client, teamMembers = [], proposal }) {
  const queryClient = useQueryClient();
  const [editingMember, setEditingMember] = useState(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [customPermissions, setCustomPermissions] = useState({});
  const [selectedPreset, setSelectedPreset] = useState("reviewer");

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, updates }) => {
      return base44.entities.ClientTeamMember.update(memberId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-team-members'] });
      setShowPermissionsDialog(false);
      setEditingMember(null);
    },
  });

  const handleEditPermissions = (member) => {
    setEditingMember(member);
    setCustomPermissions(member.permissions || {});
    
    // Try to match to a preset
    const matchingPreset = Object.entries(PERMISSION_PRESETS).find(([key, preset]) => {
      return JSON.stringify(preset.permissions) === JSON.stringify(member.permissions);
    });
    
    if (matchingPreset) {
      setSelectedPreset(matchingPreset[0]);
    } else {
      setSelectedPreset("custom");
    }
    
    setShowPermissionsDialog(true);
  };

  const handlePresetChange = (preset) => {
    setSelectedPreset(preset);
    if (preset !== "custom" && PERMISSION_PRESETS[preset]) {
      setCustomPermissions(PERMISSION_PRESETS[preset].permissions);
    }
  };

  const handlePermissionToggle = (permission) => {
    setCustomPermissions(prev => ({
      ...prev,
      [permission]: !prev[permission]
    }));
    setSelectedPreset("custom"); // Switch to custom when manually changing
  };

  const handleSavePermissions = () => {
    if (editingMember) {
      updateMemberMutation.mutate({
        memberId: editingMember.id,
        updates: {
          team_role: selectedPreset !== "custom" ? selectedPreset : editingMember.team_role,
          permissions: customPermissions
        }
      });
    }
  };

  const permissionItems = [
    { key: "can_approve", label: "Approve/Reject Proposals", icon: CheckCircle, description: "Can provide final approval or rejection" },
    { key: "can_comment", label: "Add Comments", icon: MessageSquare, description: "Can leave comments and feedback" },
    { key: "can_upload_files", label: "Upload Files", icon: FileUp, description: "Can upload documents and attachments" },
    { key: "can_invite_others", label: "Invite Team Members", icon: UserPlus, description: "Can invite additional team members" },
    { key: "can_see_internal_comments", label: "See Internal Comments", icon: Eye, description: "Can view consultant's internal notes" },
    { key: "can_edit_annotations", label: "Edit Annotations", icon: Edit, description: "Can create and edit annotations" },
    { key: "can_download_files", label: "Download Files", icon: FileUp, description: "Can download proposal documents" },
    { key: "can_see_pricing", label: "View Pricing", icon: Shield, description: "Can view pricing information" },
    { key: "can_request_changes", label: "Request Changes", icon: AlertTriangle, description: "Can formally request changes" },
    { key: "can_accept_proposal", label: "Accept Proposal", icon: CheckCircle, description: "Can accept the final proposal" }
  ];

  return (
    <>
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Team Permissions
          </CardTitle>
          <CardDescription>
            Manage granular access control for each team member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No team members yet</p>
              </div>
            ) : (
              teamMembers.map((member) => {
                const preset = Object.entries(PERMISSION_PRESETS).find(([key, p]) => 
                  JSON.stringify(p.permissions) === JSON.stringify(member.permissions)
                );
                const roleInfo = preset ? PERMISSION_PRESETS[preset[0]] : { label: "Custom", color: "bg-amber-100 text-amber-700" };

                return (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-300 transition-all">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {member.member_name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{member.member_name}</p>
                          <p className="text-sm text-slate-600">{member.member_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-13">
                        <Badge className={roleInfo.color}>
                          {roleInfo.label}
                        </Badge>
                        {member.member_title && (
                          <Badge variant="outline" className="text-xs">
                            {member.member_title}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPermissions(member)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Permissions
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Permissions - {editingMember?.member_name}</DialogTitle>
            <DialogDescription>
              Choose a permission preset or customize individual permissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Preset Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Permission Preset</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handlePresetChange(key)}
                    className={cn(
                      "p-4 border-2 rounded-lg text-left transition-all hover:border-blue-400",
                      selectedPreset === key ? "border-blue-500 bg-blue-50" : "border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={preset.color}>{preset.label}</Badge>
                      {selectedPreset === key && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{preset.description}</p>
                  </button>
                ))}
                <button
                  onClick={() => handlePresetChange("custom")}
                  className={cn(
                    "p-4 border-2 rounded-lg text-left transition-all hover:border-blue-400",
                    selectedPreset === "custom" ? "border-blue-500 bg-blue-50" : "border-slate-200"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-amber-100 text-amber-700">Custom</Badge>
                    {selectedPreset === "custom" && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600">Create custom permission set</p>
                </button>
              </div>
            </div>

            {/* Individual Permissions */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Individual Permissions</Label>
              <div className="space-y-3 bg-slate-50 p-4 rounded-lg border">
                {permissionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.key} className="flex items-start justify-between py-2">
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className="w-5 h-5 text-slate-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-slate-900">{item.label}</p>
                          <p className="text-sm text-slate-600">{item.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={customPermissions[item.key] || false}
                        onCheckedChange={() => handlePermissionToggle(item.key)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePermissions}
              disabled={updateMemberMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMemberMutation.isPending ? "Saving..." : "Save Permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}