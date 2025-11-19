import React, { useState } from 'react';
import DynamicModal from './DynamicModal';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

/**
 * Example Usage of DynamicModal with File Upload + Auto-RAG
 * 
 * This demonstrates how to configure and use the DynamicModal component
 * with various field types including file uploads that automatically
 * integrate with the RAG system.
 */
export default function DynamicModalExample({ proposalId }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Example 1: Simple data collection with file upload
  const simpleConfig = {
    title: 'Upload Capability Statement',
    description: 'Upload a capability statement that will be automatically indexed for AI',
    proposalId: proposalId,
    fields: [
      {
        name: 'partner_name',
        label: 'Teaming Partner Name',
        type: 'text',
        required: true,
        placeholder: 'Enter partner name'
      },
      {
        name: 'capability_statement',
        label: 'Capability Statement',
        type: 'file_upload',
        required: true,
        accept: '.docx,.pdf',
        maxSize: 10, // MB
        description: 'Upload the partner\'s capability statement (DOCX or PDF)',
        // RAG configuration
        ingest_to_rag: true,
        entity_type: 'ProposalResource',
        resource_type: 'partner_capability',
        content_category: 'general',
        title_prefix: 'Capability Statement'
      },
      {
        name: 'notes',
        label: 'Additional Notes',
        type: 'textarea',
        placeholder: 'Any additional context...',
        rows: 3
      }
    ],
    onSubmit: async (formData) => {
      console.log('Form submitted:', formData);
      // formData will contain:
      // {
      //   partner_name: "Acme Corp",
      //   capability_statement: {
      //     file_url: "https://...",
      //     file_name: "capability.docx",
      //     entity_id: "123",
      //     rag_ready: true
      //   },
      //   notes: "Great partner"
      // }
      
      // Save to your entity
      await base44.entities.TeamingPartner.create({
        partner_name: formData.partner_name,
        capability_statement_url: formData.capability_statement.file_url,
        notes: formData.notes
      });
    }
  };

  // Example 2: Solicitation document upload
  const solicitationConfig = {
    title: 'Upload Solicitation Document',
    description: 'Upload RFP, SOW, or other solicitation documents',
    proposalId: proposalId,
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
        // RAG configuration for SolicitationDocument
        ingest_to_rag: true,
        entity_type: 'SolicitationDocument',
        document_type: 'rfp' // Will be overridden by form data
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Brief description of this document...',
        rows: 2
      }
    ],
    onSubmit: async (formData) => {
      console.log('Solicitation uploaded:', formData);
      // Entity already created by RAG ingestion
      // Just update with document_type from form
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
  };

  // Example 3: Complex form with multiple fields
  const complexConfig = {
    title: 'Add Past Performance',
    description: 'Document a past project for reference material',
    proposalId: proposalId,
    fields: [
      {
        name: 'project_name',
        label: 'Project Name',
        type: 'text',
        required: true
      },
      {
        name: 'client',
        label: 'Client',
        type: 'text',
        required: true
      },
      {
        name: 'contract_value',
        label: 'Contract Value ($)',
        type: 'number',
        placeholder: '0',
        validation: {
          min: 0
        }
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
        name: 'project_document',
        label: 'Project Documentation',
        type: 'file_upload',
        accept: '.docx,.pdf',
        maxSize: 15,
        description: 'Upload project documentation or performance report',
        ingest_to_rag: true,
        entity_type: 'ProposalResource',
        resource_type: 'past_performance',
        content_category: 'past_performance'
      },
      {
        name: 'description',
        label: 'Project Description',
        type: 'textarea',
        required: true,
        rows: 4,
        validation: {
          minLength: 50,
          maxLength: 1000
        }
      },
      {
        name: 'is_relevant',
        label: 'Highly relevant to current proposal',
        type: 'checkbox'
      }
    ],
    onSubmit: async (formData) => {
      console.log('Past performance submitted:', formData);
      await base44.entities.PastPerformance.create({
        proposal_id: proposalId,
        project_name: formData.project_name,
        client: formData.client,
        contract_value: formData.contract_value,
        start_date: formData.start_date,
        end_date: formData.end_date,
        description: formData.description,
        document_url: formData.project_document?.file_url,
        is_relevant: formData.is_relevant
      });
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Dynamic Modal Examples</h2>
      
      <div className="flex gap-4">
        <Button onClick={() => setIsModalOpen(true)}>
          Open Simple Example
        </Button>
        <Button variant="outline" onClick={() => setIsModalOpen(true)}>
          Open Solicitation Example
        </Button>
        <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
          Open Complex Example
        </Button>
      </div>

      {/* Use any config - change as needed */}
      <DynamicModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={simpleConfig}
      />
    </div>
  );
}