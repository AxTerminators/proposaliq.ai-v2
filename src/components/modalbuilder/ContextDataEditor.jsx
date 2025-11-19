import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileBox, AlertCircle } from 'lucide-react';

/**
 * Context Data Editor Component
 * 
 * Phase 3: Configure pre-fill data from context (Proposal, Organization, User)
 */
export default function ContextDataEditor({ field, onUpdate }) {
  const prefillEnabled = field.prefillFromContext || false;
  const prefillSource = field.prefillSource || 'none';
  const prefillPath = field.prefillPath || '';

  const handleTogglePrefill = (checked) => {
    onUpdate({ 
      prefillFromContext: checked,
      prefillSource: checked ? 'proposal' : 'none',
      prefillPath: ''
    });
  };

  const handleSourceChange = (source) => {
    onUpdate({ 
      prefillSource: source,
      prefillPath: ''
    });
  };

  const handlePathChange = (path) => {
    onUpdate({ prefillPath: path });
  };

  // Available fields by context source
  const contextFields = {
    proposal: [
      { value: 'proposal_name', label: 'Proposal Name' },
      { value: 'solicitation_number', label: 'Solicitation Number' },
      { value: 'agency_name', label: 'Agency Name' },
      { value: 'project_title', label: 'Project Title' },
      { value: 'due_date', label: 'Due Date' },
      { value: 'contract_value', label: 'Contract Value' },
      { value: 'prime_contractor_name', label: 'Prime Contractor Name' }
    ],
    organization: [
      { value: 'organization_name', label: 'Organization Name' },
      { value: 'contact_name', label: 'Contact Name' },
      { value: 'contact_email', label: 'Contact Email' },
      { value: 'website_url', label: 'Website URL' },
      { value: 'uei', label: 'UEI' },
      { value: 'cage_code', label: 'CAGE Code' }
    ],
    user: [
      { value: 'full_name', label: 'User Full Name' },
      { value: 'email', label: 'User Email' }
    ]
  };

  return (
    <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
      <div className="flex items-center gap-2 mb-2">
        <FileBox className="w-4 h-4 text-amber-600" />
        <h5 className="font-semibold text-sm text-slate-900">Pre-fill from Context</h5>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={prefillEnabled}
          onCheckedChange={handleTogglePrefill}
        />
        <Label className="text-xs font-normal">
          Auto-populate this field with existing data
        </Label>
      </div>

      {prefillEnabled && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Data Source</Label>
            <Select value={prefillSource} onValueChange={handleSourceChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proposal">Current Proposal</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
                <SelectItem value="user">Current User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {prefillSource !== 'none' && (
            <div>
              <Label className="text-xs">Field to Pre-fill From</Label>
              <Select value={prefillPath} onValueChange={handlePathChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field..." />
                </SelectTrigger>
                <SelectContent>
                  {contextFields[prefillSource]?.map(field => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-start gap-2 p-2 bg-amber-100 rounded">
            <AlertCircle className="w-3 h-3 text-amber-700 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              Field will be pre-filled when the modal opens. Users can still edit the value.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}