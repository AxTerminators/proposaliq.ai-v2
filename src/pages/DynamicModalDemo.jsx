import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DynamicModal from '../components/proposals/modals/DynamicModal';
import ModalTemplateLibrary from '../components/proposals/modals/ModalTemplateLibrary';
import DynamicModalExample from '../components/proposals/modals/DynamicModalExample';
import DynamicModalWithExtraction from '../components/proposals/modals/DynamicModalWithExtraction';
import AdvancedFormExamples from '../components/proposals/modals/AdvancedFormExamples';
import ChecklistIntegrationExample from '../components/proposals/modals/ChecklistIntegration';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, FileText, Sparkles, Settings, BookOpen } from 'lucide-react';
import { useOrganization } from '../components/layout/OrganizationContext';

/**
 * DynamicModal Demo & Testing Page
 * 
 * Comprehensive showcase of all DynamicModal features:
 * - Phase 1: Auto-RAG file uploads
 * - Phase 2: AI data extraction and pre-population
 * - Phase 3: Advanced form features (conditional, multi-step, arrays)
 * - Phase 4: Template library and checklist integration
 */
export default function DynamicModalDemo() {
  const { organization } = useOrganization();
  const [selectedModalConfig, setSelectedModalConfig] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Demo proposal ID (would be real in production)
  const demoProposalId = 'demo_proposal_123';
  const organizationId = organization?.id;

  const handleSelectTemplate = (config) => {
    setSelectedModalConfig(config);
    setIsModalOpen(true);
  };

  const features = [
    {
      icon: FileText,
      title: 'Auto-RAG File Uploads',
      description: 'Upload documents that are automatically parsed, indexed, and made searchable for AI',
      phase: 'Phase 1'
    },
    {
      icon: Sparkles,
      title: 'AI Data Extraction',
      description: 'Extract structured data from documents and pre-populate form fields automatically',
      phase: 'Phase 2'
    },
    {
      icon: Settings,
      title: 'Advanced Forms',
      description: 'Conditional fields, multi-step flows, dynamic arrays, and custom validation',
      phase: 'Phase 3'
    },
    {
      icon: BookOpen,
      title: 'Template Library',
      description: 'Pre-built modal configurations for common workflows with easy integration',
      phase: 'Phase 4'
    }
  ];

  if (!organizationId) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Loading organization data...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">DynamicModal System Demo</h1>
        <p className="text-slate-600 text-lg">
          Comprehensive modal system with auto-RAG, AI extraction, and advanced form features
        </p>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-6 h-6 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-600">{feature.phase}</span>
                </div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Implementation Status */}
      <Card className="mb-8 bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            All Phases Complete
          </CardTitle>
          <CardDescription>
            The DynamicModal system is fully functional with all 4 phases implemented and tested.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>✓ Auto-RAG file uploads with document parsing</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>✓ AI-powered data extraction and field pre-population</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>✓ Conditional fields, multi-step forms, dynamic arrays</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>✓ Template library with 5 pre-built configurations</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>✓ Checklist system integration ready</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Demo Tabs */}
      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="templates">Template Library</TabsTrigger>
          <TabsTrigger value="basic">Basic Examples</TabsTrigger>
          <TabsTrigger value="extraction">AI Extraction</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Forms</TabsTrigger>
          <TabsTrigger value="checklist">Checklist Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pre-Built Modal Templates</CardTitle>
              <CardDescription>
                Click any template to see it in action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModalTemplateLibrary
                proposalId={demoProposalId}
                organizationId={organizationId}
                onSelectTemplate={handleSelectTemplate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Modal Examples</CardTitle>
              <CardDescription>
                Simple form configurations with file uploads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DynamicModalExample proposalId={demoProposalId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extraction" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Data Extraction</CardTitle>
              <CardDescription>
                Upload documents and watch data automatically populate fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DynamicModalWithExtraction
                proposalId={demoProposalId}
                organizationId={organizationId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Form Features</CardTitle>
              <CardDescription>
                Conditional fields, multi-step forms, and dynamic arrays
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdvancedFormExamples
                proposalId={demoProposalId}
                organizationId={organizationId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Checklist System Integration</CardTitle>
              <CardDescription>
                Example of how to integrate modals with your checklist system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChecklistIntegrationExample
                proposal={{
                  id: demoProposalId,
                  organization_id: organizationId,
                  proposal_name: 'Demo Proposal'
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template-selected modal */}
      {selectedModalConfig && (
        <DynamicModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedModalConfig(null);
          }}
          config={selectedModalConfig}
        />
      )}

      {/* Documentation Link */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
          <CardDescription>
            Complete reference guide for implementing DynamicModal in your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            See <code className="bg-slate-100 px-2 py-1 rounded">components/proposals/modals/README.md</code> for:
          </p>
          <ul className="text-sm text-slate-600 space-y-1 ml-6 list-disc">
            <li>Complete field type reference</li>
            <li>Advanced feature usage examples</li>
            <li>Checklist integration guide</li>
            <li>Custom validation patterns</li>
            <li>Best practices and tips</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}