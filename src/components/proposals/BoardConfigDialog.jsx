
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Columns, Layers, Zap, Save, AlertCircle, Trash2, GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge"; // Added Badge component import

export default function BoardConfigDialog({ isOpen, onClose, organization, currentConfig }) {
  const queryClient = useQueryClient();
  
  const defaultColumns = [
    { id: 'evaluating', label: 'Evaluating', color: 'from-slate-400 to-slate-600', type: 'default_status', default_status_mapping: 'evaluating', order: 0 },
    { id: 'watch_list', label: 'Watch List', color: 'from-amber-400 to-amber-600', type: 'default_status', default_status_mapping: 'watch_list', order: 1 },
    { id: 'draft', label: 'Draft', color: 'from-blue-400 to-blue-600', type: 'default_status', default_status_mapping: 'draft', order: 2 },
    { id: 'in_progress', label: 'In Progress', color: 'from-purple-400 to-purple-600', type: 'default_status', default_status_mapping: 'in_progress', order: 3 },
    { id: 'submitted', label: 'Submitted', color: 'from-indigo-400 to-indigo-600', type: 'default_status', default_status_mapping: 'submitted', order: 4 },
    { id: 'won', label: 'Won', color: 'from-green-400 to-green-600', type: 'default_status', default_status_mapping: 'won', order: 5 },
    { id: 'lost', label: 'Lost', color: 'from-red-400 to-red-600', type: 'default_status', default_status_mapping: 'lost', order: 6 },
    { id: 'archived', label: 'Archived', color: 'from-gray-400 to-gray-600', type: 'default_status', default_status_mapping: 'archived', order: 7 }
  ];

  const [config, setConfig] = useState({
    columns: currentConfig?.columns || defaultColumns,
    swimlane_config: currentConfig?.swimlane_config || {
      enabled: false,
      group_by: 'none',
      custom_field_name: '',
      show_empty_swimlanes: false
    },
    view_settings: currentConfig?.view_settings || {
      default_view: 'kanban',
      show_card_details: ['assignees', 'due_date', 'progress', 'value'],
      compact_mode: false
    }
  });

  useEffect(() => {
    if (currentConfig) {
      setConfig({
        columns: currentConfig.columns || defaultColumns,
        swimlane_config: currentConfig.swimlane_config || {
          enabled: false,
          group_by: 'none',
          custom_field_name: '',
          show_empty_swimlanes: false
        },
        view_settings: currentConfig.view_settings || {
          default_view: 'kanban',
          show_card_details: ['assignees', 'due_date', 'progress', 'value'],
          compact_mode: false
        }
      });
    }
  }, [currentConfig]);

  const saveConfigMutation = useMutation({
    mutationFn: async (newConfig) => {
      if (!organization?.id) throw new Error("No organization");

      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );

      const configData = {
        organization_id: organization.id,
        columns: newConfig.columns,
        swimlane_config: newConfig.swimlane_config,
        view_settings: newConfig.view_settings,
        collapsed_column_ids: currentConfig?.collapsed_column_ids || []
      };

      if (configs.length > 0) {
        return base44.entities.KanbanConfig.update(configs[0].id, configData);
      } else {
        return base44.entities.KanbanConfig.create(configData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      onClose();
    }
  });

  const handleSave = () => {
    saveConfigMutation.mutate(config);
  };

  const handleColumnLabelChange = (columnId, newLabel) => {
    setConfig({
      ...config,
      columns: config.columns.map(col => 
        col.id === columnId ? { ...col, label: newLabel } : col
      )
    });
  };

  const handleAddColumn = () => {
    const newColumn = {
      id: `custom_${Date.now()}`,
      label: 'New Column',
      color: 'from-blue-400 to-blue-600', // Default color, can be expanded later
      type: 'custom_stage',
      order: config.columns.length
    };
    setConfig({
      ...config,
      columns: [...config.columns, newColumn]
    });
  };

  const handleDeleteColumn = (columnId) => {
    setConfig({
      ...config,
      columns: config.columns.filter(col => col.id !== columnId)
    });
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset all columns to default? This will remove any custom columns you created.')) {
      setConfig({
        ...config,
        columns: defaultColumns
      });
    }
  };

  const handleSwimlaneToggle = (enabled) => {
    setConfig({
      ...config,
      swimlane_config: {
        ...config.swimlane_config,
        enabled
      }
    });
  };

  const handleGroupByChange = (group_by) => {
    setConfig({
      ...config,
      swimlane_config: {
        ...config.swimlane_config,
        group_by
      }
    });
  };

  const handleCustomFieldChange = (custom_field_name) => {
    setConfig({
      ...config,
      swimlane_config: {
        ...config.swimlane_config,
        custom_field_name
      }
    });
  };

  const handleShowEmptySwimlanes = (show_empty_swimlanes) => {
    setConfig({
      ...config,
      swimlane_config: {
        ...config.swimlane_config,
        show_empty_swimlanes
      }
    });
  };

  const toggleCardDetail = (detail) => {
    const currentDetails = config.view_settings.show_card_details || [];
    const newDetails = currentDetails.includes(detail)
      ? currentDetails.filter(d => d !== detail)
      : [...currentDetails, detail];
    
    setConfig({
      ...config,
      view_settings: {
        ...config.view_settings,
        show_card_details: newDetails
      }
    });
  };

  const handleCompactModeToggle = (compact_mode) => {
    setConfig({
      ...config,
      view_settings: {
        ...config.view_settings,
        compact_mode
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Board Configuration
          </DialogTitle>
          <DialogDescription>
            Configure columns, swimlanes, view settings, and display preferences for your Kanban board.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="columns" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="columns" className="flex items-center gap-2">
              <Columns className="w-4 h-4" />
              Columns
            </TabsTrigger>
            <TabsTrigger value="swimlanes" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Swimlanes
            </TabsTrigger>
            <TabsTrigger value="view" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              View Settings
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto mt-4 pr-2" style={{ maxHeight: '50vh' }}>
            <TabsContent value="columns" className="space-y-4 mt-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Manage Kanban Columns</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetToDefaults}
                  >
                    Reset to Defaults
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddColumn}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Column
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {config.columns.map((column, index) => (
                  <div
                    key={column.id}
                    className="flex items-center gap-3 p-3 border-2 border-slate-200 rounded-lg hover:border-blue-300 transition-all bg-white"
                  >
                    <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />
                    
                    <div className="flex-1">
                      <Input
                        value={column.label}
                        onChange={(e) => handleColumnLabelChange(column.id, e.target.value)}
                        placeholder="Column name"
                        className="font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {column.type === 'default_status' && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                      {column.type === 'custom_stage' && (
                        <Badge variant="outline" className="text-xs">
                          Custom
                        </Badge>
                      )}
                      
                      {column.type === 'custom_stage' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteColumn(column.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-4">
                <div className="text-sm text-blue-900">
                  <strong>Tip:</strong> Default columns map to proposal statuses. Custom columns create new workflow stages.
                </div>
              </div>
            </TabsContent>

            <TabsContent value="swimlanes" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 mb-1">Enable Swimlanes</div>
                    <div className="text-sm text-slate-600">
                      Group proposals into horizontal rows based on a field (e.g., by client, lead writer, or agency)
                    </div>
                  </div>
                  <Switch
                    checked={config.swimlane_config?.enabled || false}
                    onCheckedChange={handleSwimlaneToggle}
                  />
                </div>

                {config.swimlane_config?.enabled && (
                  <>
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Group Proposals By</Label>
                      <Select
                        value={config.swimlane_config?.group_by || 'none'}
                        onValueChange={handleGroupByChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select grouping" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Grouping</SelectItem>
                          <SelectItem value="lead_writer">Lead Writer</SelectItem>
                          <SelectItem value="project_type">Project Type (RFP, RFI, etc.)</SelectItem>
                          <SelectItem value="agency">Agency</SelectItem>
                          <SelectItem value="contract_value_range">Contract Value Range</SelectItem>
                          <SelectItem value="custom_field">Custom Field</SelectItem>
                        </SelectContent>
                      </Select>

                      {config.swimlane_config?.group_by === 'custom_field' && (
                        <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <Label>Custom Field Name</Label>
                          <Input
                            value={config.swimlane_config?.custom_field_name || ''}
                            onChange={(e) => handleCustomFieldChange(e.target.value)}
                            placeholder="e.g., Government POC, Incumbent, Region"
                          />
                          <div className="text-xs text-amber-700 flex items-start gap-2 mt-2">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>
                              Enter the exact name of a custom field you've defined on proposals. 
                              Proposals will be grouped by their values in this field.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-slate-900">Show Empty Swimlanes</div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          Display swimlanes even if they have no proposals (e.g., show all team members)
                        </div>
                      </div>
                      <Switch
                        checked={config.swimlane_config?.show_empty_swimlanes || false}
                        onCheckedChange={handleShowEmptySwimlanes}
                      />
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Swimlane Preview
                      </div>
                      <div className="text-sm text-green-800">
                        {config.swimlane_config?.group_by === 'none' && (
                          "Swimlanes disabled - all proposals will appear in a single view."
                        )}
                        {config.swimlane_config?.group_by === 'lead_writer' && (
                          "Proposals will be grouped by Lead Writer. Each writer gets their own row."
                        )}
                        {config.swimlane_config?.group_by === 'project_type' && (
                          "Proposals will be grouped by Project Type (RFP, RFI, RFQ, etc.)."
                        )}
                        {config.swimlane_config?.group_by === 'agency' && (
                          "Proposals will be grouped by Agency Name."
                        )}
                        {config.swimlane_config?.group_by === 'contract_value_range' && (
                          "Proposals will be grouped by Contract Value ranges (e.g., <$100K, $100K-$1M, >$1M)."
                        )}
                        {config.swimlane_config?.group_by === 'custom_field' && (
                          config.swimlane_config?.custom_field_name
                            ? `Proposals will be grouped by values in the "${config.swimlane_config.custom_field_name}" custom field.`
                            : "Enter a custom field name above to enable this grouping."
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="view" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-3 block">Card Details to Display</Label>
                  <div className="space-y-2">
                    {[
                      { key: 'assignees', label: 'Team Member Avatars', desc: 'Show assigned team members' },
                      { key: 'due_date', label: 'Due Date', desc: 'Show deadline and countdown' },
                      { key: 'progress', label: 'Progress Bar', desc: 'Show subtask completion progress' },
                      { key: 'value', label: 'Contract Value', desc: 'Show dollar amount' },
                      { key: 'agency', label: 'Agency Name', desc: 'Show government agency' },
                      { key: 'dependencies', label: 'Dependencies', desc: 'Show dependency count' },
                      { key: 'match_score', label: 'AI Match Score', desc: 'Show AI-calculated match %' }
                    ].map(detail => (
                      <div
                        key={detail.key}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all",
                          (config.view_settings?.show_card_details || []).includes(detail.key)
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        )}
                        onClick={() => toggleCardDetail(detail.key)}
                      >
                        <div>
                          <div className="font-medium text-sm text-slate-900">{detail.label}</div>
                          <div className="text-xs text-slate-600">{detail.desc}</div>
                        </div>
                        <Switch
                          checked={(config.view_settings?.show_card_details || []).includes(detail.key)}
                          onCheckedChange={() => toggleCardDetail(detail.key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 mb-1">Compact Mode</div>
                    <div className="text-sm text-slate-600">
                      Reduce card spacing and padding to fit more proposals on screen
                    </div>
                  </div>
                  <Switch
                    checked={config.view_settings?.compact_mode || false}
                    onCheckedChange={handleCompactModeToggle}
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveConfigMutation.isPending}>
            {saveConfigMutation.isPending ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
