import React, { useState } from 'react';
import DynamicModal from './DynamicModal';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

/**
 * Phase 3: Advanced Form Features Examples
 * 
 * Demonstrates:
 * - Conditional field visibility
 * - Field dependencies
 * - Multi-step forms
 * - Dynamic arrays (add/remove items)
 * - Custom validation
 * - Inline help text
 */
export default function AdvancedFormExamples({ proposalId, organizationId }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExample, setSelectedExample] = useState('conditional');

  // Example 1: Conditional Fields
  const conditionalFieldsConfig = {
    title: 'Add Teaming Partner',
    description: 'Different fields appear based on partner type',
    fields: [
      {
        name: 'partner_type',
        label: 'Partner Type',
        type: 'select',
        required: true,
        options: [
          { value: 'subcontractor', label: 'Subcontractor' },
          { value: 'prime', label: 'Prime Contractor' },
          { value: 'consultant', label: 'Consultant' }
        ],
        helpText: 'Select the type of partnership'
      },
      {
        name: 'company_name',
        label: 'Company Name',
        type: 'text',
        required: true
      },
      // Only show for subcontractor/prime
      {
        name: 'uei',
        label: 'UEI Number',
        type: 'text',
        showIf: {
          field: 'partner_type',
          value: 'consultant',
          operator: 'notEquals'
        },
        helpText: 'Required for government contractors'
      },
      {
        name: 'cage_code',
        label: 'CAGE Code',
        type: 'text',
        showIf: {
          field: 'partner_type',
          value: 'consultant',
          operator: 'notEquals'
        }
      },
      // Only show for consultant
      {
        name: 'hourly_rate',
        label: 'Hourly Rate ($)',
        type: 'number',
        showIf: {
          field: 'partner_type',
          value: 'consultant',
          operator: 'equals'
        },
        validation: { min: 0 }
      },
      // Show for prime only
      {
        name: 'is_incumbent',
        label: 'Is this the incumbent contractor?',
        type: 'checkbox',
        showIf: {
          field: 'partner_type',
          value: 'prime',
          operator: 'equals'
        }
      }
    ],
    onSubmit: async (formData) => {
      await base44.entities.TeamingPartner.create({
        organization_id: organizationId,
        partner_name: formData.company_name,
        partner_type: formData.partner_type,
        uei: formData.uei,
        cage_code: formData.cage_code
      });
    }
  };

  // Example 2: Multi-Step Form
  const multiStepConfig = {
    title: 'New Proposal Wizard',
    steps: [
      {
        title: 'Basic Information',
        description: 'Enter the core proposal details',
        fields: [
          {
            name: 'proposal_name',
            label: 'Proposal Name',
            type: 'text',
            required: true,
            helpText: 'Internal name for tracking this proposal'
          },
          {
            name: 'project_type',
            label: 'Project Type',
            type: 'select',
            required: true,
            options: [
              { value: 'RFP', label: 'RFP' },
              { value: 'RFQ', label: 'RFQ' },
              { value: 'RFI', label: 'RFI' }
            ]
          },
          {
            name: 'due_date',
            label: 'Due Date',
            type: 'date',
            required: true
          }
        ]
      },
      {
        title: 'Client & Agency',
        description: 'Who is this proposal for?',
        fields: [
          {
            name: 'agency_name',
            label: 'Agency Name',
            type: 'text',
            required: true
          },
          {
            name: 'solicitation_number',
            label: 'Solicitation Number',
            type: 'text',
            helpText: 'Official solicitation or RFP number'
          },
          {
            name: 'contract_value',
            label: 'Estimated Contract Value ($)',
            type: 'number',
            validation: { min: 0 }
          }
        ]
      },
      {
        title: 'Team & Resources',
        description: 'Add team members and initial resources',
        fields: [
          {
            name: 'lead_writer',
            label: 'Lead Writer Email',
            type: 'email',
            required: true,
            helpText: 'Who will be the primary writer for this proposal?'
          },
          {
            name: 'team_members',
            label: 'Additional Team Members',
            type: 'array',
            helpText: 'Add emails of other team members',
            placeholder: 'email@example.com'
          }
        ]
      }
    ],
    submitLabel: 'Create Proposal',
    onSubmit: async (formData) => {
      const proposal = await base44.entities.Proposal.create({
        organization_id: organizationId,
        proposal_name: formData.proposal_name,
        project_type: formData.project_type,
        due_date: formData.due_date,
        agency_name: formData.agency_name,
        solicitation_number: formData.solicitation_number,
        contract_value: formData.contract_value,
        lead_writer_email: formData.lead_writer,
        assigned_team_members: formData.team_members || []
      });
      return proposal;
    }
  };

  // Example 3: Dynamic Arrays with Validation
  const dynamicArrayConfig = {
    title: 'Add Past Performance',
    description: 'Document a past project with key accomplishments',
    fields: [
      {
        name: 'project_name',
        label: 'Project Name',
        type: 'text',
        required: true
      },
      {
        name: 'client',
        label: 'Client Name',
        type: 'text',
        required: true
      },
      {
        name: 'key_accomplishments',
        label: 'Key Accomplishments',
        type: 'array',
        helpText: 'Add multiple accomplishments from this project',
        placeholder: 'e.g., Delivered 30% under budget'
      },
      {
        name: 'technologies_used',
        label: 'Technologies Used',
        type: 'array',
        helpText: 'List the key technologies used in this project',
        placeholder: 'e.g., Python, AWS, React'
      },
      {
        name: 'contract_value',
        label: 'Contract Value ($)',
        type: 'number',
        validation: { 
          min: 0,
          custom: (value) => {
            if (value && value < 1000) {
              return 'Contract value should be at least $1,000';
            }
            return null;
          }
        }
      }
    ],
    onSubmit: async (formData) => {
      await base44.entities.PastPerformance.create({
        organization_id: organizationId,
        proposal_id: proposalId,
        project_name: formData.project_name,
        client: formData.client,
        contract_value: formData.contract_value,
        key_accomplishments: formData.key_accomplishments?.filter(a => a.trim()),
        technologies_used: formData.technologies_used?.filter(t => t.trim())
      });
    }
  };

  // Example 4: Complex Dependencies
  const complexDependenciesConfig = {
    title: 'Resource Upload Configuration',
    description: 'Configure resource with smart field dependencies',
    fields: [
      {
        name: 'resource_type',
        label: 'Resource Type',
        type: 'select',
        required: true,
        options: [
          { value: 'boilerplate', label: 'Boilerplate Text' },
          { value: 'document', label: 'Document' },
          { value: 'template', label: 'Template' }
        ]
      },
      // Show text area for boilerplate
      {
        name: 'boilerplate_content',
        label: 'Boilerplate Content',
        type: 'textarea',
        rows: 8,
        required: true,
        showIf: {
          field: 'resource_type',
          value: 'boilerplate',
          operator: 'equals'
        }
      },
      // Show file upload for document/template
      {
        name: 'file',
        label: 'Upload File',
        type: 'file_upload',
        required: true,
        accept: '.docx,.pdf',
        maxSize: 10,
        showIf: {
          field: 'resource_type',
          value: 'boilerplate',
          operator: 'notEquals'
        },
        ingest_to_rag: true,
        entity_type: 'ProposalResource'
      },
      {
        name: 'content_category',
        label: 'Content Category',
        type: 'select',
        required: true,
        options: [
          { value: 'company_overview', label: 'Company Overview' },
          { value: 'past_performance', label: 'Past Performance' },
          { value: 'technical_approach', label: 'Technical Approach' },
          { value: 'management', label: 'Management' },
          { value: 'general', label: 'General' }
        ],
        showIf: {
          field: 'resource_type',
          value: 'boilerplate',
          operator: 'equals'
        }
      },
      {
        name: 'is_reusable',
        label: 'Make available for other proposals',
        type: 'checkbox',
        showIf: {
          field: 'resource_type',
          value: 'template',
          operator: 'equals'
        }
      },
      {
        name: 'tags',
        label: 'Tags',
        type: 'array',
        placeholder: 'Add tags for search...',
        helpText: 'Add tags to make this resource easier to find'
      }
    ],
    onSubmit: async (formData) => {
      const resourceData = {
        organization_id: organizationId,
        resource_type: formData.resource_type === 'boilerplate' 
          ? 'boilerplate_text' 
          : formData.resource_type,
        title: formData.title,
        tags: formData.tags?.filter(t => t.trim())
      };

      if (formData.resource_type === 'boilerplate') {
        resourceData.boilerplate_content = formData.boilerplate_content;
        resourceData.content_category = formData.content_category;
      } else {
        resourceData.file_url = formData.file?.file_url;
        resourceData.file_name = formData.file?.file_name;
      }

      await base44.entities.ProposalResource.create(resourceData);
    }
  };

  const examples = {
    conditional: conditionalFieldsConfig,
    multiStep: multiStepConfig,
    arrays: dynamicArrayConfig,
    dependencies: complexDependenciesConfig
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Advanced Form Features</h2>
        <p className="text-slate-600 mt-1">
          Conditional fields, multi-step flows, and dynamic arrays
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Button 
          onClick={() => {
            setSelectedExample('conditional');
            setIsModalOpen(true);
          }}
        >
          Conditional Fields
        </Button>
        <Button 
          variant="outline"
          onClick={() => {
            setSelectedExample('multiStep');
            setIsModalOpen(true);
          }}
        >
          Multi-Step Form
        </Button>
        <Button 
          variant="secondary"
          onClick={() => {
            setSelectedExample('arrays');
            setIsModalOpen(true);
          }}
        >
          Dynamic Arrays
        </Button>
        <Button 
          variant="outline"
          onClick={() => {
            setSelectedExample('dependencies');
            setIsModalOpen(true);
          }}
        >
          Complex Dependencies
        </Button>
      </div>

      <DynamicModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={examples[selectedExample]}
      />
    </div>
  );
}