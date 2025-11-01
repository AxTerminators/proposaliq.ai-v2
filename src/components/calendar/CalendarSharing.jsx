import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Share2, Plus, Copy, Check, ExternalLink, Trash2, Users, Lock, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CalendarSharing({ organization, user }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingShare, setEditingShare] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(null);
  
  const [formData, setFormData] = useState({
    share_name: "",
    share_type: "custom_filter",
    filter_config: {
      event_types: [],
      proposal_id: "",
      user_emails: []
    },
    shared_with_users: [],
    public_access_enabled: false
  });

  const { data: shares = [] } = useQuery({
    queryKey: ['calendar-shares', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.CalendarShare.filter({ organization_id: organization.id }, '-created_date');
    },
    enabled: !!organization?.id,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const users = await base44.entities.User.filter({});
      return users.filter(u => 
        u.client_accesses?.some(access => access.organization_id === organization.id)
      );
    },
    enabled: !!organization?.id,
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals-list', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter({ organization_id: organization.id });
    },
    enabled: !!organization?.id,
  });

  const createShareMutation = useMutation({
    mutationFn: async (data) => {
      const publicUrl = data.public_access_enabled 
        ? `${window.location.origin}/shared-calendar/${Math.random().toString(36).substring(2, 15)}`
        : null;

      if (editingShare) {
        return base44.entities.CalendarShare.update(editingShare.id, {
          ...data,
          public_url: publicUrl
        });
      } else {
        return base44.entities.CalendarShare.create({
          ...data,
          organization_id: organization.id,
          owner_email: user.email,
          public_url: publicUrl,
          is_active: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-shares'] });
      setShowDialog(false);
      setEditingShare(null);
      resetForm();
    },
  });

  const deleteShareMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.CalendarShare.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-shares'] });
    },
  });

  const resetForm = () => {
    setFormData({
      share_name: "",
      share_type: "custom_filter",
      filter_config: {
        event_types: [],
        proposal_id: "",
        user_emails: []
      },
      shared_with_users: [],
      public_access_enabled: false
    });
  };

  const handleEdit = (share) => {
    setEditingShare(share);
    setFormData({
      share_name: share.share_name,
      share_type: share.share_type,
      filter_config: share.filter_config || {
        event_types: [],
        proposal_id: "",
        user_emails: []
      },
      shared_with_users: share.shared_with_users || [],
      public_access_enabled: share.public_access_enabled
    });
    setShowDialog(true);
  };

  const copyToClipboard = (url, shareId) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(shareId);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const addUserToShare = (email) => {
    if (!formData.shared_with_users.find(u => u.email === email)) {
      setFormData({
        ...formData,
        shared_with_users: [
          ...formData.shared_with_users,
          { email, permission: "view", accepted: false }
        ]
      });
    }
  };

  const removeUserFromShare = (email) => {
    setFormData({
      ...formData,
      shared_with_users: formData.shared_with_users.filter(u => u.email !== email)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Shared Calendars</h3>
          <p className="text-sm text-slate-600">Share filtered calendar views with your team or clients</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Create Share
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {shares.map((share) => (
          <Card key={share.id} className="border-none shadow-md hover:shadow-lg transition-all">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Share2 className="w-5 h-5" />
                    {share.share_name}
                  </CardTitle>
                  <Badge variant="secondary" className="mt-2 capitalize">
                    {share.share_type.replace('_', ' ')}
                  </Badge>
                </div>
                <Badge variant={share.is_active ? "default" : "secondary"}>
                  {share.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600">
                  Shared with {share.shared_with_users?.length || 0} user{share.shared_with_users?.length !== 1 ? 's' : ''}
                </span>
              </div>

              {share.public_access_enabled && share.public_url && (
                <div className="p-2 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Public Link</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={share.public_url}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(share.public_url, share.id)}
                    >
                      {copiedUrl === share.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(share)}>
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Delete share "${share.share_name}"?`)) {
                      deleteShareMutation.mutate(share.id);
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {shares.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Share2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Shared Calendars</h3>
            <p className="text-sm text-slate-600 mb-4">Share calendar views with team members or clients</p>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Share
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditingShare(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingShare ? 'Edit Shared Calendar' : 'Create Shared Calendar'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Share Name *</label>
              <Input
                value={formData.share_name}
                onChange={(e) => setFormData({ ...formData, share_name: e.target.value })}
                placeholder="e.g., Project X Team Calendar"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Share Type</label>
              <Select value={formData.share_type} onValueChange={(value) => setFormData({ ...formData, share_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_calendar">My Calendar</SelectItem>
                  <SelectItem value="proposal_calendar">Proposal Calendar</SelectItem>
                  <SelectItem value="custom_filter">Custom Filtered View</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.share_type === 'proposal_calendar' && (
              <div>
                <label className="block text-sm font-medium mb-2">Select Proposal</label>
                <Select 
                  value={formData.filter_config.proposal_id} 
                  onValueChange={(value) => setFormData({
                    ...formData,
                    filter_config: { ...formData.filter_config, proposal_id: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a proposal" />
                  </SelectTrigger>
                  <SelectContent>
                    {proposals.map(proposal => (
                      <SelectItem key={proposal.id} value={proposal.id}>
                        {proposal.proposal_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Share With Team Members</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                {teamMembers
                  .filter(m => m.email !== user.email)
                  .map((member) => {
                    const isShared = formData.shared_with_users.find(u => u.email === member.email);
                    return (
                      <div key={member.email} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!isShared}
                            onChange={(e) => {
                              if (e.target.checked) {
                                addUserToShare(member.email);
                              } else {
                                removeUserFromShare(member.email);
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{member.full_name}</span>
                        </div>
                        {isShared && (
                          <Select
                            value={isShared.permission}
                            onValueChange={(value) => {
                              setFormData({
                                ...formData,
                                shared_with_users: formData.shared_with_users.map(u =>
                                  u.email === member.email ? { ...u, permission: value } : u
                                )
                              });
                            }}
                          >
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">View</SelectItem>
                              <SelectItem value="edit">Edit</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-600" />
                  <span className="font-medium">Public Access</span>
                </div>
                <Switch
                  checked={formData.public_access_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, public_access_enabled: checked })}
                />
              </div>
              <p className="text-xs text-slate-500">
                Generate a public read-only link that anyone can access (useful for sharing with external clients)
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createShareMutation.mutate(formData)}
                disabled={!formData.share_name.trim() || createShareMutation.isPending}
              >
                {createShareMutation.isPending ? 'Saving...' : (editingShare ? 'Update Share' : 'Create Share')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}