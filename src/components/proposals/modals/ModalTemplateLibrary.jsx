import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Users, Upload, CheckSquare, Sparkles } from 'lucide-react';

/**
 * Phase 4: Modal Template Library
 * 
 * Pre-built modal configurations for common proposal workflows.
 * Makes it easy to reuse and deploy modals across different use cases.
 */

// Template catalog with pre-configured modal schemas
export const MODAL_TEMPLATES = {
  // Teaming Partner Management
  ADD_TEAMING_PARTNER: {
    id: 'add_teaming_partner',
    name: 'Add Teaming Partner',
    description: 'Collect partner information with optional capability statement upload',
    icon: Users,
    category: 'Team Management',
    config: (proposalId, organizationId) => ({
      title: 'Add Teaming Partner',
      description: 'Add a new teaming partner to this proposal',
      proposalId,
      fields: [
        {
          name: 'partner_name',
          label: 'Partner Name',
          type: 'text',
          required: true,
          placeholder: 'Company name'
        },
        {
          name: 'partner_type',
          label: 'Partner Type',
          type: 'select',
          required: true,
          options: [
            { value: 'prime', label: 'Prime Contractor' },
            { value: 'subcontractor', label: 'Subcontractor' },
            { value: 'teaming_partner', label: 'Teaming Partner' },
            { value: 'consultant', label: 'Consultant' }
          ]
        },
        {
          name: 'capability_statement',
          label: 'Capability Statement (Optional)',
          type: 'file_upload',
          accept: '.docx,.pdf',
          maxSize: 10,
          description: 'Upload capability statement - will be indexed for AI',
          ingest_to_rag: true,
          entity_type: 'ProposalResource',
          resource_type: 'partner_capability',
          extract_data_schema: {
            type: 'object',
            properties: {
              uei: { type: 'string' },
              cage_code: { type: 'string' },
              certifications: { type: 'array', items: { type: 'string' } },
              core_capabilities: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        {
          name: 'uei',
          label: 'UEI Number',
          type: 'text',
          placeholder: 'Will auto-fill from document'
        },
        {
          name: 'cage_code',
          label: 'CAGE Code',
          type: 'text',
          placeholder: 'Will auto-fill from document'
        },
        {
          name: 'poc_name',
          label: 'Point of Contact',
          type: 'text'
        },
        {
          name: 'poc_email',
          label: 'Contact Email',
          type: 'email'
        }
      ],
      onSubmit: async (formData) => {
        const { base44 } = await import('@/api/base44Client');
        await base44.entities.TeamingPartner.create({
          organization_id: organizationId,
          partner_name: formData.partner_name,
          partner_type: formData.partner_type,
          uei: formData.uei,
          cage_code: formData.cage_code,
          poc_name: formData.poc_name,
          poc_email: formData.poc_email,
          capability_statement_url: formData.capability_statement?.file_url
        });
      }
    })
  },

  // Solicitation Document Upload
  UPLOAD_SOLICITATION: {
    id: 'upload_solicitation',
    name: 'Upload Solicitation',
    description: 'Upload RFP, SOW, or other solicitation documents with auto-extraction',
    icon: FileText,
    category: 'Documents',
    config: (proposalId, organizationId) => ({
      title: 'Upload Solicitation Document',
      description: 'Key requirements will be automatically extracted',
      proposalId,
      fields: [
        {
          name: 'document_type',
          label: 'Document Type',
          type: 'select',
          required: true,
          options: [
            { value: 'rfp', label: 'RFP' },
            { value: 'rfq', label: 'RFQ' },
            { value: 'sow', label: 'Statement of Work' },
            { value: 'pws', label: 'Performance Work Statement' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          name: 'document',
          label: 'Document File',
          type: 'file_upload',
          required: true,
          accept: '.docx,.pdf',
          maxSize: 25,
          description: 'Upload the solicitation document',
          ingest_to_rag: true,
          entity_type: 'SolicitationDocument',
          extract_data_schema: {
            type: 'object',
            properties: {
              solicitation_number: { type: 'string' },
              agency_name: { type: 'string' },
              due_date: { type: 'string' },
              contract_value: { type: 'number' },
              naics_code: { type: 'string' }
            }
          }
        },
        {
          name: 'solicitation_number',
          label: 'Solicitation Number',
          type: 'text',
          placeholder: 'Will auto-fill from document'
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          rows: 2,
          placeholder: 'Brief description (optional)'
        }
      ],
      onSubmit: async (formData) => {
        const { base44 } = await import('@/api/base44Client');
        if (formData.document?.entity_id) {
          await base44.entities.SolicitationDocument.update(
            formData.document.entity_id,
            {
              document_type: formData.document_type,
              description: formData.description
            }
          );
        }
      }
    })
  },

  // Past Performance Entry
  ADD_PAST_PERFORMANCE: {
    id: 'add_past_performance',
    name: 'Add Past Performance',
    description: 'Document past projects with optional file upload',
    icon: CheckSquare,
    category: 'Content',
    config: (proposalId, organizationId) => ({
      title: 'Add Past Performance',
      description: 'Document a past project for reference',
      proposalId,
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
          name: 'start_date',
          label: 'Start Date',
          type: 'date',
          required: true
        },
        {
          name: 'end_date',
          label: 'End Date',
          type: 'date'
        },
        {
          name: 'contract_value',
          label: 'Contract Value ($)',
          type: 'number',
          validation: { min: 0 }
        },
        {
          name: 'description',
          label: 'Project Description',
          type: 'textarea',
          required: true,
          rows: 4
        },
        {
          name: 'document',
          label: 'Supporting Documentation (Optional)',
          type: 'file_upload',
          accept: '.docx,.pdf',
          maxSize: 15,
          description: 'Upload project documentation',
          ingest_to_rag: true,
          entity_type: 'ProposalResource',
          resource_type: 'past_performance'
        }
      ],
      onSubmit: async (formData) => {
        const { base44 } = await import('@/api/base44Client');
        await base44.entities.PastPerformance.create({
          organization_id: organizationId,
          proposal_id: proposalId,
          project_name: formData.project_name,
          client: formData.client,
          start_date: formData.start_date,
          end_date: formData.end_date,
          contract_value: formData.contract_value,
          description: formData.description,
          document_url: formData.document?.file_url
        });
      }
    })
  },

  // Quick Resource Upload
  UPLOAD_RESOURCE: {
    id: 'upload_resource',
    name: 'Upload Resource',
    description: 'Upload any document to the content library with auto-indexing',
    icon: Upload,
    category: 'Content',
    config: (proposalId, organizationId) => ({
      title: 'Upload Resource',
      description: 'Add a document to your content library',
      proposalId,
      fields: [
        {
          name: 'title',
          label: 'Resource Title',
          type: 'text',
          required: true
        },
        {
          name: 'resource_type',
          label: 'Resource Type',
          type: 'select',
          required: true,
          options: [
            { value: 'capability_statement', label: 'Capability Statement' },
            { value: 'past_proposal', label: 'Past Proposal' },
            { value: 'boilerplate_text', label: 'Boilerplate Text' },
            { value: 'template', label: 'Template' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          name: 'file',
          label: 'File',
          type: 'file_upload',
          required: true,
          accept: '.docx,.pdf',
          maxSize: 20,
          description: 'Upload document - will be indexed for AI search',
          ingest_to_rag: true,
          entity_type: 'ProposalResource'
        },
        {
          name: 'tags',
          label: 'Tags',
          type: 'array',
          placeholder: 'Add tags...',
          helpText: 'Add tags to make this easier to find'
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          rows: 3
        }
      ],
      onSubmit: async (formData) => {
        const { base44 } = await import('@/api/base44Client');
        await base44.entities.ProposalResource.create({
          organization_id: organizationId,
          title: formData.title,
          resource_type: formData.resource_type,
          file_url: formData.file?.file_url,
          file_name: formData.file?.file_name,
          tags: formData.tags?.filter(t => t.trim()),
          description: formData.description
        });
      }
    })
  },

  // AI-Enhanced Data Collection
  AI_DATA_CALL: {
    id: 'ai_data_call',
    name: 'AI-Enhanced Data Call',
    description: 'Smart form that adapts based on uploaded documents',
    icon: Sparkles,
    category: 'AI-Powered',
    config: (proposalId, organizationId) => ({
      title: 'Submit Data Call Response',
      description: 'Upload documents - AI will extract and pre-fill information',
      proposalId,
      steps: [
        {
          title: 'Upload Documents',
          description: 'Upload any supporting documents',
          fields: [
            {
              name: 'primary_document',
              label: 'Primary Document',
              type: 'file_upload',
              required: true,
              accept: '.docx,.pdf',
              maxSize: 20,
              ingest_to_rag: true,
              entity_type: 'ProposalResource',
              extract_data_schema: {
                type: 'object',
                properties: {
                  company_name: { type: 'string' },
                  contact_name: { type: 'string' },
                  contact_email: { type: 'string' },
                  key_points: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          ]
        },
        {
          title: 'Review & Edit',
          description: 'Review extracted information',
          fields: [
            {
              name: 'company_name',
              label: 'Company Name',
              type: 'text',
              required: true,
              placeholder: 'Auto-filled from document'
            },
            {
              name: 'contact_name',
              label: 'Contact Name',
              type: 'text',
              placeholder: 'Auto-filled from document'
            },
            {
              name: 'contact_email',
              label: 'Email',
              type: 'email',
              placeholder: 'Auto-filled from document'
            },
            {
              name: 'notes',
              label: 'Additional Notes',
              type: 'textarea',
              rows: 3
            }
          ]
        }
      ],
      submitLabel: 'Submit Response',
      onSubmit: async (formData) => {
        const { base44 } = await import('@/api/base44Client');
        await base44.entities.ProposalResource.create({
          organization_id: organizationId,
          proposal_id: proposalId,
          resource_type: 'other',
          title: `Data Call Response - ${formData.company_name}`,
          file_url: formData.primary_document?.file_url,
          description: formData.notes
        });
      }
    })
  }
};

export default function ModalTemplateLibrary({ onSelectTemplate, proposalId, organizationId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', ...new Set(Object.values(MODAL_TEMPLATES).map(t => t.category))];

  const filteredTemplates = Object.values(MODAL_TEMPLATES).filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Modal Template Library</h2>
        <p className="text-slate-600 mt-1">
          Pre-built modal configurations for common workflows
        </p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'All' : cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => {
          const Icon = template.icon;
          return (
            <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Icon className="w-8 h-8 text-blue-600" />
                  <Badge variant="secondary">{template.category}</Badge>
                </div>
                <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => onSelectTemplate(template.config(proposalId, organizationId))}
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No templates found matching your search
        </div>
      )}
    </div>
  );
}