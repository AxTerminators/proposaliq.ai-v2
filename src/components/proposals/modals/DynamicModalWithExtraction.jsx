import React, { useState } from 'react';
import DynamicModal from './DynamicModal';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

/**
 * Example: Document Upload with Automatic Data Extraction
 * 
 * Demonstrates Phase 2 functionality:
 * - Upload document
 * - Automatically parse and extract structured data
 * - Pre-populate form fields
 * - User reviews and edits before saving
 */
export default function DynamicModalWithExtraction({ proposalId, organizationId }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Example: Capability Statement with automatic data extraction
  const capabilityStatementConfig = {
    title: 'Upload Capability Statement',
    description: 'Upload a capability statement - key information will be automatically extracted',
    proposalId: proposalId,
    fields: [
      {
        name: 'capability_statement',
        label: 'Capability Statement Document',
        type: 'file_upload',
        required: true,
        accept: '.docx',
        maxSize: 10,
        description: 'Upload the capability statement (DOCX format for best results)',
        // Enable RAG and data extraction
        ingest_to_rag: true,
        entity_type: 'ProposalResource',
        resource_type: 'partner_capability',
        content_category: 'general',
        // Define what data to extract from the document
        extract_data_schema: {
          type: 'object',
          properties: {
            company_name: { type: 'string' },
            primary_naics: { type: 'string' },
            uei: { type: 'string' },
            cage_code: { type: 'string' },
            core_capabilities: { 
              type: 'array', 
              items: { type: 'string' } 
            },
            certifications: { 
              type: 'array', 
              items: { type: 'string' } 
            },
            employee_count: { type: 'number' },
            years_in_business: { type: 'number' }
          }
        }
      },
      {
        name: 'company_name',
        label: 'Company Name',
        type: 'text',
        required: true,
        placeholder: 'Will be auto-filled from document'
      },
      {
        name: 'primary_naics',
        label: 'Primary NAICS Code',
        type: 'text',
        placeholder: 'Will be auto-filled from document'
      },
      {
        name: 'uei',
        label: 'UEI Number',
        type: 'text',
        placeholder: 'Will be auto-filled from document'
      },
      {
        name: 'cage_code',
        label: 'CAGE Code',
        type: 'text',
        placeholder: 'Will be auto-filled from document'
      },
      {
        name: 'employee_count',
        label: 'Number of Employees',
        type: 'number',
        placeholder: 'Will be auto-filled from document'
      },
      {
        name: 'years_in_business',
        label: 'Years in Business',
        type: 'number',
        placeholder: 'Will be auto-filled from document'
      },
      {
        name: 'notes',
        label: 'Additional Notes',
        type: 'textarea',
        rows: 3,
        placeholder: 'Any manual notes or corrections...'
      }
    ],
    onSubmit: async (formData) => {
      console.log('Saving teaming partner with extracted data:', formData);
      
      // Create TeamingPartner with extracted + reviewed data
      await base44.entities.TeamingPartner.create({
        organization_id: organizationId,
        partner_name: formData.company_name,
        primary_naics: formData.primary_naics,
        uei: formData.uei,
        cage_code: formData.cage_code,
        employee_count: formData.employee_count,
        years_in_business: formData.years_in_business,
        capability_statement_url: formData.capability_statement?.file_url,
        notes: formData.notes,
        ai_extracted: true,
        extraction_date: new Date().toISOString()
      });
    }
  };

  // Example: Past Performance with extraction
  const pastPerformanceConfig = {
    title: 'Upload Past Performance',
    description: 'Upload a past performance document - project details will be extracted',
    proposalId: proposalId,
    fields: [
      {
        name: 'performance_doc',
        label: 'Past Performance Document',
        type: 'file_upload',
        required: true,
        accept: '.docx',
        maxSize: 15,
        description: 'Upload project documentation or performance report',
        ingest_to_rag: true,
        entity_type: 'ProposalResource',
        resource_type: 'past_performance',
        content_category: 'past_performance',
        extract_data_schema: {
          type: 'object',
          properties: {
            project_name: { type: 'string' },
            client: { type: 'string' },
            contract_value: { type: 'number' },
            start_date: { type: 'string' },
            end_date: { type: 'string' },
            description: { type: 'string' },
            key_accomplishments: { 
              type: 'array', 
              items: { type: 'string' } 
            }
          }
        }
      },
      {
        name: 'project_name',
        label: 'Project Name',
        type: 'text',
        required: true,
        placeholder: 'Will be auto-filled'
      },
      {
        name: 'client',
        label: 'Client',
        type: 'text',
        required: true,
        placeholder: 'Will be auto-filled'
      },
      {
        name: 'contract_value',
        label: 'Contract Value ($)',
        type: 'number',
        placeholder: 'Will be auto-filled'
      },
      {
        name: 'start_date',
        label: 'Start Date',
        type: 'date',
        placeholder: 'Will be auto-filled'
      },
      {
        name: 'end_date',
        label: 'End Date',
        type: 'date',
        placeholder: 'Will be auto-filled'
      },
      {
        name: 'description',
        label: 'Project Description',
        type: 'textarea',
        required: true,
        rows: 4,
        placeholder: 'Will be auto-filled'
      }
    ],
    onSubmit: async (formData) => {
      console.log('Saving past performance:', formData);
      
      await base44.entities.PastPerformance.create({
        proposal_id: proposalId,
        organization_id: organizationId,
        project_name: formData.project_name,
        client: formData.client,
        contract_value: formData.contract_value,
        start_date: formData.start_date,
        end_date: formData.end_date,
        description: formData.description,
        document_url: formData.performance_doc?.file_url,
        ai_extracted: true
      });
    }
  };

  // Example: RFP/Solicitation with requirement extraction
  const rfpExtractionConfig = {
    title: 'Upload RFP Document',
    description: 'Upload the RFP - key requirements will be automatically identified',
    proposalId: proposalId,
    fields: [
      {
        name: 'rfp_document',
        label: 'RFP Document',
        type: 'file_upload',
        required: true,
        accept: '.docx',
        maxSize: 25,
        description: 'Upload the RFP or solicitation document',
        ingest_to_rag: true,
        entity_type: 'SolicitationDocument',
        document_type: 'rfp',
        extract_data_schema: {
          type: 'object',
          properties: {
            solicitation_number: { type: 'string' },
            agency_name: { type: 'string' },
            project_title: { type: 'string' },
            due_date: { type: 'string' },
            contract_value: { type: 'number' },
            naics_code: { type: 'string' },
            key_requirements: { 
              type: 'array', 
              items: { type: 'string' } 
            },
            submission_format: { type: 'string' }
          }
        }
      },
      {
        name: 'solicitation_number',
        label: 'Solicitation Number',
        type: 'text',
        placeholder: 'Will be auto-filled'
      },
      {
        name: 'agency_name',
        label: 'Agency',
        type: 'text',
        placeholder: 'Will be auto-filled'
      },
      {
        name: 'project_title',
        label: 'Project Title',
        type: 'text',
        required: true,
        placeholder: 'Will be auto-filled'
      },
      {
        name: 'due_date',
        label: 'Due Date',
        type: 'date',
        placeholder: 'Will be auto-filled'
      },
      {
        name: 'contract_value',
        label: 'Contract Value ($)',
        type: 'number',
        placeholder: 'Will be auto-filled'
      }
    ],
    onSubmit: async (formData) => {
      console.log('Updating proposal with RFP data:', formData);
      
      // Update proposal with extracted RFP data
      await base44.entities.Proposal.update(proposalId, {
        solicitation_number: formData.solicitation_number,
        agency_name: formData.agency_name,
        project_title: formData.project_title,
        due_date: formData.due_date,
        contract_value: formData.contract_value
      });
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Document Upload with Auto-Extraction</h2>
      <p className="text-slate-600">
        Upload documents and watch key data automatically populate the form fields
      </p>
      
      <div className="flex gap-4">
        <Button onClick={() => setIsModalOpen(true)}>
          Capability Statement
        </Button>
        <Button variant="outline" onClick={() => setIsModalOpen(true)}>
          Past Performance
        </Button>
        <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
          RFP/Solicitation
        </Button>
      </div>

      <DynamicModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={capabilityStatementConfig}
      />
    </div>
  );
}