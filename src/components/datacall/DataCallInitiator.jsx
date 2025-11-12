import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Database,
  Plus,
  Trash2,
  Send,
  Loader2,
  Calendar,
  User,
  Building2,
  Handshake,
  X,
  Mail
} from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";

export default function DataCallInitiator({ proposal, organization, trigger, onSuccess }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [recipientType, setRecipientType] = useState('client_organization');
  const [formData, setFormData] = useState({
    request_title: '',
    request_description: '',
    due_date: '',
    priority: 'medium',
    recipient_organization_id: '',
    assigned_to_email: '',
    assigned_to_name: '',
    teaming_partner_id: '',
    checklist_items: [
      {
        id: nanoid(),
        item_name: '',
        description: '',
        is_required: true,
        file_type_hint: ''
      }
    ]
  });

  const isConsultingFirm = organization?.organization_type === 'consulting_firm' ||
                           organization?.organization_type === 'consultancy' ||
                           (organization?.organization_type === 'demo' && organization?.demo_view_mode === 'consultancy');
  
  const isCorporate = !isConsultingFirm;

  // Fetch client organizations (for consulting firms)
  const { data: clientOrgs = [] } = useQuery({
    queryKey: ['client-organizations', organization?.id],
    queryFn: async () => {
      if (!organization?.id || !isConsultingFirm) return [];
      return base44.entities.Organization.filter({
        organization_type: 'client_organization',
        parent_organization_id: organization.id
      });
    },
    enabled: !!organization?.id && isConsultingFirm,
  });

  // Fetch client team members
  const { data: clientTeamMembers = [] } = useQuery({
    queryKey: ['client-team-members', formData.recipient_organization_id],
    queryFn: async () => {
      if (!formData.recipient_organization_id || recipientType !== 'client_organization') return [];
      return base44.entities.ClientTeamMember.filter({
        organization_id: formData.recipient_organization_id,
        is_active: true
      });
    },
    enabled: !!formData.recipient_organization_id && recipientType === 'client_organization',
  });

  // Fetch internal team members (for corporate accounts)
  const { data: internalUsers = [] } = useQuery({
    queryKey: ['internal-users', organization?.id],
    queryFn: async () => {
      if (!organization?.id || !isCorporate || recipientType !== 'internal_team_member') return [];
      
      const response = await base44.functions.invoke('getOrganizationUsers', {
        organization_id: organization.id
      });
      
      return response.data?.users || [];
    },
    enabled: !!organization?.id && isCorporate && recipientType === 'internal_team_member',
  });

  // Fetch teaming partners
  const { data: teamingPartners = [] } = useQuery({
    queryKey: ['teaming-partners', organization?.id],
    queryFn: async () => {
      if (!organization?.id || recipientType !== 'teaming_partner') return [];
      return base44.entities.TeamingPartner.filter({
        organization_id: organization.id,
        relationship_status: 'active'
      });
    },
    enabled: !!organization?.id && recipientType === 'teaming_partner',
  });

  const createDataCallMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('createDataCallRequest', {
        proposal_id: proposal.id,
        organization_id: organization.id,
        recipient_type: recipientType,
        recipient_organization_id: formData.recipient_organization_id || null,
        assigned_to_email: formData.assigned_to_email,
        assigned_to_name: formData.assigned_to_name,
        teaming_partner_id: formData.teaming_partner_id || null,
        request_title: formData.request_title,
        request_description: formData.request_description,
        due_date: formData.due_date,
        priority: formData.priority,
        checklist_items: formData.checklist_items.filter(item => item.item_name.trim()),
        created_by_email: (await base44.auth.me()).email,
        created_by_name: (await base44.auth.me()).full_name
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create data call request');
      }

      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['data-call-requests'] });
      toast.success(`✅ Data call request created! Portal link: ${result.portal_url}`);
      setIsOpen(false);
      resetForm();
      if (onSuccess) onSuccess(result);
    },
    onError: (error) => {
      toast.error('Failed to create data call: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      request_title: '',
      request_description: '',
      due_date: '',
      priority: 'medium',
      recipient_organization_id: '',
      assigned_to_email: '',
      assigned_to_name: '',
      teaming_partner_id: '',
      checklist_items: [
        {
          id: nanoid(),
          item_name: '',
          description: '',
          is_required: true,
          file_type_hint: ''
        }
      ]
    });
    setRecipientType(isConsultingFirm ? 'client_organization' : 'internal_team_member');
  };

  const addChecklistItem = () => {
    setFormData({
      ...formData,
      checklist_items: [
        ...formData.checklist_items,
        {
          id: nanoid(),
          item_name: '',
          description: '',
          is_required: true,
          file_type_hint: ''
        }
      ]
    });
  };

  const removeChecklistItem = (id) => {
    setFormData({
      ...formData,
      checklist_items: formData.checklist_items.filter(item => item.id !== id)
    });
  };

  const updateChecklistItem = (id, updates) => {
    setFormData({
      ...formData,
      checklist_items: formData.checklist_items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    });
  };

  const handleRecipientOrgChange = (orgId) => {
    setFormData({
      ...formData,
      recipient_organization_id: orgId,
      assigned_to_email: '',
      assigned_to_name: ''
    });
  };

  const handleTeamMemberChange = (memberId) => {
    const member = clientTeamMembers.find(m => m.id === memberId) ||
                   internalUsers.find(u => u.id === memberId);
    
    if (member) {
      setFormData({
        ...formData,
        assigned_to_email: member.member_email || member.email,
        assigned_to_name: member.member_name || member.full_name
      });
    }
  };

  const handleTeamingPartnerChange = (partnerId) => {
    const partner = teamingPartners.find(p => p.id === partnerId);
    if (partner) {
      setFormData({
        ...formData,
        teaming_partner_id: partnerId,
        assigned_to_email: partner.poc_email || '',
        assigned_to_name: partner.poc_name || partner.partner_name
      });
    }
  };

  const handleSubmit = () => {
    if (!formData.request_title.trim()) {
      toast.error('Request title is required');
      return;
    }

    if (!formData.assigned_to_email) {
      toast.error('Please select a recipient');
      return;
    }

    const validItems = formData.checklist_items.filter(item => item.item_name.trim());
    if (validItems.length === 0) {
      toast.error('Please add at least one checklist item');
      return;
    }

    createDataCallMutation.mutate();
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {trigger}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Database className="w-6 h-6 text-blue-600" />
              Request Data for {proposal?.proposal_name}
            </DialogTitle>
            <DialogDescription>
              Create a secure portal link to collect specific documents and data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Recipient Type Selection */}
            <div>
              <Label>Request Type</Label>
              <div className="flex gap-2 mt-2">
                {isConsultingFirm && (
                  <Button
                    type="button"
                    variant={recipientType === 'client_organization' ? 'default' : 'outline'}
                    onClick={() => setRecipientType('client_organization')}
                    className="flex-1"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    From Client
                  </Button>
                )}
                {isCorporate && (
                  <Button
                    type="button"
                    variant={recipientType === 'internal_team_member' ? 'default' : 'outline'}
                    onClick={() => setRecipientType('internal_team_member')}
                    className="flex-1"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Internal Team
                  </Button>
                )}
                <Button
                  type="button"
                  variant={recipientType === 'teaming_partner' ? 'default' : 'outline'}
                  onClick={() => setRecipientType('teaming_partner')}
                  className="flex-1"
                >
                  <Handshake className="w-4 h-4 mr-2" />
                  Teaming Partner
                </Button>
              </div>
            </div>

            {/* Client Organization Selection (Consulting Firms) */}
            {recipientType === 'client_organization' && isConsultingFirm && (
              <div>
                <Label>Client Organization</Label>
                <Select
                  value={formData.recipient_organization_id}
                  onValueChange={handleRecipientOrgChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client organization..." />
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
            )}

            {/* Client Team Member Selection */}
            {recipientType === 'client_organization' && formData.recipient_organization_id && (
              <div>
                <Label>Assign to Client Team Member</Label>
                <Select
                  value={formData.assigned_to_email}
                  onValueChange={(memberId) => handleTeamMemberChange(memberId)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientTeamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.member_name} ({member.member_email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Internal Team Member Selection (Corporate) */}
            {recipientType === 'internal_team_member' && (
              <div>
                <Label>Assign to Internal Team Member</Label>
                <Select
                  value={formData.assigned_to_email}
                  onValueChange={(userId) => handleTeamMemberChange(userId)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {internalUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Teaming Partner Selection */}
            {recipientType === 'teaming_partner' && (
              <div>
                <Label>Select Teaming Partner</Label>
                <Select
                  value={formData.teaming_partner_id}
                  onValueChange={handleTeamingPartnerChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select partner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teamingPartners.map(partner => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.partner_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Request Details */}
            <div>
              <Label>Request Title *</Label>
              <Input
                value={formData.request_title}
                onChange={(e) => setFormData({...formData, request_title: e.target.value})}
                placeholder="Financial documents for proposal"
                className={!formData.request_title && "border-red-300"}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.request_description}
                onChange={(e) => setFormData({...formData, request_description: e.target.value})}
                placeholder="We need the following documents to complete the proposal..."
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                />
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Required Items Checklist</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addChecklistItem}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto border rounded-lg p-3 bg-slate-50">
                {formData.checklist_items.map((item, idx) => (
                  <div key={item.id} className="bg-white border rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={item.item_name}
                          onChange={(e) => updateChecklistItem(item.id, { item_name: e.target.value })}
                          placeholder={`Item ${idx + 1}: e.g., "Financial Statements (Last 3 Years)"`}
                          className="font-medium"
                        />
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateChecklistItem(item.id, { description: e.target.value })}
                          placeholder="Additional details or instructions..."
                          rows={2}
                          className="text-sm"
                        />
                        <Input
                          value={item.file_type_hint}
                          onChange={(e) => updateChecklistItem(item.id, { file_type_hint: e.target.value })}
                          placeholder="File type hint (e.g., PDF, Excel, Word)"
                          className="text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={item.is_required}
                            onCheckedChange={(checked) => updateChecklistItem(item.id, { is_required: checked })}
                          />
                          <Label className="text-xs cursor-pointer">Required</Label>
                        </div>
                        {formData.checklist_items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeChecklistItem(item.id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                🔒 <strong>Secure Portal:</strong> A unique, secure link will be generated and can be sent via email. 
                {recipientType === 'client_organization' && ' The client team member can upload documents without logging in.'}
                {recipientType === 'internal_team_member' && ' The internal team member will receive a direct link to submit the requested data.'}
                {recipientType === 'teaming_partner' && ' The teaming partner will receive a secure link to submit documents.'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={createDataCallMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createDataCallMutation.isPending || !formData.request_title || !formData.assigned_to_email}
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
                  Create & Generate Link
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}