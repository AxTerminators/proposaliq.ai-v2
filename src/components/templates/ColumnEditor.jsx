import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import ColorPicker from './ColorPicker';

export default function ColumnEditor({ column, onSave, onClose }) {
  const [label, setLabel] = useState(column.label || '');
  const [color, setColor] = useState(column.color || '#3b82f6');
  const [wipLimit, setWipLimit] = useState(column.wip_limit || 0);
  const [wipLimitType, setWipLimitType] = useState(column.wip_limit_type || 'soft');
  const [requiresApprovalToExit, setRequiresApprovalToExit] = useState(column.requires_approval_to_exit || false);
  const [approverRoles, setApproverRoles] = useState(column.approver_roles?.join(', ') || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    // Validate label
    if (!label.trim()) {
      setError('Column label is required');
      return;
    }

    if (label.length > 50) {
      setError('Column label must be 50 characters or less');
      return;
    }

    const updates = {
      label: label.trim(),
      color,
      wip_limit: wipLimit,
      wip_limit_type: wipLimitType,
      requires_approval_to_exit: requiresApprovalToExit,
      approver_roles: approverRoles ? approverRoles.split(',').map(r => r.trim()).filter(r => r) : []
    };
    
    onSave(updates);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Column</DialogTitle>
          <DialogDescription>
            Customize the column label and color
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="column-label">Column Label *</Label>
            <Input
              id="column-label"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setError('');
              }}
              placeholder="e.g., In Progress"
              maxLength={50}
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Column Color</Label>
            <ColorPicker
              color={color}
              onChange={setColor}
            />
          </div>

          {/* WIP Limit */}
          <div className="space-y-2">
            <Label htmlFor="wip-limit">Work-in-Progress Limit (0 = no limit)</Label>
            <div className="flex gap-2">
              <Input
                id="wip-limit"
                type="number"
                value={wipLimit}
                onChange={(e) => setWipLimit(parseInt(e.target.value) || 0)}
                min={0}
                className="flex-1"
              />
              <Select value={wipLimitType} onValueChange={setWipLimitType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soft">Soft</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-slate-500">
              Soft limits show warnings, hard limits prevent adding more cards
            </p>
          </div>

          {/* Approval to Exit */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="requires-approval"
                checked={requiresApprovalToExit}
                onCheckedChange={setRequiresApprovalToExit}
              />
              <Label htmlFor="requires-approval" className="cursor-pointer">
                Require approval to move cards out of this column
              </Label>
            </div>
            {requiresApprovalToExit && (
              <div className="ml-6">
                <Label htmlFor="approver-roles" className="text-sm">
                  Approver Roles (comma-separated)
                </Label>
                <Input
                  id="approver-roles"
                  value={approverRoles}
                  onChange={(e) => setApproverRoles(e.target.value)}
                  placeholder="e.g., admin, manager"
                  className="mt-1"
                />
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="pt-4 border-t">
            <Label className="mb-2 block">Preview</Label>
            <div
              className="p-4 rounded-lg border-t-4 bg-white"
              style={{ borderTopColor: color }}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{label || 'Column Label'}</h4>
                {wipLimit > 0 && (
                  <span className="text-xs text-slate-500">0/{wipLimit}</span>
                )}
              </div>
              {requiresApprovalToExit && (
                <div className="text-xs text-amber-600">🔒 Approval Required</div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}