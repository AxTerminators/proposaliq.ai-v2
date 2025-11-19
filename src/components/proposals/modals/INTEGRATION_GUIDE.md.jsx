# Dynamic Modal System - Integration Guide

## Overview

This guide covers the complete implementation of Phases 1-3 of the Dynamic Modal enhancement project, providing advanced modal capabilities for the GovHQ.ai proposal workflow system.

---

## Phase 1: ChecklistItemRenderer Integration & New Templates

### What Was Built

1. **ChecklistItemRenderer Integration**
   - Full integration between `ChecklistItemRenderer` and `DynamicModal`
   - Click handling for modal triggers from checklist items
   - Support for AI triggers and approval gates

2. **New Modal Templates**
   - **PRICING_SHEET**: Structured pricing data collection with cost breakdowns
   - **COMPLIANCE_MATRIX**: Requirements mapping and compliance tracking

3. **AI Checklist Generation**
   - Enhanced `generateChecklistFromAI` function to suggest new modal types
   - Smarter recommendations based on project context

### How to Use

#### Using ChecklistItemRenderer with Modals

```jsx
import ChecklistItemRenderer from '@/components/proposals/ChecklistItemRenderer';
import { useChecklistModal } from '@/components/proposals/modals/ChecklistIntegration';

function MyChecklist({ columnId, proposal }) {
  const modalProps = useChecklistModal(proposal.id, proposal.organization_id);

  return (
    <>
      <ChecklistItemRenderer
        item={{
          id: 'pricing_1',
          label: 'Add Pricing Details',
          type: 'modal_trigger',
          associated_action: 'pricing_sheet',
          required: true
        }}
        completed={false}
        onToggle={() => {}}
        onClick={modalProps.handleItemClick}
      />
      
      <DynamicModal {...modalProps.modalProps} />
    </>
  );
}
```

#### Available Modal Actions

- `pricing_sheet` - Structured pricing data collection
- `compliance_matrix` - Requirements compliance tracking
- `add_partner` - Teaming partner information
- `upload_solicitation` - Document upload with RAG
- `add_past_performance` - Past performance entries
- `ai_data_collection` - AI-enhanced data calls

---

## Phase 2: Enhanced Features

### Phase 2.1: Enhanced File Upload

**Component:** `EnhancedFileUpload`

**Features:**
- Drag-and-drop file upload
- Client-side preview before upload
- Support for multiple file types (images, PDFs, docs)
- Progress indication
- File validation

**Usage:**

```jsx
import EnhancedFileUpload from '@/components/ui/EnhancedFileUpload';

<EnhancedFileUpload
  label="Upload Documents"
  accept=".pdf,.docx,.xlsx"
  maxSizeMB={50}
  multiple={true}
  showPreviewBeforeUpload={true}
  onUploadComplete={(files) => {
    console.log('Uploaded files:', files);
  }}
  currentFiles={existingFiles}
/>
```

**Key Props:**
- `accept`: File type restrictions (e.g., ".pdf,.docx")
- `maxSizeMB`: Maximum file size per file
- `multiple`: Allow multiple file selection
- `showPreviewBeforeUpload`: Show preview dialog before uploading
- `onUploadComplete`: Callback with uploaded file data

### Phase 2.3: Autosave & Draft Recovery

**Hook:** `useAutosave`

**Features:**
- Automatic draft saving to localStorage
- Debounced saves (default 2 seconds)
- Draft recovery dialog on modal reopen
- Visual save indicators

**Usage:**

```jsx
import { useAutosave } from '@/components/proposals/modals/useAutosave';

function MyModal({ isOpen, modalId, formData }) {
  const autosave = useAutosave(modalId, formData, isOpen, 2000);

  // Check if draft exists
  useEffect(() => {
    if (autosave.hasDraft()) {
      const draft = autosave.loadDraft();
      setFormData(draft);
    }
  }, []);

  // Manual save
  const handleSave = () => {
    autosave.saveDraft();
  };

  // Clear on submit
  const handleSubmit = async () => {
    await submitData(formData);
    autosave.clearDraft();
  };

  return (
    <div>
      {autosave.lastSaved && (
        <span>Last saved: {autosave.lastSaved.toLocaleTimeString()}</span>
      )}
    </div>
  );
}
```

**Autosave is already integrated into DynamicModal** - no additional setup needed!

### Phase 2.4: Performance Optimizations

**Component:** `OptimizedDynamicModal`

**Features:**
- Memoized field components to prevent unnecessary re-renders
- Optimized validation with debouncing
- Reduced bundle size through component memoization
- Faster initial render times

**Usage:**

Use `OptimizedDynamicModal` as a drop-in replacement for `DynamicModal` when dealing with:
- Large forms (>20 fields)
- Complex conditional logic
- High-frequency updates
- Performance-sensitive scenarios

```jsx
import OptimizedDynamicModal from '@/components/proposals/modals/OptimizedDynamicModal';

// Same API as DynamicModal
<OptimizedDynamicModal
  isOpen={isOpen}
  onClose={onClose}
  config={config}
/>
```

---

## Phase 3: Advanced Data Management

### Phase 3.1: Version History

**Component:** `ModalVersionHistory`

**Features:**
- Complete audit trail of all submissions
- View who submitted what and when
- Restore previous versions
- Expandable data snapshots

**Usage:**

```jsx
import ModalVersionHistory from '@/components/proposals/modals/ModalVersionHistory';

<ModalVersionHistory
  isOpen={showHistory}
  onClose={() => setShowHistory(false)}
  config={{
    modalId: 'pricing_sheet',
    proposalId: proposal.id,
    onRestore: async (data) => {
      // Handle restoration
      await restoreData(data);
    }
  }}
  entityId={currentEntityId}
/>
```

**How It Works:**
1. Every modal submission is tracked in `ModalInteraction` entity
2. `form_data_snapshot` field stores full form data as JSON
3. Version history displays chronologically
4. Click "Restore" to revert to previous version

### Phase 3.2: Bulk Import/Export

**Component:** `BulkModalOperations`

**Features:**
- Export existing records to CSV
- Import multiple records via CSV or JSON
- Template download for correct format
- Validation and error reporting

**Usage:**

```jsx
import BulkModalOperations from '@/components/proposals/modals/BulkModalOperations';

<BulkModalOperations
  isOpen={showBulk}
  onClose={() => setShowBulk(false)}
  config={{
    title: 'Pricing Data',
    targetEntity: 'PricingItem',
    organizationId: org.id,
    proposalId: proposal.id,
    fields: [
      { name: 'item_name', label: 'Item Name' },
      { name: 'quantity', label: 'Quantity' },
      { name: 'unit_price', label: 'Unit Price' }
    ],
    onImportComplete: () => {
      // Refresh data after import
      refetch();
    }
  }}
/>
```

**CSV Format Example:**
```csv
item_name,quantity,unit_price
Labor - Senior Engineer,100,150
Labor - Junior Engineer,200,85
Equipment - Server,5,5000
```

**JSON Format Example:**
```json
[
  { "item_name": "Labor - Senior Engineer", "quantity": 100, "unit_price": 150 },
  { "item_name": "Labor - Junior Engineer", "quantity": 200, "unit_price": 85 }
]
```

---

## Complete Integration Example

Here's a full example showing how to use all Phase 1-3 features together:

```jsx
import React, { useState } from 'react';
import { useChecklistModal } from '@/components/proposals/modals/ChecklistIntegration';
import ChecklistItemRenderer from '@/components/proposals/ChecklistItemRenderer';
import DynamicModal from '@/components/proposals/modals/DynamicModal';
import ModalVersionHistory from '@/components/proposals/modals/ModalVersionHistory';
import BulkModalOperations from '@/components/proposals/modals/BulkModalOperations';
import { Button } from '@/components/ui/button';
import { Clock, FileSpreadsheet } from 'lucide-react';

function ProposalWorkflowPanel({ proposal, organization }) {
  const [showHistory, setShowHistory] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [currentEntityId, setCurrentEntityId] = useState(null);
  
  // Setup modal integration
  const modalProps = useChecklistModal(proposal.id, organization.id);

  // Checklist items
  const checklistItems = [
    {
      id: 'pricing_1',
      label: 'Add Pricing Sheet',
      type: 'modal_trigger',
      associated_action: 'pricing_sheet',
      required: true
    },
    {
      id: 'compliance_1',
      label: 'Complete Compliance Matrix',
      type: 'modal_trigger',
      associated_action: 'compliance_matrix',
      required: true
    }
  ];

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHistory(true)}
        >
          <Clock className="w-4 h-4 mr-2" />
          Version History
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBulk(true)}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Bulk Operations
        </Button>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {checklistItems.map(item => (
          <ChecklistItemRenderer
            key={item.id}
            item={item}
            completed={false}
            onToggle={() => {}}
            onClick={modalProps.handleItemClick}
          />
        ))}
      </div>

      {/* Dynamic Modal - includes autosave automatically */}
      <DynamicModal {...modalProps.modalProps} />

      {/* Version History */}
      <ModalVersionHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        config={{
          modalId: modalProps.currentModalKey,
          proposalId: proposal.id,
          onRestore: async (data) => {
            // Handle restoration
            console.log('Restoring:', data);
          }
        }}
        entityId={currentEntityId}
      />

      {/* Bulk Operations */}
      <BulkModalOperations
        isOpen={showBulk}
        onClose={() => setShowBulk(false)}
        config={{
          title: 'Pricing Data',
          targetEntity: 'PricingItem',
          organizationId: organization.id,
          proposalId: proposal.id,
          fields: [
            { name: 'item_name', label: 'Item Name' },
            { name: 'quantity', label: 'Quantity' }
          ],
          onImportComplete: () => {
            // Refresh after import
          }
        }}
      />
    </div>
  );
}
```

---

## Performance Best Practices

1. **Use OptimizedDynamicModal for large forms** (>15 fields)
2. **Leverage autosave** - it's automatic, no extra setup needed
3. **Implement version history** for audit trails
4. **Use bulk operations** for migrating or seeding data
5. **Lazy load heavy components** when not immediately visible

---

## Troubleshooting

### Autosave not working
- Check that `modalId` is unique and consistent
- Verify localStorage is available
- Check browser console for errors

### File upload fails
- Verify file size is within limits
- Check file type matches `accept` prop
- Ensure network connectivity

### Version history empty
- Confirm `ModalInteraction` entity exists
- Check that tracking is enabled
- Verify `proposalId` and `modalId` match

### Bulk import errors
- Validate CSV headers match field names
- Check for special characters in data
- Ensure all required fields are present

---

## Next Steps

Phase 1-3 are now complete! Future enhancements could include:

- Advanced field types (rich text, date ranges, etc.)
- Collaborative editing with real-time sync
- Advanced validation rules engine
- Custom workflow automation
- Mobile-optimized modal interfaces

---

## Support

For questions or issues with the Dynamic Modal system, refer to:
- This integration guide
- Component source code comments
- System verification page
- Development team