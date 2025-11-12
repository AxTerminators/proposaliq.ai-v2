import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Eye, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function DataCallTemplateEditorDialog({ 
  isOpen, 
  onClose, 
  template,
  organization 
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(template || {
    template_name: '',
    recipient_type: 'client_organization',
    scenario: 'initial',
    subject: '',
    body: '',
    is_default: false
  });

  React.useEffect(() => {
    if (template) {
      setFormData(template);
    }
  }, [template]);

  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData) => {
      const tags = [
        'data_call',
        templateData.recipient_type,
        templateData.scenario
      ];

      if (template?.id && !template.is_system) {
        // Update existing
        return await base44.entities.EmailTemplate.update(template.id, {
          template_name: templateData.template_name,
          subject: templateData.subject,
          body: templateData.body,
          tags
        });
      } else {
        // Create new
        return await base44.entities.EmailTemplate.create({
          template_name: templateData.template_name,
          template_type: 'notification',
          subject: templateData.subject,
          body: templateData.body,
          tags,
          from_name: organization?.organization_name || 'ProposalIQ.ai',
          is_active: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success(template ? 'Template updated!' : 'Template created!');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to save template: ' + error.message);
    }
  });

  const handleSave = () => {
    if (!formData.template_name?.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!formData.subject?.trim()) {
      toast.error('Please enter an email subject');
      return;
    }
    if (!formData.body?.trim()) {
      toast.error('Please enter email body content');
      return;
    }

    saveTemplateMutation.mutate(formData);
  };

  const insertPlaceholder = (placeholder) => {
    const textarea = document.getElementById('template-body');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.body || '';
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      
      setFormData({ ...formData, body: newText });
      
      // Reset cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    }
  };

  const PLACEHOLDER_GROUPS = {
    'Basic Info': [
      { key: '{{data_call_title}}', desc: 'Data call title' },
      { key: '{{recipient_name}}', desc: 'Recipient name' },
      { key: '{{creator_name}}', desc: 'Your name' },
      { key: '{{organization_name}}', desc: 'Your organization' }
    ],
    'Dates & Links': [
      { key: '{{due_date}}', desc: 'Due date' },
      { key: '{{portal_link}}', desc: 'Access portal link' },
      { key: '{{created_date}}', desc: 'Creation date' }
    ],
    'Proposal Info': [
      { key: '{{proposal_name}}', desc: 'Related proposal' },
      { key: '{{solicitation_number}}', desc: 'Solicitation #' },
      { key: '{{agency_name}}', desc: 'Government agency' }
    ],
    'Progress': [
      { key: '{{checklist_summary}}', desc: 'Full checklist' },
      { key: '{{pending_items}}', desc: 'Incomplete items only' },
      { key: '{{completed_count}}', desc: 'Items completed' },
      { key: '{{total_count}}', desc: 'Total items' },
      { key: '{{progress_percentage}}', desc: 'Completion %' }
    ]
  };

  // Generate preview with sample data
  const getPreview = () => {
    const sampleData = {
      '{{data_call_title}}': 'Technical Capability Documentation',
      '{{recipient_name}}': 'John Smith',
      '{{creator_name}}': 'Sarah Johnson',
      '{{organization_name}}': organization?.organization_name || 'Acme Consulting',
      '{{due_date}}': 'March 15, 2024',
      '{{portal_link}}': 'https://app.proposaliq.ai/data-call/abc123',
      '{{created_date}}': 'March 1, 2024',
      '{{proposal_name}}': 'DoD Cybersecurity Services RFP',
      '{{solicitation_number}}': 'W911QY-24-R-0001',
      '{{agency_name}}': 'Department of Defense',
      '{{checklist_summary}}': '1. Company capability statement\n2. Past performance references\n3. Key personnel resumes',
      '{{pending_items}}': '1. Company capability statement\n2. Past performance references',
      '{{completed_count}}': '1',
      '{{total_count}}': '3',
      '{{progress_percentage}}': '33%',
      '{{priority}}': 'High'
    };

    let preview = formData.body || '';
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    return preview;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Mail className="w-6 h-6 text-blue-600" />
            {template ? 'Edit Email Template' : 'Create Email Template'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">
              <Mail className="w-4 h-4 mr-2" />
              Edit Template
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={formData.template_name}
                  onChange={(e) => setFormData({...formData, template_name: e.target.value})}
                  placeholder="e.g., Initial Request - Urgent Client"
                />
              </div>

              <div>
                <Label>Recipient Type *</Label>
                <Select
                  value={formData.recipient_type}
                  onValueChange={(value) => setFormData({...formData, recipient_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client_organization">Client Organization</SelectItem>
                    <SelectItem value="internal_team_member">Internal Team Member</SelectItem>
                    <SelectItem value="teaming_partner">Teaming Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Scenario *</Label>
                <Select
                  value={formData.scenario}
                  onValueChange={(value) => setFormData({...formData, scenario: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial">Initial Request</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="completion">Completion Notice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({...formData, is_default: checked})}
                />
                <Label htmlFor="is-default" className="cursor-pointer">
                  Set as default for this scenario
                </Label>
              </div>
            </div>

            <div>
              <Label>Email Subject *</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="e.g., Information Request: {{data_call_title}}"
              />
            </div>

            <div>
              <Label>Email Body *</Label>
              <Textarea
                id="template-body"
                value={formData.body}
                onChange={(e) => setFormData({...formData, body: e.target.value})}
                placeholder="Compose your email template using placeholders..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            {/* Quick Insert Placeholders */}
            <div>
              <Label className="mb-3 block">Quick Insert Placeholders</Label>
              <div className="space-y-3">
                {Object.entries(PLACEHOLDER_GROUPS).map(([groupName, placeholders]) => (
                  <div key={groupName}>
                    <p className="text-xs font-semibold text-slate-700 mb-2">{groupName}</p>
                    <div className="flex flex-wrap gap-2">
                      {placeholders.map(({ key, desc }) => (
                        <Button
                          key={key}
                          variant="outline"
                          size="sm"
                          onClick={() => insertPlaceholder(key)}
                          className="text-xs"
                          title={desc}
                        >
                          {key}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Email Preview</CardTitle>
                  <Badge variant="secondary">Sample Data</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-b pb-3">
                  <p className="text-xs text-slate-500 mb-1">Subject:</p>
                  <p className="font-semibold text-slate-900">{formData.subject}</p>
                </div>

                <div className="bg-slate-50 border rounded-lg p-6">
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
                    {getPreview()}
                  </pre>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    This preview uses sample data. Actual emails will use real data from the data call.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveTemplateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saveTemplateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>Save Template</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}