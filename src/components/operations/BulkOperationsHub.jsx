import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Layers,
  CheckSquare,
  Mail,
  Download,
  Edit,
  Trash2,
  Archive,
  Share2,
  Tag,
  FileText,
  Loader2,
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const BULK_OPERATIONS = [
  {
    id: 'update_status',
    icon: Edit,
    color: 'blue',
    label: 'Update Status',
    description: 'Change status for multiple proposals',
    applies_to: ['proposals'],
    requires_input: true
  },
  {
    id: 'send_email',
    icon: Mail,
    color: 'green',
    label: 'Send Bulk Email',
    description: 'Send personalized emails to multiple clients',
    applies_to: ['clients', 'proposals'],
    requires_input: true
  },
  {
    id: 'export_data',
    icon: Download,
    color: 'purple',
    label: 'Export Data',
    description: 'Export selected items to CSV/JSON',
    applies_to: ['proposals', 'clients', 'tasks'],
    requires_input: false
  },
  {
    id: 'add_tags',
    icon: Tag,
    color: 'amber',
    label: 'Add Tags',
    description: 'Tag multiple items for organization',
    applies_to: ['proposals', 'clients'],
    requires_input: true
  },
  {
    id: 'archive',
    icon: Archive,
    color: 'slate',
    label: 'Archive',
    description: 'Archive multiple proposals',
    applies_to: ['proposals'],
    requires_input: false
  },
  {
    id: 'share_with_client',
    icon: Share2,
    color: 'indigo',
    label: 'Share with Clients',
    description: 'Share multiple proposals with selected clients',
    applies_to: ['proposals'],
    requires_input: true
  },
  {
    id: 'delete',
    icon: Trash2,
    color: 'red',
    label: 'Delete',
    description: 'Permanently delete selected items',
    applies_to: ['proposals', 'clients', 'tasks'],
    requires_input: false,
    dangerous: true
  },
  {
    id: 'assign_tasks',
    icon: CheckSquare,
    color: 'blue',
    label: 'Assign Tasks',
    description: 'Assign multiple tasks to team member',
    applies_to: ['tasks'],
    requires_input: true
  },
  {
    id: 'generate_reports',
    icon: FileText,
    color: 'green',
    label: 'Generate Reports',
    description: 'Create reports for selected proposals',
    applies_to: ['proposals'],
    requires_input: false
  },
  {
    id: 'update_deadline',
    icon: Clock,
    color: 'orange',
    label: 'Update Deadlines',
    description: 'Adjust due dates for multiple items',
    applies_to: ['proposals', 'tasks'],
    requires_input: true
  }
];

export default function BulkOperationsHub({ 
  items = [], // Array of selected items
  itemType, // 'proposals', 'clients', 'tasks'
  onComplete,
  organization
}) {
  const queryClient = useQueryClient();
  const [showOperationDialog, setShowOperationDialog] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [operationData, setOperationData] = useState({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Filter operations by item type
  const availableOperations = BULK_OPERATIONS.filter(op => 
    op.applies_to.includes(itemType)
  );

  // Execute bulk operation
  const executeBulkOperation = async () => {
    if (!selectedOperation) return;

    setIsExecuting(true);
    setProgress({ current: 0, total: items.length });

    try {
      const op = selectedOperation;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setProgress({ current: i + 1, total: items.length });

        // Execute operation based on type
        if (op.id === 'update_status' && itemType === 'proposals') {
          await base44.entities.Proposal.update(item.id, {
            status: operationData.status
          });
        }

        else if (op.id === 'send_email') {
          let email = '';
          let subject = '';
          
          if (itemType === 'clients') {
            email = item.contact_email;
            subject = operationData.subject || 'Update from ProposalIQ';
          } else if (itemType === 'proposals') {
            // Get clients for this proposal
            const clients = await base44.entities.Client.filter({
              organization_id: organization.id
            });
            const sharedClients = clients.filter(c => 
              item.shared_with_client_ids?.includes(c.id)
            );
            
            for (const client of sharedClients) {
              const personalizedBody = (operationData.email_body || '').replace('{{client_name}}', client.contact_name || client.client_name);
              await base44.integrations.Core.SendEmail({
                to: client.contact_email,
                subject: operationData.subject || 'Proposal Update',
                body: personalizedBody
              });
            }
            continue; // Skip the single email send below
          }

          if (email) {
            const personalizedBody = (operationData.email_body || '').replace('{{client_name}}', item.contact_name || item.client_name);
            await base44.integrations.Core.SendEmail({
              to: email,
              subject: subject,
              body: personalizedBody
            });
          }
        }

        else if (op.id === 'export_data') {
          // Data will be exported after loop
          continue;
        }

        else if (op.id === 'add_tags' && itemType === 'proposals') {
          const existingTags = item.tags || [];
          const newTags = operationData.tags || [];
          await base44.entities.Proposal.update(item.id, {
            tags: [...new Set([...existingTags, ...newTags])]
          });
        }

        else if (op.id === 'archive' && itemType === 'proposals') {
          await base44.entities.Proposal.update(item.id, {
            status: 'archived'
          });
        }

        else if (op.id === 'share_with_client' && itemType === 'proposals') {
          const clientIds = operationData.client_ids || [];
          const existingClientIds = item.shared_with_client_ids || [];
          await base44.entities.Proposal.update(item.id, {
            shared_with_client_ids: [...new Set([...existingClientIds, ...clientIds])],
            client_view_enabled: true
          });
        }

        else if (op.id === 'delete') {
          if (itemType === 'proposals') {
            await base44.entities.Proposal.delete(item.id);
          } else if (itemType === 'clients') {
            await base44.entities.Client.delete(item.id);
          } else if (itemType === 'tasks') {
            await base44.entities.ProposalTask.delete(item.id);
          }
        }

        else if (op.id === 'assign_tasks' && itemType === 'tasks') {
          await base44.entities.ProposalTask.update(item.id, {
            assigned_to_email: operationData.assignee_email,
            assigned_to_name: operationData.assignee_name
          });
        }

        else if (op.id === 'update_deadline') {
          if (itemType === 'proposals') {
            await base44.entities.Proposal.update(item.id, {
              due_date: operationData.new_deadline
            });
          } else if (itemType === 'tasks') {
            await base44.entities.ProposalTask.update(item.id, {
              due_date: operationData.new_deadline
            });
          }
        }

        else if (op.id === 'generate_reports' && itemType === 'proposals') {
          // Generate export for each proposal
          // This would integrate with ExportDialog functionality
          toast.info(`Report generated for ${item.proposal_name}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Handle export operation
      if (selectedOperation.id === 'export_data') {
        const exportData = items.map(item => {
          // Remove system fields
          const { id, created_date, updated_date, created_by, ...cleanItem } = item;
          return cleanItem;
        });

        const format = operationData.export_format || 'json';
        let blob;
        let filename;

        if (format === 'json') {
          blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          filename = `${itemType}_export_${Date.now()}.json`;
        } else if (format === 'csv') {
          // Convert to CSV
          const headers = Object.keys(exportData[0] || {});
          const csvRows = [headers.join(',')];
          exportData.forEach(row => {
            csvRows.push(headers.map(h => JSON.stringify(row[h] || '')).join(','));
          });
          blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
          filename = `${itemType}_export_${Date.now()}.csv`;
        }

        // Download file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
      }

      toast.success(`✓ ${selectedOperation.label} completed for ${items.length} item(s)`);
      queryClient.invalidateQueries();
      
      if (onComplete) onComplete();
      setShowOperationDialog(false);
      setOperationData({});
      
    } catch (error) {
      console.error('Bulk operation error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsExecuting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleOperationClick = (operation) => {
    setSelectedOperation(operation);
    setOperationData({});
    setShowOperationDialog(true);
  };

  if (items.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <Layers className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600">Select items to perform bulk operations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            Bulk Operations
          </CardTitle>
          <CardDescription>
            {items.length} {itemType} selected • Perform actions on multiple items at once
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Operations Grid */}
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
        {availableOperations.map(operation => {
          const Icon = operation.icon;
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
            green: 'bg-green-100 text-green-700 hover:bg-green-200',
            purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
            amber: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
            slate: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            indigo: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
            red: 'bg-red-100 text-red-700 hover:bg-red-200',
            orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          };

          return (
            <Card 
              key={operation.id}
              className={cn(
                "cursor-pointer hover:shadow-lg transition-all border-2",
                operation.dangerous && "border-red-300"
              )}
              onClick={() => handleOperationClick(operation)}
            >
              <CardContent className="p-4 text-center">
                <div className={cn("w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center", colorClasses[operation.color])}>
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">{operation.label}</h4>
                <p className="text-xs text-slate-600">{operation.description}</p>
                {operation.dangerous && (
                  <Badge variant="destructive" className="mt-2 text-xs">
                    Destructive
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Operation Dialog */}
      <Dialog open={showOperationDialog} onOpenChange={setShowOperationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedOperation && <selectedOperation.icon className="w-5 h-5" />}
              {selectedOperation?.label}
            </DialogTitle>
            <DialogDescription>
              Performing on {items.length} {itemType}
            </DialogDescription>
          </DialogHeader>

          {selectedOperation && (
            <div className="space-y-4">
              {/* Warning for dangerous operations */}
              {selectedOperation.dangerous && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="w-5 h-5" />
                    <p className="font-semibold">Warning: This action cannot be undone</p>
                  </div>
                  <p className="text-sm text-red-700 mt-2">
                    {items.length} item(s) will be permanently deleted.
                  </p>
                </div>
              )}

              {/* Operation-specific inputs */}
              {selectedOperation.id === 'update_status' && (
                <div className="space-y-2">
                  <Label>New Status</Label>
                  <Select 
                    value={operationData.status}
                    onValueChange={(value) => setOperationData({ ...operationData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="evaluating">Evaluating</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedOperation.id === 'send_email' && (
                <>
                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input
                      value={operationData.subject || ''}
                      onChange={(e) => setOperationData({ ...operationData, subject: e.target.value })}
                      placeholder="e.g., Proposal Update"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Body</Label>
                    <Textarea
                      value={operationData.email_body || ''}
                      onChange={(e) => setOperationData({ ...operationData, email_body: e.target.value })}
                      placeholder="Use {{client_name}} for personalization..."
                      rows={6}
                    />
                    <p className="text-xs text-slate-500">
                      Use {`{{client_name}}`} to personalize each email
                    </p>
                  </div>
                </>
              )}

              {selectedOperation.id === 'export_data' && (
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select 
                    value={operationData.export_format || 'json'}
                    onValueChange={(value) => setOperationData({ ...operationData, export_format: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedOperation.id === 'add_tags' && (
                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={operationData.tags?.join(', ') || ''}
                    onChange={(e) => setOperationData({ 
                      ...operationData, 
                      tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                    })}
                    placeholder="e.g., priority, q4-2024, high-value"
                  />
                </div>
              )}

              {selectedOperation.id === 'update_deadline' && (
                <div className="space-y-2">
                  <Label>New Deadline</Label>
                  <Input
                    type="date"
                    value={operationData.new_deadline || ''}
                    onChange={(e) => setOperationData({ ...operationData, new_deadline: e.target.value })}
                  />
                </div>
              )}

              {selectedOperation.id === 'assign_tasks' && (
                <div className="space-y-2">
                  <Label>Assign To (Email)</Label>
                  <Input
                    type="email"
                    value={operationData.assignee_email || ''}
                    onChange={(e) => setOperationData({ 
                      ...operationData, 
                      assignee_email: e.target.value 
                    })}
                    placeholder="team.member@example.com"
                  />
                </div>
              )}

              {/* Progress indicator */}
              {isExecuting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      Processing: {progress.current} / {progress.total}
                    </span>
                    <span className="text-slate-600">
                      {Math.round((progress.current / progress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Items to Process:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {items.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      {item.proposal_name || item.contact_name || item.client_name || item.title || `Item ${idx + 1}`}
                    </div>
                  ))}
                  {items.length > 10 && (
                    <p className="text-xs text-slate-500">...and {items.length - 10} more</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOperationDialog(false)} disabled={isExecuting}>
              Cancel
            </Button>
            <Button 
              onClick={executeBulkOperation}
              disabled={isExecuting || (selectedOperation?.requires_input && Object.keys(operationData).length === 0)}
              className={cn(
                selectedOperation?.dangerous && "bg-red-600 hover:bg-red-700"
              )}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Execute
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}