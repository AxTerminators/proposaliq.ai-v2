import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Code, Database, Zap, Search } from "lucide-react";

// Complete system inventory
const PAGES = [
  "Dashboard", "Pipeline", "ProposalBuilder", "TemplateManager", "BoardManagement",
  "AdminTemplateEditor", "SystemBoardTemplateBuilder", "ContentLibrary", "Resources",
  "PastPerformance", "KeyPersonnel", "TeamingPartners", "Chat", "Calendar", "Tasks",
  "Discussions", "Analytics", "ExportCenter", "Settings", "Team", "Feedback",
  "Onboarding", "LandingPage", "Pricing", "AdminPortal", "OpportunityFinder",
  "ClientOrganizationManager", "ConsultantDashboard", "ConsolidatedReporting",
  "ClientPortal", "ClientProposalView", "Workspace", "Tools", "CostEstimator",
  "DataCalls", "ClientDataCallPortal", "AdvancedSearch", "BestPractices",
  "SystemDocumentation", "RAGSystemHealth", "RAGPerformanceDashboard", "AITokenUsageDashboard",
  "ModalBuilder", "ProposalStrategyConfigPage", "AIAssistedWriterPage",
  // Legacy/Testing pages
  "TemplatesLibrary", "Subscription", "RateFeedback", "AddTeamingPartner", "Home",
  "KanbanTestingGuide", "DataCallDocumentation", "SystemVerification", "TestJourney",
  "DataIsolationTest", "DynamicModalDemo", "AIFeatureRoadmap", "ClientPortalRoadmap",
  "KanbanRoadmapStatus", "ModalFeatureStatus", "RAGEnhancementStatus"
];

const ENTITIES = [
  "Proposal", "ProposalSection", "ProposalSectionHistory", "ProposalComment", "ProposalTask",
  "ProposalWorkflowTemplate", "KanbanConfig", "Organization", "TeamingPartner",
  "ProposalResource", "SolicitationDocument", "PastPerformanceRecord", "KeyPersonnel",
  "ChatMessage", "Subscription", "TokenUsage", "Discussion", "DiscussionComment",
  "AdminData", "AuditLog", "Notification", "ActivityLog", "CalendarEvent",
  "WorkflowRule", "ApprovalWorkflow", "Feedback", "EmailTemplate", "ClientNotification",
  "ClientUploadedFile", "ClientTeamMember", "ProposalAnnotation", "ClientMeeting",
  "ExportTemplate", "ExportHistory", "CompetitorIntel", "WinTheme", "ComplianceRequirement",
  "LaborCategory", "CLIN", "LaborAllocation", "ODCItem", "PricingStrategy",
  "PricingTemplate", "SubcontractorPricing", "SAMOpportunity", "ReviewRound",
  "SectionReview", "PastPerformance", "DataCallRequest", "Folder", "ProjectTask",
  "UploadedFile", "OrganizationRelationship", "ResourceShare", "ClientProjectHistory",
  "ContentQualityFeedback", "ParsedProposalCache", "ProposalSectionChunk", "ModalInteraction",
  "ModalConfig", "AiConfiguration", "FileUploadTemplate", "ClientDownloadLog", "ExportPreset"
];

const FUNCTIONS = [
  "sendClientNotificationEmail", "sendSatisfactionSurvey", "generateSampleData", "clearSampleData",
  "processEventReminders", "clearOrganizationProposals", "createMasterBoardConfig",
  "ensureMasterBoardOnFirstLoad", "createTypeSpecificBoard", "create15ColumnRFPBoard",
  "create15ColumnTemplateIfNotExists", "createDefaultContentLibraryFolders",
  "createDemoOrganizationAndSeedData", "generateClientTokens", "createClientOrganization",
  "pushResourceToClient", "calculateClientHealth", "validateClientPortalToken",
  "generateClientPortalLink", "optimizeImage", "onboardClientOrganization",
  "sendDataCallReminder", "sendDataCallNotification", "automateDataCallFollowUp",
  "exportDataCallToPDF", "exportDataCallToExcel", "parseDocxFile", "validateDataCallToken",
  "updateDataCallItem", "uploadDataCallFile", "generatePredictiveTimeline",
  "parseProposalContent", "buildProposalContext", "scoreReferenceRelevance",
  "invalidateProposalCache", "discoverSimilarProposals", "chunkProposalSections",
  "searchSemanticChunks", "generateCitations", "getAdaptiveReferences", "deleteSampleData",
  "ingestDocumentToRAG", "generateChecklistFromAI", "aiProposalWriter", "extractDataFromFile",
  "parsePastPerformanceDocument", "ingestPastPerformanceToRAG", "trackPastPerformanceUsage",
  "scorePastPerformanceRelevance", "detectDuplicatePastPerformance", "parseBulkPastPerformance",
  "exportPastPerformanceToPDF", "exportPastPerformanceToWord", "linkResourceToProposal",
  "uploadAndProcessResource", "detectDuplicateResource", "retryRAGProcessing",
  "ingestSupplementaryDocToRAG", "retrieveSupplementaryContext", "generateProposalDocument",
  "regenerateExportDownload", "batchExportProposals", "forceDeleteTemplate",
  // Migration functions
  "migrateToNewKanbanWorkflow", "categorizeExistingProposals", "migrateMasterBoardColumns",
  "ensureTemplateSuffixes", "fixRfp15ColumnBoard", "fixMissingIconEmoji",
  "validateAndFixIconEmoji", "migrateClientToOrganization"
];

export default function SystemInventory() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPages = PAGES.filter(p => 
    p.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredEntities = ENTITIES.filter(e => 
    e.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFunctions = FUNCTIONS.filter(f => 
    f.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const legacyPages = [
    "TemplatesLibrary", "Subscription", "RateFeedback", "AddTeamingPartner", "Home"
  ];
  const testingPages = [
    "KanbanTestingGuide", "DataCallDocumentation", "SystemVerification", "TestJourney",
    "DataIsolationTest", "DynamicModalDemo"
  ];
  const roadmapPages = [
    "AIFeatureRoadmap", "ClientPortalRoadmap", "KanbanRoadmapStatus",
    "ModalFeatureStatus", "RAGEnhancementStatus"
  ];
  const migrationFunctions = [
    "migrateToNewKanbanWorkflow", "categorizeExistingProposals", "migrateMasterBoardColumns",
    "ensureTemplateSuffixes", "fixRfp15ColumnBoard", "fixMissingIconEmoji",
    "validateAndFixIconEmoji", "migrateClientToOrganization"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">System Inventory</h1>
          <p className="text-slate-600">Complete overview of pages, entities, and functions</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Pages</p>
                  <p className="text-3xl font-bold text-slate-900">{PAGES.length}</p>
                </div>
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Entities</p>
                  <p className="text-3xl font-bold text-slate-900">{ENTITIES.length}</p>
                </div>
                <Database className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Functions</p>
                  <p className="text-3xl font-bold text-slate-900">{FUNCTIONS.length}</p>
                </div>
                <Zap className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">For Deletion</p>
                  <p className="text-3xl font-bold text-red-600">
                    {legacyPages.length + testingPages.length + roadmapPages.length + migrationFunctions.length}
                  </p>
                </div>
                <Code className="w-10 h-10 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search pages, entities, functions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pages */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Pages ({filteredPages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {filteredPages.map(page => {
                const isLegacy = legacyPages.includes(page);
                const isTesting = testingPages.includes(page);
                const isRoadmap = roadmapPages.includes(page);
                const shouldDelete = isLegacy || isTesting || isRoadmap;

                return (
                  <Badge
                    key={page}
                    variant={shouldDelete ? "destructive" : "outline"}
                    className={shouldDelete ? "bg-red-100 text-red-700" : ""}
                  >
                    {page}
                    {isLegacy && " (Legacy)"}
                    {isTesting && " (Test)"}
                    {isRoadmap && " (Roadmap)"}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Entities */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-green-600" />
              Entities ({filteredEntities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {filteredEntities.map(entity => (
                <Badge key={entity} variant="outline" className="bg-green-50">
                  {entity}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Functions */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Functions ({filteredFunctions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {filteredFunctions.map(func => {
                const isMigration = migrationFunctions.includes(func);
                return (
                  <Badge
                    key={func}
                    variant={isMigration ? "destructive" : "outline"}
                    className={isMigration ? "bg-red-100 text-red-700" : "bg-purple-50"}
                  >
                    {func}
                    {isMigration && " (Migration)"}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}