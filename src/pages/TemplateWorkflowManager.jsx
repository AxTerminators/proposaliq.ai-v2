import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Layers,
  ChevronDown,
  ChevronRight,
  Calendar,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganization } from "../components/layout/OrganizationContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const TEMPLATE_TYPES = [
  { value: 'RFP', label: 'RFP - Request for Proposal', emoji: '📄', color: 'blue' },
  { value: 'RFI', label: 'RFI - Request for Information', emoji: '📝', color: 'green' },
  { value: 'SBIR', label: 'SBIR/STTR', emoji: '💡', color: 'purple' },
  { value: 'GSA', label: 'GSA Schedule', emoji: '🏛️', color: 'amber' },
  { value: 'IDIQ', label: 'IDIQ/Contract Vehicle', emoji: '📑', color: 'indigo' },
  { value: 'STATE_LOCAL', label: 'State/Local Government', emoji: '🏙️', color: 'cyan' },
];

const CHECKLIST_TYPE_LABELS = {
  manual_check: { label: "Manual Check", icon: "✓", color: "bg-slate-100 text-slate-700" },
  modal_trigger: { label: "Opens Modal", icon: "⚡", color: "bg-blue-100 text-blue-700" },
  ai_trigger: { label: "AI Action", icon: "🤖", color: "bg-purple-100 text-purple-700" },
  system_check: { label: "Auto-Check", icon: "⚙️", color: "bg-green-100 text-green-700" }
};

function TemplateWorkflowPreview({ template }) {
  const [expandedColumns, setExpandedColumns] = useState({});
  
  const workflowConfig = useMemo(() => {
    try {
      return typeof template.workflow_config === 'string' 
        ? JSON.parse(template.workflow_config)
        : template.workflow_config;
    } catch {
      return null;
    }
  }, [template.workflow_config]);

  if (!workflowConfig?.columns) {
    return (
      <div className="p-4 text-center text-slate-500">
        No workflow configuration available
      </div>
    );
  }

  const toggleColumn = (columnId) => {
    setExpandedColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  return (
    <div className="space-y-3">
      {workflowConfig.columns.map((column, idx) => {
        const isExpanded = expandedColumns[column.id];
        const hasChecklist = column.checklist_items?.length > 0;
        
        return (
          <Collapsible
            key={column.id}
            open={isExpanded}
            onOpenChange={() => toggleColumn(column.id)}
          >
            <Card className={cn(
              "border-2",
              column.is_locked && "border-slate-300",
              column.is_terminal && "border-green-300"
            )}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold",
                        column.color || "from-slate-400 to-slate-600"
                      )}>
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{column.label}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {column.is_locked && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Lock className="w-3 h-3" />
                              Locked
                            </Badge>
                          )}
                          {column.is_terminal && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              Terminal
                            </Badge>
                          )}
                          {column.type && (
                            <Badge variant="outline" className="text-xs">
                              {column.type}
                            </Badge>
                          )}
                          {hasChecklist && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              {column.checklist_items.length} items
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {hasChecklist && (
                      isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              {hasChecklist && (
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {column.checklist_items
                        .sort((a, b) => a.order - b.order)
                        .map((item) => {
                          const typeInfo = CHECKLIST_TYPE_LABELS[item.type] || CHECKLIST_TYPE_LABELS.manual_check;
                          
                          return (
                            <div
                              key={item.id}
                              className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                            >
                              <div className="flex-shrink-0">
                                {item.required ? (
                                  <div className="w-5 h-5 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
                                    <span className="text-red-600 text-xs font-bold">!</span>
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-slate-200 border-2 border-slate-400"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900">
                                  {item.label}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={cn("text-xs", typeInfo.color)}>
                                    {typeInfo.icon} {typeInfo.label}
                                  </Badge>
                                  {item.required && (
                                    <Badge className="bg-red-100 text-red-700 text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              )}
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}

export default function TemplateWorkflowManager() {
  const queryClient = useQueryClient();
  const { organization, user } = useOrganization();
  const [selectedType, setSelectedType] = useState('RFP');
  const [isInitializing, setIsInitializing] = useState(false);

  // Fetch all system templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: async () => {
      return base44.entities.ProposalWorkflowTemplate.filter(
        { template_type: 'system', is_active: true },
        '-created_date'
      );
    },
    staleTime: 60000,
  });

  const handleInitializeTemplates = async (templateType = null) => {
    if (!organization?.id) {
      alert("Organization not found");
      return;
    }

    const confirmMsg = templateType
      ? `Initialize ${templateType} template workflow?\n\nThis will create a system template with predefined phases and checklists.`
      : `Initialize ALL template workflows?\n\nThis will create system templates for RFP, RFI, SBIR, GSA, IDIQ, and STATE_LOCAL.`;

    if (!confirm(confirmMsg)) return;

    setIsInitializing(true);
    try {
      const response = await base44.functions.invoke('initializeTemplateWorkflows', {
        organization_id: organization.id,
        template_type: templateType,
        overwrite_existing: false
      });

      if (response.data.success) {
        const { summary } = response.data;
        alert(
          `✅ Template Initialization Complete!\n\n` +
          `Created: ${summary.created}\n` +
          `Updated: ${summary.updated}\n` +
          `Skipped (already exist): ${summary.skipped}\n\n` +
          `Templates are now available for use.`
        );
        queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      }
    } catch (error) {
      console.error('Error initializing templates:', error);
      alert('Error initializing templates: ' + error.message);
    } finally {
      setIsInitializing(false);
    }
  };

  const selectedTemplate = templates.find(t => t.proposal_type_category === selectedType);
  const templatesByType = useMemo(() => {
    const grouped = {};
    TEMPLATE_TYPES.forEach(type => {
      grouped[type.value] = templates.find(t => t.proposal_type_category === type.value);
    });
    return grouped;
  }, [templates]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Template Workflow Manager</h1>
              <p className="text-slate-600">Manage system workflow templates for different proposal types</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleInitializeTemplates()}
                disabled={isInitializing}
                variant="outline"
                className="gap-2"
              >
                {isInitializing ? (
                  <>
                    <div className="animate-spin">⏳</div>
                    Initializing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Initialize All Templates
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Template Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {TEMPLATE_TYPES.map((type) => {
            const template = templatesByType[type.value];
            const hasTemplate = !!template;
            
            return (
              <Card
                key={type.value}
                className={cn(
                  "cursor-pointer transition-all border-2 hover:shadow-lg",
                  selectedType === type.value && "ring-2 ring-blue-500",
                  !hasTemplate && "border-dashed opacity-60"
                )}
                onClick={() => setSelectedType(type.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{type.emoji}</div>
                    {hasTemplate ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  
                  <h3 className="font-bold text-slate-900 mb-2">{type.value}</h3>
                  <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                    {type.label}
                  </p>
                  
                  {hasTemplate ? (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Layers className="w-3 h-3" />
                        <span>{JSON.parse(template.workflow_config || '{}').columns?.length || 0} phases</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-3 h-3" />
                        <span>~{template.estimated_duration_days || 0} days</span>
                      </div>
                      {template.usage_count > 0 && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <TrendingUp className="w-3 h-3" />
                          <span>{template.usage_count} uses</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 text-xs">
                      Not Initialized
                    </Badge>
                  )}
                  
                  {!hasTemplate && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInitializeTemplates(type.value);
                      }}
                      size="sm"
                      className="w-full mt-3"
                      disabled={isInitializing}
                    >
                      <Sparkles className="w-3 h-3 mr-2" />
                      Initialize
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detailed Template View */}
        {selectedTemplate ? (
          <div className="space-y-6">
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">
                      {TEMPLATE_TYPES.find(t => t.value === selectedType)?.emoji}
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{selectedTemplate.template_name}</CardTitle>
                      <p className="text-slate-600 mt-1">{selectedTemplate.description}</p>
                      <div className="flex gap-2 mt-3">
                        <Badge className="bg-blue-600 text-white">
                          System Template
                        </Badge>
                        <Badge variant="outline">
                          {selectedTemplate.proposal_type_category}
                        </Badge>
                        {selectedTemplate.estimated_duration_days && (
                          <Badge variant="outline" className="gap-1">
                            <Calendar className="w-3 h-3" />
                            ~{selectedTemplate.estimated_duration_days} days
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {selectedTemplate.usage_count > 0 && (
                      <div className="text-sm text-slate-600">
                        <div className="font-semibold text-2xl text-blue-600">
                          {selectedTemplate.usage_count}
                        </div>
                        <div>times used</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Workflow Phases & Checklists
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  Click on any phase to view its checklist items
                </p>
              </CardHeader>
              <CardContent>
                <TemplateWorkflowPreview template={selectedTemplate} />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Template Not Found
              </h3>
              <p className="text-slate-600 mb-6">
                The {selectedType} template hasn't been initialized yet.
              </p>
              <Button
                onClick={() => handleInitializeTemplates(selectedType)}
                disabled={isInitializing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Initialize {selectedType} Template
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}