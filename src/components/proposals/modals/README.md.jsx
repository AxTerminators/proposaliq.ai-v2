# DynamicModal System - Complete Documentation

## Overview

The DynamicModal system provides a flexible, JSON-configured modal framework with built-in:
- **Automatic RAG ingestion** for uploaded documents
- **AI-powered data extraction** and field pre-population
- **Multi-step forms** with progress tracking
- **Conditional field visibility** based on user input
- **Dynamic arrays** (add/remove multiple items)
- **Custom validation** with inline error messages
- **Pre-built templates** for common workflows

---

## Quick Start

### Basic Usage

```jsx
import DynamicModal from './components/proposals/modals/DynamicModal';
import { useState } from 'react';

function MyComponent({ proposalId, organizationId }) {
  const [isOpen, setIsOpen] = useState(false);

  const config = {
    title: 'Add Information',
    description: 'Fill in the details',
    proposalId, // Required for file uploads
    fields: [
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        required: true
      }
    ],
    onSubmit: async (formData) => {
      console.log('Form data:', formData);
      // Save to database...
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>
      <DynamicModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        config={config}
      />
    </>
  );
}
```

---

## Field Types

### Text Input
```jsx
{
  name: 'company_name',
  label: 'Company Name',
  type: 'text',
  required: true,
  placeholder: 'Enter company name',
  helpText: 'Official registered name',
  validation: {
    minLength: 3,
    maxLength: 100,
    pattern: '^[a-zA-Z0-9 ]+$',
    patternMessage: 'Only letters, numbers, and spaces allowed'
  }
}
```

### Number Input
```jsx
{
  name: 'contract_value',
  label: 'Contract Value ($)',
  type: 'number',
  validation: {
    min: 0,
    max: 1000000000,
    custom: (value) => {
      if (value && value < 1000) {
        return 'Contract value should be at least $1,000';
      }
      return null;
    }
  }
}
```

### Select Dropdown
```jsx
{
  name: 'partner_type',
  label: 'Partner Type',
  type: 'select',
  required: true,
  options: [
    { value: 'prime', label: 'Prime Contractor' },
    { value: 'sub', label: 'Subcontractor' }
  ]
}
```

### Textarea
```jsx
{
  name: 'description',
  label: 'Description',
  type: 'textarea',
  rows: 4,
  validation: {
    minLength: 50,
    maxLength: 1000
  }
}
```

### Checkbox
```jsx
{
  name: 'is_active',
  label: 'Active Partner',
  type: 'checkbox'
}
```

### Date Input
```jsx
{
  name: 'due_date',
  label: 'Due Date',
  type: 'date',
  required: true
}
```

### Dynamic Array
```jsx
{
  name: 'team_members',
  label: 'Team Members',
  type: 'array',
  placeholder: 'email@example.com',
  helpText: 'Add multiple team members'
}
```

### File Upload with RAG
```jsx
{
  name: 'capability_statement',
  label: 'Capability Statement',
  type: 'file_upload',
  required: true,
  accept: '.docx,.pdf',
  maxSize: 10, // MB
  description: 'Upload capability statement',
  // Enable RAG ingestion
  ingest_to_rag: true,
  entity_type: 'ProposalResource',
  resource_type: 'partner_capability',
  content_category: 'general',
  // Optional: Extract structured data
  extract_data_schema: {
    type: 'object',
    properties: {
      company_name: { type: 'string' },
      uei: { type: 'string' },
      cage_code: { type: 'string' },
      certifications: { 
        type: 'array', 
        items: { type: 'string' } 
      }
    }
  }
}
```

---

## Advanced Features

### Conditional Field Visibility

```jsx
{
  name: 'partner_type',
  type: 'select',
  options: [...]
},
{
  name: 'hourly_rate',
  label: 'Hourly Rate',
  type: 'number',
  // Only show if partner_type is 'consultant'
  showIf: {
    field: 'partner_type',
    value: 'consultant',
    operator: 'equals'
  }
}
```

**Supported operators:**
- `equals` - Field value equals expected value
- `notEquals` - Field value does not equal expected value
- `contains` - Array field contains expected value
- `greaterThan` - Numeric field greater than value
- `lessThan` - Numeric field less than value
- `isEmpty` - Field is empty
- `isNotEmpty` - Field has a value

### Multi-Step Forms

```jsx
{
  title: 'New Proposal Wizard',
  steps: [
    {
      title: 'Basic Information',
      description: 'Enter core details',
      fields: [
        { name: 'name', label: 'Proposal Name', type: 'text', required: true }
      ]
    },
    {
      title: 'Team',
      description: 'Add team members',
      fields: [
        { name: 'lead', label: 'Lead Writer', type: 'email', required: true }
      ]
    }
  ],
  submitLabel: 'Create Proposal',
  onSubmit: async (formData) => { ... }
}
```

### Custom Validation

```jsx
{
  name: 'email',
  label: 'Email',
  type: 'email',
  validation: {
    custom: (value, allFormData) => {
      if (!value.endsWith('@company.com')) {
        return 'Must use company email';
      }
      if (allFormData.partner_type === 'prime' && !value.includes('admin')) {
        return 'Prime contractor must be admin';
      }
      return null; // No error
    }
  }
}
```

---

## File Upload & RAG Integration

When a file is uploaded with `ingest_to_rag: true`:

1. **Upload** - File is uploaded to Base44 storage
2. **Parse** - DOCX files are parsed to extract text
3. **Create Entity** - Entity record is created (ProposalResource or SolicitationDocument)
4. **RAG Index** - Content is indexed for AI retrieval
5. **Extract Data** (optional) - If `extract_data_schema` provided, LLM extracts structured data
6. **Pre-populate** (optional) - Extracted data auto-fills matching form fields
7. **Review Mode** - User reviews and confirms extracted data before final save

### Form Data Result

```javascript
{
  capability_statement: {
    file_url: "https://...",
    file_name: "capability.docx",
    file_size: 1024000,
    entity_id: "abc123",
    entity_type: "ProposalResource",
    parsed_text_length: 5000,
    rag_ready: true
  }
}
```

---

## Integration with Checklist System

### Step 1: Import Hook

```jsx
import { useChecklistModal } from './components/proposals/modals/ChecklistIntegration';
```

### Step 2: Use Hook

```jsx
function YourChecklistComponent({ proposal }) {
  const { openModal, modalProps } = useChecklistModal(
    proposal.id,
    proposal.organization_id
  );

  // ... your component logic
}
```

### Step 3: Handle Clicks

```jsx
const handleChecklistItemClick = (item) => {
  if (item.type === 'modal_trigger') {
    openModal(item.associated_action);
    return;
  }
  // ... other item types
};
```

### Step 4: Add Modal to JSX

```jsx
<DynamicModal {...modalProps} />
```

### Step 5: Configure Checklist Items

```jsx
{
  id: 'upload_solicitation',
  label: 'Upload Solicitation',
  type: 'modal_trigger',
  associated_action: 'upload_solicitation',
  required: true
}
```

---

## Pre-Built Templates

Use the template library for common workflows:

```jsx
import ModalTemplateLibrary, { MODAL_TEMPLATES } from './ModalTemplateLibrary';

function MyComponent({ proposalId, organizationId }) {
  const [config, setConfig] = useState(null);
  
  // Option 1: Use template library UI
  return (
    <ModalTemplateLibrary
      proposalId={proposalId}
      organizationId={organizationId}
      onSelectTemplate={setConfig}
    />
  );
  
  // Option 2: Use template directly
  const template = MODAL_TEMPLATES.ADD_TEAMING_PARTNER;
  const config = template.config(proposalId, organizationId);
}
```

**Available Templates:**
- `ADD_TEAMING_PARTNER` - Collect partner info with capability statement
- `UPLOAD_SOLICITATION` - Upload RFP/SOW with auto-extraction
- `ADD_PAST_PERFORMANCE` - Document past projects
- `UPLOAD_RESOURCE` - General document upload to content library
- `AI_DATA_CALL` - Multi-step form with AI extraction

---

## Complete Configuration Reference

```jsx
{
  // Basic config
  title: string,
  description?: string,
  proposalId: string, // Required for file uploads
  successMessage?: string,
  submitLabel?: string,
  
  // Single-step form
  fields: [
    {
      name: string,
      label: string,
      type: 'text' | 'email' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox' | 'file_upload' | 'array',
      required?: boolean,
      placeholder?: string,
      helpText?: string,
      description?: string,
      disabled?: boolean,
      default?: any,
      
      // Select options
      options?: [{ value: string, label: string }],
      
      // Textarea
      rows?: number,
      
      // File upload
      accept?: string,
      maxSize?: number, // MB
      ingest_to_rag?: boolean,
      entity_type?: 'ProposalResource' | 'SolicitationDocument',
      resource_type?: string,
      document_type?: string,
      content_category?: string,
      title_prefix?: string,
      folder_id?: string,
      tags?: string[],
      extract_data_schema?: object,
      
      // Conditional visibility
      showIf?: {
        field: string,
        value: any,
        operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty'
      },
      
      // Validation
      validation?: {
        minLength?: number,
        maxLength?: number,
        min?: number,
        max?: number,
        pattern?: string,
        patternMessage?: string,
        custom?: (value, formData) => string | null
      }
    }
  ],
  
  // OR Multi-step form
  steps: [
    {
      title: string,
      description?: string,
      fields: [...] // Same as above
    }
  ],
  
  // Submit handler
  onSubmit: async (formData) => { ... }
}
```

---

## Examples

See these files for complete examples:
- `DynamicModalExample.jsx` - Basic usage examples
- `DynamicModalWithExtraction.jsx` - AI extraction examples
- `AdvancedFormExamples.jsx` - Conditional fields, multi-step, arrays
- `ModalTemplateLibrary.jsx` - Pre-built templates
- `ChecklistIntegration.jsx` - Integration with checklist system

---

## Best Practices

1. **Always provide `proposalId`** for file uploads
2. **Use `helpText`** to guide users on what to enter
3. **Implement `extract_data_schema`** for documents with structured data
4. **Use multi-step forms** for complex data collection (5+ fields)
5. **Add custom validation** for business logic requirements
6. **Leverage templates** instead of writing configs from scratch
7. **Handle errors** in `onSubmit` - they're automatically displayed to users
8. **Test conditional logic** - ensure fields show/hide correctly
9. **Validate file types** - specify accepted formats in `accept`
10. **Set reasonable file size limits** with `maxSize