import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Plus, X, Send, Loader2, Users, Building2, Handshake, Calendar, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { createPageUrl } from "@/utils";
import DataCallTemplateLibrary from "./DataCallTemplateLibrary";
import AIChecklistSuggester from "./AIChecklistSuggester";

export default function DataCallInitiator({ 
  isOpen, 
  onClose, 
  proposal, 
  organization,
  user
}) {
  const queryClient = useQueryClient();
  const [recipientType, setRecipientType] = useState('client_organization');
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showAISuggester, setShowAISuggester] = useState(false);
  const [formData, setFormData] = useState({
    request_title: "",
    request_description: "",
    overall_status: "draft",
    request_type: proposal ? "proposal_specific" : "general_library",
    recipient_type: "client_organization",
    client_organization_id: "",
    assigned_to_email: "",
    assigned_to_name: "",
    teaming_partner_id: "",
    due_date: "",
    priority: "medium",
    checklist_items: []
  });

  const isConsultingFirm = organization?.organization_type === 'consulting_firm' || 
                           organization?.organization_type === 'consultancy';

  // Fetch client organizations (for consulting firms)
  const { data: clientOrgs = [] } = useQuery({
    queryKey: ['client-organizations', organization?.id],
    queryFn: async () => {
      if (!isConsultingFirm) return [];
      return base44.entities.Organization.filter({
        parent_organization_id: organization.id,
        organization_type: 'client_organization'
      });
    },
    enabled: isConsultingFirm && isOpen
  });

  // Fetch teaming partners
  const { data: teamingPartners = [] } = useQuery({
    queryKey: ['teaming-partners', organization?.id],
    queryFn: async () => {
      return base44.entities.TeamingPartner.filter({
        organization_id: organization.id
      });
    },
    enabled: isOpen
  });

  // Fetch team members from selected client organization
  const { data: clientTeamMembers = [] } = useQuery({
    queryKey: ['client-team-members', formData.client_organization_id],
    queryFn: async () => {
      if (!formData.client_organization_id) return [];
      return base44.entities.ClientTeamMember.filter({
        organization_id: formData.client_organization_id,
        is_active: true
      });
    },
    enabled: isOpen && recipientType === 'client_organization' && !!formData.client_organization_id
  });

  // NEW: Fetch internal team members (all users in the consulting firm organization)
  const { data: internalTeamMembers = [] } = useQuery({
    queryKey: ['internal-team-members', organization?.id],
    queryFn: async () => {
      // Fetch all users - they're automatically filtered by organization on the backend
      return base44.entities.User.list();
    },
    enabled: isOpen && recipientType === 'internal_team_member'
  });

  const createDataCallMutation = useMutation({
    mutationFn: async (dataCallData) => {
      // Generate secure access token
      const access_token = nanoid(32);
      const token_expires_at = new Date();
      token_expires_at.setDate(token_expires_at.getDate() + 90); // 90-day expiration

      const created = await base44.entities.DataCallRequest.create({
        ...dataCallData,
        organization_id: organization.id,
        proposal_id: proposal?.id || null,
        created_by_email: user.email,
        created_by_name: user.full_name,
        overall_status: 'draft', // Data calls are initially created as draft, then can be sent
        access_token,
        token_expires_at: token_expires_at.toISOString()
      });

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-call-requests'] });
    },
    onError: (error) => {
      toast.error('Failed to create data call: ' + error.message);
    }
  });

  const addChecklistItem = () => {
    const newItem = {
      id: nanoid(),
      item_label: "",
      item_description: "",
      is_required: true,
      status: "pending",
      uploaded_files: []
    };
    
    setFormData({
      ...formData,
      checklist_items: [...formData.checklist_items, newItem]
    });
  };

  const updateChecklistItem = (id, field, value) => {
    setFormData({
      ...formData,
      checklist_items: formData.checklist_items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    });
  };

  const removeChecklistItem = (id) => {
    setFormData({
      ...formData,
      checklist_items: formData.checklist_items.filter(item => item.id !== id)
    });
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.request_title?.trim()) {
      toast.error('Please enter a request title');
      return;
    }

    if (formData.checklist_items.length === 0) {
      toast.error('Please add at least one checklist item');
      return;
    }

    if (recipientType === 'client_organization' && !isConsultingFirm) {
      toast.error('Client Organization data calls are not available for your organization type.');
      return;
    }
    if (recipientType === 'client_organization' && !formData.client_organization_id) {
      toast.error('Please select a client organization');
      return;
    }

    if (recipientType === 'teaming_partner' && !formData.teaming_partner_id) {
      toast.error('Please select a teaming partner');
      return;
    }

    if (!formData.assigned_to_email?.trim()) {
      toast.error('Please specify who should receive this request');
      return;
    }

    const hasEmptyItems = formData.checklist_items.some(item => !item.item_label?.trim());
    if (hasEmptyItems) {
      toast.error('All checklist items must have a label');
      return;
    }

    createDataCallMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Data call request saved as draft successfully!');
        onClose();
        resetForm();
      }
    });
  };

  const handleSendNow = async () => {
    // Validate first
    if (!formData.request_title?.trim()) {
      toast.error('Please enter a request title');
      return;
    }

    if (formData.checklist_items.length === 0) {
      toast.error('Please add at least one checklist item');
      return;
    }

    if (recipientType === 'client_organization' && !isConsultingFirm) {
      toast.error('Client Organization data calls are not available for your organization type.');
      return;
    }
    if (recipientType === 'client_organization' && !formData.client_organization_id) {
      toast.error('Please select a client organization');
      return;
    }

    if (recipientType === 'teaming_partner' && !formData.teaming_partner_id) {
      toast.error('Please select a teaming partner');
      return;
    }

    if (!formData.assigned_to_email?.trim()) {
      toast.error('Please specify who should receive this request');
      return;
    }

    const hasEmptyItems = formData.checklist_items.some(item => !item.item_label?.trim());
    if (hasEmptyItems) {
      toast.error('All checklist items must have a label');
      return;
    }

    try {
      // Create the data call first
      const createdDataCall = await createDataCallMutation.mutateAsync(formData);
      
      console.log('[DataCallInitiator] ✅ Data call created:', createdDataCall.id);
      
      // UPDATED: Generate portal URL pointing to the authenticated React page with token
      const portalUrl = `${window.location.origin}${createPageUrl('ClientDataCallPortal')}?token=${createdDataCall.access_token}&id=${createdDataCall.id}`;
      console.log('[DataCallInitiator] 🔗 Generated portal URL:', portalUrl);
      
      // Send the notification email with the portal URL
      console.log('[DataCallInitiator] 📧 Sending email notification...');
      const emailResponse = await base44.functions.invoke('sendDataCallNotification', {
        data_call_id: createdDataCall.id,
        notification_type: 'initial',
        portal_url: portalUrl
      });

      console.log('[DataCallInitiator] 📧 Email response:', emailResponse);

      if (emailResponse.data?.success) {
        toast.success('✅ Data call sent successfully with email notification!');
      } else {
        toast.warning('Data call created but email notification may have failed. Check the Data Calls page.');
      }
      
      // Always close and reset if data call creation was successful
      onClose();
      resetForm();

    } catch (error) {
      console.error('[DataCallInitiator] Error in handleSendNow:', error);
      
      // Check if data call was created but email failed
      if (error.message && error.message.includes('email')) {
        toast.warning('Data call created but email notification failed. You can resend from the Data Calls page.');
      } else {
        toast.error('Failed to send data call: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      request_title: "",
      request_description: "",
      request_type: proposal ? "proposal_specific" : "general_library",
      recipient_type: "client_organization",
      client_organization_id: "",
      assigned_to_email: "",
      assigned_to_name: "",
      teaming_partner_id: "",
      due_date: "",
      priority: "medium",
      checklist_items: []
    });
    setRecipientType('client_organization');
    setShowTemplateLibrary(false);
  };

  const handleTemplateSelect = (templateData) => {
    setFormData({
      ...formData,
      request_title: templateData.request_title,
      request_description: templateData.request_description,
      checklist_items: templateData.checklist_items
    });
  };

  const handleAIItemsGenerated = (items) => {
    setFormData({
      ...formData,
      checklist_items: [...formData.checklist_items, ...items]
    });
  };

  // NEW: Handle quick add user based on recipient type
  const handleQuickAddUser = () => {
    if (recipientType === 'client_organization') {
      // Navigate to client team management within the client workspace
      if (formData.client_organization_id) {
        window.open(createPageUrl('ClientOrganizationManager') + `?clientId=${formData.client_organization_id}&action=add_team_member`, '_blank');
      } else {
        toast.error('Please select a client organization first');
      }
    } else if (recipientType === 'internal_team_member') {
      // Navigate to Team management page
      window.open(createPageUrl('Team') + '?action=invite_user', '_blank');
    } else if (recipientType === 'teaming_partner') {
      // Navigate to Teaming Partners page
      window.open(createPageUrl('TeamingPartners') + '?action=add_partner', '_blank');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          onClose();
          resetForm();
        }
      }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            Create Data Call Request
          </DialogTitle>
          <p className="text-sm text-slate-600">
            Request specific documents and information {proposal ? `for ${proposal.proposal_name}` : 'for your content library'}
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {showTemplateLibrary ? (
            <DataCallTemplateLibrary
              onSelectTemplate={handleTemplateSelect}
              onClose={() => setShowTemplateLibrary(false)}
              organization={organization}
            />
          ) : (
            <>
              {/* Template Library and AI Suggester Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTemplateLibrary(true)}
                  className="border-purple-300 hover:bg-purple-50"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Use Template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAISuggester(true)}
                  className="border-blue-300 hover:bg-blue-50"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Suggest Items
                </Button>
              </div>

              {/* Recipient Type Selection */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={recipientType === 'client_organization' ? 'default' : 'outline'}
                  onClick={() => {
                    setRecipientType('client_organization');
                    setFormData(prev => ({
                      ...prev,
                      recipient_type: 'client_organization',
                      client_organization_id: "",
                      assigned_to_email: "",
                      assigned_to_name: "",
                      teaming_partner_id: ""
                    }));
                  }}
                  className="flex-1"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Client Organization
                  {!isConsultingFirm && <Badge variant="secondary" className="ml-2 text-xs">Not Available</Badge>}
                </Button>
                <Button
                  type="button"
                  variant={recipientType === 'internal_team_member' ? 'default' : 'outline'}
                  onClick={() => {
                    setRecipientType('internal_team_member');
                    setFormData(prev => ({
                      ...prev,
                      recipient_type: 'internal_team_member',
                      client_organization_id: "",
                      assigned_to_email: "",
                      assigned_to_name: "",
                      teaming_partner_id: ""
                    }));
                  }}
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Internal Team Member
                </Button>
                <Button
                  type="button"
                  variant={recipientType === 'teaming_partner' ? 'default' : 'outline'}
                  onClick={() => {
                    setRecipientType('teaming_partner');
                    setFormData(prev => ({
                      ...prev,
                      recipient_type: 'teaming_partner',
                      client_organization_id: "",
                      assigned_to_email: "",
                      assigned_to_name: "",
                      teaming_partner_id: ""
                    }));
                  }}
                  className="flex-1"
                >
                  <Handshake className="w-4 h-4 mr-2" />
                  Teaming Partner
                </Button>
              </div>

              {/* Show warning if Client Organization selected but not available */}
              {recipientType === 'client_organization' && !isConsultingFirm && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-900">
                    ⚠️ Client Organization data calls are only available for consulting firms. Please select Internal Team Member or Teaming Partner instead.
                  </p>
                </div>
              )}

              {/* Basic Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Request Title *</Label>
                  <Input
                    value={formData.request_title}
                    onChange={(e) => setFormData({...formData, request_title: e.target.value})}
                    placeholder="e.g., Technical Capability Documentation for RFP-2024-001"
                  />
                </div>

                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.request_description}
                    onChange={(e) => setFormData({...formData, request_description: e.target.value})}
                    placeholder="Explain what information you need and how it will be used..."
                    rows={3}
                  />
                </div>

                {/* Recipient Selection - Client Organization */}
                {recipientType === 'client_organization' && (
                  <>
                    <div>
                      <Label>Client Organization *</Label>
                      <Select
                        value={formData.client_organization_id}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          client_organization_id: value,
                          assigned_to_email: "",
                          assigned_to_name: ""
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select client..." />
                        </SelectTrigger>
                        <SelectContent>
                          {clientOrgs.map(org => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.organization_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Assign To Team Member *</Label>
                      <Select
                        value={formData.assigned_to_email}
                        onValueChange={(value) => {
                          const member = clientTeamMembers.find(m => m.member_email === value);
                          setFormData({
                            ...formData,
                            assigned_to_email: value,
                            assigned_to_name: member?.member_name || ""
                          });
                        }}
                        disabled={!formData.client_organization_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member..." />
                        </SelectTrigger>
                        <SelectContent>
                          {clientTeamMembers.map(member => (
                            <SelectItem key={member.id} value={member.member_email}>
                              {member.member_name} - {member.member_title || 'No title'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* NEW: Help text with quick add button */}
                      {formData.client_organization_id && clientTeamMembers.length === 0 && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                          <p className="text-xs text-blue-900 flex-1">
                            Don't see someone you need to send this to? Grant them access by adding them to your account.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleQuickAddUser}
                            className="h-7 text-xs border-blue-300 hover:bg-blue-100"
                          >
                            <UserPlus className="w-3 h-3 mr-1" />
                            Add User
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Recipient Selection - Internal Team Member */}
                {recipientType === 'internal_team_member' && (
                  <>
                    <div className="col-span-2">
                      <Label>Team Member *</Label>
                      <Select
                        value={formData.assigned_to_email}
                        onValueChange={(value) => {
                          const member = internalTeamMembers.find(m => m.email === value);
                          setFormData({
                            ...formData,
                            assigned_to_email: value,
                            assigned_to_name: member?.full_name || ""
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member..." />
                        </SelectTrigger>
                        <SelectContent>
                          {internalTeamMembers.map(member => (
                            <SelectItem key={member.id} value={member.email}>
                              {member.full_name} ({member.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* NEW: Help text with quick add button */}
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                        <p className="text-xs text-blue-900 flex-1">
                          Don't see someone you need to send this to? Grant them access by adding them to your account.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleQuickAddUser}
                          className="h-7 text-xs border-blue-300 hover:bg-blue-100"
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          Add User
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Recipient Selection - Teaming Partner */}
                {recipientType === 'teaming_partner' && (
                  <>
                    <div className="col-span-2">
                      <Label>Teaming Partner *</Label>
                      <Select
                        value={formData.teaming_partner_id}
                        onValueChange={(value) => {
                          const partner = teamingPartners.find(p => p.id === value);
                          setFormData({
                            ...formData,
                            teaming_partner_id: value,
                            assigned_to_email: partner?.poc_email || "",
                            assigned_to_name: partner?.poc_name || ""
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select partner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {teamingPartners.map(partner => (
                            <SelectItem key={partner.id} value={partner.id}>
                              {partner.partner_name} {partner.poc_name && `(${partner.poc_name})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* NEW: Help text with quick add button */}
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                        <p className="text-xs text-blue-900 flex-1">
                          Don't see someone you need to send this to? Grant them access by adding them to your account.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleQuickAddUser}
                          className="h-7 text-xs border-blue-300 hover:bg-blue-100"
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          Add Partner
                        </Button>
                      </div>
                    </div>

                    {/* Show contact email field (editable if needed) */}
                    {formData.teaming_partner_id && (
                      <div className="col-span-2">
                        <Label>Contact Email</Label>
                        <Input
                          type="email"
                          value={formData.assigned_to_email}
                          onChange={(e) => setFormData({...formData, assigned_to_email: e.target.value})}
                          placeholder="Override default contact email"
                        />
                      </div>
                    )}
                  </>
                )}

                <div>
                  <Label>Due Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({...formData, priority: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Checklist Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Requested Items *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addChecklistItem}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {formData.checklist_items.length === 0 ? (
                    <Card 
                      className="border-dashed border-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                      onClick={addChecklistItem}
                    >
                      <CardContent className="p-6 text-center text-slate-500">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>No items added yet. Click here to add your first item.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    formData.checklist_items.map((item, index) => (
                      <Card key={item.id} className="border-2">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  Item {index + 1}
                                </Badge>
                                <Checkbox
                                  id={`required-${item.id}`}
                                  checked={item.is_required}
                                  onCheckedChange={(checked) => 
                                    updateChecklistItem(item.id, 'is_required', checked)
                                  }
                                />
                                <Label htmlFor={`required-${item.id}`} className="text-sm cursor-pointer">
                                  Required
                                </Label>
                              </div>

                              <Input
                                value={item.item_label}
                                onChange={(e) => updateChecklistItem(item.id, 'item_label', e.target.value)}
                                placeholder="What document or information is needed?"
                                className="font-medium"
                              />

                              <Textarea
                                value={item.item_description}
                                onChange={(e) => updateChecklistItem(item.id, 'item_description', e.target.value)}
                                placeholder="Provide details: format, content requirements, examples..."
                                rows={2}
                                className="text-sm"
                              />
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeChecklistItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    resetForm();
                  }}
                  disabled={createDataCallMutation.isPending}
                >
                  Cancel
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={createDataCallMutation.isPending}
                    variant="outline"
                  >
                    Save as Draft
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={handleSendNow}
                    disabled={createDataCallMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createDataCallMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Request
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <AIChecklistSuggester
      isOpen={showAISuggester}
      onClose={() => setShowAISuggester(false)}
      dataCall={formData}
      proposal={proposal}
      onItemsGenerated={handleAIItemsGenerated}
    />
    </>
  );
}