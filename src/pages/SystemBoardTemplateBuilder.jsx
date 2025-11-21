import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Eye, Layers, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import TemplateKanbanCanvas from '../components/templates/TemplateKanbanCanvas';
import { validateTemplateName } from '../components/utils/boardNameValidation';

export default function SystemBoardTemplateBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Template state
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [proposalTypeCategory, setProposalTypeCategory] = useState('RFP');
  const [proposalTypeOther, setProposalTypeOther] = useState('');
  const [iconEmoji, setIconEmoji] = useState('📋');
  const [estimatedDurationDays, setEstimatedDurationDays] = useState(30);
  const [tags, setTags] = useState('');
  const [columns, setColumns] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [boardTypeSelected, setBoardTypeSelected] = useState(false);
  
  // Dialog states
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showBackDialog, setShowBackDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Validation state
  const [nameError, setNameError] = useState('');

  // Check if user is super admin
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.admin_role !== 'super_admin') {
          navigate(createPageUrl('AdminPortal'));
          return;
        }
        setUser(currentUser);
        
        // Check if editing existing template
        const params = new URLSearchParams(location.search);
        const templateId = params.get('template_id');
        if (templateId) {
          await loadTemplate(templateId);
        }
      } catch (error) {
        console.error('Auth error:', error);
        navigate(createPageUrl('Dashboard'));
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [location.search]);

  // Load existing template for editing
  const loadTemplate = async (templateId) => {
    try {
      const templates = await base44.entities.ProposalWorkflowTemplate.list();
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setTemplateName(template.template_name || '');
        setDescription(template.description || '');
        setProposalTypeCategory(template.proposal_type_category || 'RFP');
        setProposalTypeOther(template.proposal_type_other || '');
        setIconEmoji(template.icon_emoji || '📋');
        setEstimatedDurationDays(template.estimated_duration_days || 30);
        setTags(template.tags?.join(', ') || '');
        setBoardTypeSelected(true);
        
        // Parse workflow_config
        if (template.workflow_config) {
          const config = typeof template.workflow_config === 'string' 
            ? JSON.parse(template.workflow_config) 
            : template.workflow_config;
          setColumns(config.columns || []);
        }
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  // Initialize terminal columns when board type is selected
  useEffect(() => {
    if (boardTypeSelected && columns.length === 0) {
      const terminalColumns = [
        {
          id: 'submitted',
          label: 'Submitted',
          color: '#3b82f6',
          order: 998,
          type: 'master_status',
          is_locked: true,
          is_terminal: true,
          checklist_items: []
        },
        {
          id: 'won',
          label: 'Won',
          color: '#10b981',
          order: 999,
          type: 'master_status',
          is_locked: true,
          is_terminal: true,
          checklist_items: []
        },
        {
          id: 'lost',
          label: 'Lost',
          color: '#ef4444',
          order: 1000,
          type: 'master_status',
          is_locked: true,
          is_terminal: true,
          checklist_items: []
        },
        {
          id: 'archived',
          label: 'Archived',
          color: '#6b7280',
          order: 1001,
          type: 'master_status',
          is_locked: true,
          is_terminal: true,
          checklist_items: []
        }
      ];
      setColumns(terminalColumns);
    }
  }, [boardTypeSelected]);

  // Track unsaved changes
  useEffect(() => {
    if (boardTypeSelected || columns.length > 4 || templateName || description || tags || proposalTypeCategory !== 'RFP' || proposalTypeOther || iconEmoji !== '📋' || estimatedDurationDays !== 30) {
      setHasUnsavedChanges(true);
    }
  }, [boardTypeSelected, columns, templateName, description, tags, proposalTypeCategory, proposalTypeOther, iconEmoji, estimatedDurationDays]);

  // Handle back navigation with unsaved changes check
  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowBackDialog(true);
    } else {
      navigate(createPageUrl('AdminTemplateEditor'));
    }
  };

  // Validate template name
  const handleTemplateNameChange = async (value) => {
    setTemplateName(value);
    
    if (!value.trim()) {
      setNameError('Template name is required');
      return;
    }

    try {
      const validation = await validateTemplateName(value);
      if (!validation.isValid) {
        setNameError(validation.error);
      } else {
        setNameError('');
      }
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  // Save template as draft
  const handleSave = async () => {
    // Validate required fields
    if (!templateName.trim()) {
      setNameError('Template name is required');
      return;
    }

    if (proposalTypeCategory === 'OTHER' && !proposalTypeOther.trim()) {
      alert('Please specify the other proposal type');
      return;
    }

    if (nameError) {
      alert('Please fix validation errors before saving');
      return;
    }

    setSaving(true);
    try {
      const params = new URLSearchParams(location.search);
      const templateId = params.get('template_id');

      // Prepare workflow config
      const workflowConfig = {
        columns: columns.map((col, idx) => ({
          ...col,
          order: col.is_terminal ? col.order : idx
        }))
      };

      const templateData = {
        template_name: templateName.trim(),
        description: description.trim(),
        proposal_type_category: proposalTypeCategory,
        proposal_type_other: proposalTypeCategory === 'OTHER' ? proposalTypeOther.trim() : '',
        icon_emoji: iconEmoji || '📋',
        estimated_duration_days: estimatedDurationDays,
        workflow_config: JSON.stringify(workflowConfig),
        template_type: 'system',
        status: 'draft',
        is_active: true,
        usage_count: 0
      };

      if (templateId) {
        // Update existing template
        await base44.entities.ProposalWorkflowTemplate.update(templateId, templateData);
      } else {
        // Create new template
        await base44.entities.ProposalWorkflowTemplate.create(templateData);
      }

      setHasUnsavedChanges(false);
      setShowSaveDialog(false);
      navigate(createPageUrl('AdminTemplateEditor'));
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">System Board Template Builder</h1>
              <p className="text-slate-600 mt-1">Create and configure proposal workflow templates</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? 'Edit Mode' : 'Preview'}
            </Button>
            <Button onClick={() => setShowSaveDialog(true)} disabled={!boardTypeSelected || !!nameError}>
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
          </div>
        </div>

        {/* Board Type Selection */}
        {!boardTypeSelected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Create Proposal Board Template
              </CardTitle>
              <CardDescription>
                All proposal board templates integrate with the master board for unified reporting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={() => setBoardTypeSelected(true)}
                className="w-full p-8 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
              >
                <div className="text-4xl mb-3">📋</div>
                <h3 className="font-semibold text-xl mb-2">Start Building Template</h3>
                <p className="text-sm text-slate-600">Create a custom proposal workflow template</p>
              </button>
            </CardContent>
          </Card>
        )}

        {/* Kanban Canvas */}
        {boardTypeSelected && (
          <>
            {/* Board Type Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                Proposal Board Template
              </Badge>
              {previewMode && (
                <Badge className="bg-blue-100 text-blue-800">
                  Preview Mode
                </Badge>
              )}
            </div>

            <TemplateKanbanCanvas
              columns={columns}
              onColumnsChange={setColumns}
              previewMode={previewMode}
            />
          </>
        )}

        {/* Info Card */}
        {boardTypeSelected && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Template Draft Status</p>
                  <p>This template will be saved as a draft. Super-admins can publish it to make it available system-wide.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Save Template as Draft</DialogTitle>
            <DialogDescription>
              Provide details for your board template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => handleTemplateNameChange(e.target.value)}
                placeholder="e.g., Standard RFP Workflow Template"
              />
              {nameError && (
                <p className="text-sm text-red-600">{nameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="proposal-type">Proposal Type Category *</Label>
              <Select
                value={proposalTypeCategory}
                onValueChange={(value) => {
                  setProposalTypeCategory(value);
                  if (value !== 'OTHER') setProposalTypeOther('');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RFP">RFP - Request for Proposal</SelectItem>
                  <SelectItem value="RFI">RFI - Request for Information</SelectItem>
                  <SelectItem value="SBIR">SBIR - Small Business Innovation Research</SelectItem>
                  <SelectItem value="GSA">GSA - GSA Schedule</SelectItem>
                  <SelectItem value="IDIQ">IDIQ - Indefinite Delivery/Indefinite Quantity</SelectItem>
                  <SelectItem value="STATE_LOCAL">State & Local Government</SelectItem>
                  <SelectItem value="RFP_15_COLUMN">RFP - 15 Column Workflow</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {proposalTypeCategory === 'OTHER' && (
              <div className="space-y-2">
                <Label htmlFor="proposal-type-other">Specify Other Type *</Label>
                <Input
                  id="proposal-type-other"
                  value={proposalTypeOther}
                  onChange={(e) => setProposalTypeOther(e.target.value)}
                  placeholder="e.g., Construction Bid, Grant Application"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon-emoji">Icon Emoji</Label>
                <Input
                  id="icon-emoji"
                  value={iconEmoji}
                  onChange={(e) => setIconEmoji(e.target.value)}
                  placeholder="📋"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated-days">Estimated Duration (days)</Label>
                <Input
                  id="estimated-days"
                  type="number"
                  value={estimatedDurationDays}
                  onChange={(e) => setEstimatedDurationDays(parseInt(e.target.value) || 30)}
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose and use case for this template..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !templateName.trim() || !!nameError || (proposalTypeCategory === 'OTHER' && !proposalTypeOther.trim())}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Back Confirmation Dialog */}
      <AlertDialog open={showBackDialog} onOpenChange={setShowBackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? All changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate(createPageUrl('AdminTemplateEditor'))}>
              Leave Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}