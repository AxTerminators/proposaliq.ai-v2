import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Mail, 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  Eye,
  Sparkles,
  Users,
  Building2,
  Handshake
} from "lucide-react";
import { toast } from "sonner";
import DataCallTemplateEditor from "./DataCallTemplateEditor";

const DEFAULT_TEMPLATES = [
  {
    id: 'initial_client',
    template_name: 'Initial Request - Client',
    recipient_type: 'client_organization',
    scenario: 'initial',
    subject: 'Information Request: {{data_call_title}}',
    body: `Dear {{recipient_name}},

We are preparing a proposal for {{proposal_name}} and would appreciate your assistance in gathering the following information:

{{checklist_summary}}

Please access the secure portal to upload documents and provide information:
{{portal_link}}

Due Date: {{due_date}}

If you have any questions, please don't hesitate to reach out.

Best regards,
{{creator_name}}
{{organization_name}}`,
    is_default: true,
    is_system: true
  },
  {
    id: 'reminder_client',
    template_name: 'Reminder - Client',
    recipient_type: 'client_organization',
    scenario: 'reminder',
    subject: 'Reminder: {{data_call_title}} - Due {{due_date}}',
    body: `Dear {{recipient_name}},

This is a friendly reminder that we are still awaiting the following information for {{proposal_name}}:

{{pending_items}}

Portal Access: {{portal_link}}
Due Date: {{due_date}}

Progress: {{completed_count}}/{{total_count}} items completed

Thank you for your attention to this matter.

Best regards,
{{creator_name}}`,
    is_default: true,
    is_system: true
  },
  {
    id: 'initial_internal',
    template_name: 'Initial Request - Internal Team',
    recipient_type: 'internal_team_member',
    scenario: 'initial',
    subject: 'Action Required: {{data_call_title}}',
    body: `Hi {{recipient_name}},

I need your help gathering information for {{proposal_name}}.

Required Items:
{{checklist_summary}}

Portal Link: {{portal_link}}
Due: {{due_date}}

Let me know if you have any questions!

Thanks,
{{creator_name}}`,
    is_default: true,
    is_system: true
  },
  {
    id: 'initial_partner',
    template_name: 'Initial Request - Teaming Partner',
    recipient_type: 'teaming_partner',
    scenario: 'initial',
    subject: 'Teaming Partner Data Request: {{data_call_title}}',
    body: `Dear {{recipient_name}},

As we prepare our joint proposal for {{proposal_name}}, we need the following information from your organization:

{{checklist_summary}}

Secure Upload Portal: {{portal_link}}
Submission Deadline: {{due_date}}

Please let us know if you have any questions about the requirements.

Best regards,
{{creator_name}}
{{organization_name}}`,
    is_default: true,
    is_system: true
  }
];

export default function DataCallEmailTemplateManager({ organization }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRecipient, setFilterRecipient] = useState('all');
  const [filterScenario, setFilterScenario] = useState('all');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  // Fetch custom templates from EmailTemplate entity
  const { data: customTemplates = [], isLoading } = useQuery({
    queryKey: ['email-templates', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const templates = await base44.entities.EmailTemplate.filter({
        tags: 'data_call'
      });
      
      return templates.map(t => ({
        id: t.id,
        template_name: t.template_name,
        recipient_type: t.tags?.find(tag => ['client_organization', 'internal_team_member', 'teaming_partner'].includes(tag)) || 'client_organization',
        scenario: t.tags?.find(tag => ['initial', 'reminder', 'completion'].includes(tag)) || 'initial',
        subject: t.subject,
        body: t.body,
        is_default: false,
        is_system: false,
        created_date: t.created_date,
        usage_count: 0 // Would track this in production
      }));
    },
    enabled: !!organization?.id
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      await base44.entities.EmailTemplate.delete(templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete template: ' + error.message);
    }
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template) => {
      const newTemplate = await base44.entities.EmailTemplate.create({
        template_name: `${template.template_name} (Copy)`,
        template_type: 'notification',
        subject: template.subject,
        body: template.body,
        tags: ['data_call', template.recipient_type, template.scenario]
      });
      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template duplicated!');
    },
    onError: (error) => {
      toast.error('Failed to duplicate: ' + error.message);
    }
  });

  // Combine default and custom templates
  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

  // Filter templates
  const filteredTemplates = allTemplates.filter(template => {
    const matchesSearch = template.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRecipient = filterRecipient === 'all' || template.recipient_type === filterRecipient;
    const matchesScenario = filterScenario === 'all' || template.scenario === filterScenario;
    
    return matchesSearch && matchesRecipient && matchesScenario;
  });

  const getRecipientIcon = (type) => {
    switch (type) {
      case 'client_organization': return Building2;
      case 'internal_team_member': return Users;
      case 'teaming_partner': return Handshake;
      default: return Mail;
    }
  };

  const getScenarioColor = (scenario) => {
    switch (scenario) {
      case 'initial': return 'bg-blue-100 text-blue-700';
      case 'reminder': return 'bg-amber-100 text-amber-700';
      case 'completion': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-600" />
            Email Templates
          </h2>
          <p className="text-slate-600 mt-1">
            Customize email notifications for data call requests
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setShowEditor(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Available Placeholders Reference */}
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Available Placeholders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-2 text-sm">
            {[
              '{{data_call_title}}',
              '{{recipient_name}}',
              '{{due_date}}',
              '{{portal_link}}',
              '{{creator_name}}',
              '{{organization_name}}',
              '{{proposal_name}}',
              '{{checklist_summary}}',
              '{{pending_items}}',
              '{{completed_count}}',
              '{{total_count}}',
              '{{priority}}'
            ].map(placeholder => (
              <code 
                key={placeholder}
                className="px-2 py-1 bg-white rounded border border-purple-200 text-purple-700 cursor-pointer hover:bg-purple-100"
                onClick={() => {
                  navigator.clipboard.writeText(placeholder);
                  toast.success('Copied to clipboard!');
                }}
              >
                {placeholder}
              </code>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        
        <Select value={filterRecipient} onValueChange={setFilterRecipient}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Recipient Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Recipients</SelectItem>
            <SelectItem value="client_organization">Client Organization</SelectItem>
            <SelectItem value="internal_team_member">Internal Team</SelectItem>
            <SelectItem value="teaming_partner">Teaming Partner</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterScenario} onValueChange={setFilterScenario}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Scenario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scenarios</SelectItem>
            <SelectItem value="initial">Initial Request</SelectItem>
            <SelectItem value="reminder">Reminder</SelectItem>
            <SelectItem value="completion">Completion</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600">No templates found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredTemplates.map(template => {
            const RecipientIcon = getRecipientIcon(template.recipient_type);
            
            return (
              <Card key={template.id} className="border-2 hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <RecipientIcon className="w-4 h-4 text-slate-600" />
                        <CardTitle className="text-base">{template.template_name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getScenarioColor(template.scenario)}>
                          {template.scenario}
                        </Badge>
                        {template.is_system && (
                          <Badge variant="secondary" className="text-xs">
                            System Default
                          </Badge>
                        )}
                        {template.is_default && !template.is_system && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">Subject:</p>
                    <p className="text-sm text-slate-900 font-medium">{template.subject}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">Body Preview:</p>
                    <p className="text-xs text-slate-600 line-clamp-3 font-mono bg-slate-50 p-2 rounded">
                      {template.body}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    {!template.is_system && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTemplate(template);
                            setShowEditor(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Delete this template?')) {
                              deleteTemplateMutation.mutate(template.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateTemplateMutation.mutate(template)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Template Editor Dialog */}
      <DataCallTemplateEditor
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
        organization={organization}
      />
    </div>
  );
}