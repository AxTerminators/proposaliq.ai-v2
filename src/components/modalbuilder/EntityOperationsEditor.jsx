import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Zap } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConditionalOperationsEditor from './ConditionalOperationsEditor';
import UpdateOperationConfig from './UpdateOperationConfig';
import WebhookConfig from './WebhookConfig';
import EmailNotificationConfig from './EmailNotificationConfig';
import StatusUpdateConfig from './StatusUpdateConfig';

/**
 * Entity Operations Editor Component
 * 
 * Phase 5: Enhanced with conditional execution and update operation support
 * Phase 6: Added workflow automation (webhooks, emails, status updates)
 */
export default function EntityOperationsEditor({ modalConfig, onUpdate, allFields }) {
  const operations = modalConfig.entityOperations || [];
  const webhooks = modalConfig.webhooks || [];
  const emailNotifications = modalConfig.emailNotifications || [];
  const statusUpdates = modalConfig.statusUpdates || [];

  const availableEntities = [
    'Proposal',
    'TeamingPartner',
    'ProposalResource',
    'ProposalSection',
    'ProposalTask',
    'KeyPersonnel',
    'Organization'
  ];

  const handleAddOperation = () => {
    const newOp = {
      id: `op_${Date.now()}`,
      type: 'create',
      entity: '',
      fieldMappings: []
    };
    onUpdate({ entityOperations: [...operations, newOp] });
  };

  const handleUpdateOperation = (index, updates) => {
    const newOps = [...operations];
    newOps[index] = { ...newOps[index], ...updates };
    onUpdate({ entityOperations: newOps });
  };

  const handleRemoveOperation = (index) => {
    onUpdate({ entityOperations: operations.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="entities">
        <TabsList className="mb-4">
          <TabsTrigger value="entities">Entity Operations</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="emails">Email Notifications</TabsTrigger>
          <TabsTrigger value="status">Status Updates</TabsTrigger>
        </TabsList>

        <TabsContent value="entities">
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-green-600" />
              <h5 className="font-semibold text-sm text-slate-900">Entity Operations</h5>
              <p className="text-xs text-slate-600 ml-auto">On Submit</p>
            </div>

            <p className="text-xs text-slate-600">
              Configure what happens with the data when the form is submitted
            </p>

      {operations.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-slate-500 mb-3">
            No operations configured. Data will be saved to the primary entity only.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddOperation}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Entity Operation
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {operations.map((op, index) => (
              <div key={op.id} className="p-3 bg-white rounded border border-green-200">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Operation</Label>
                        <Select
                          value={op.type}
                          onValueChange={(val) => handleUpdateOperation(index, { type: val })}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="create">Create New</SelectItem>
                            <SelectItem value="update">Update Existing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Entity</Label>
                        <Select
                          value={op.entity}
                          onValueChange={(val) => handleUpdateOperation(index, { entity: val })}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Select entity..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableEntities.map(ent => (
                              <SelectItem key={ent} value={ent}>{ent}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Update Operation Configuration */}
                    {op.type === 'update' && op.entity && (
                      <UpdateOperationConfig
                        operation={op}
                        allFields={allFields || []}
                        onUpdate={(updates) => handleUpdateOperation(index, updates)}
                      />
                    )}

                    {/* Conditional Execution */}
                    {op.entity && (
                      <ConditionalOperationsEditor
                        operation={op}
                        allFields={allFields || []}
                        onUpdate={(updates) => handleUpdateOperation(index, updates)}
                      />
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOperation(index)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddOperation}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Another Operation
          </Button>
        </>
      )}
    </div>
  );
}