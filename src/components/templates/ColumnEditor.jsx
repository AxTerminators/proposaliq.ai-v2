import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ColorPicker from './ColorPicker';

export default function ColumnEditor({ column, onSave, onClose }) {
  const [label, setLabel] = useState(column.label || '');
  const [color, setColor] = useState(column.color || '#3b82f6');
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

    onSave({ label: label.trim(), color });
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

          {/* Preview */}
          <div className="pt-4 border-t">
            <Label className="mb-2 block">Preview</Label>
            <div
              className="p-4 rounded-lg border-t-4 bg-white"
              style={{ borderTopColor: color }}
            >
              <h4 className="font-semibold">{label || 'Column Label'}</h4>
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