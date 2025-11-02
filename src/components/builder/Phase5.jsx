import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Award, Settings, Workflow, Lightbulb, Save, Play } from "lucide-react";
import CompetitorAnalysis from "./CompetitorAnalysis";
import WinThemeGenerator from "./WinThemeGenerator";

// Import canvas components (we'll create these adapted versions)
import VisualStrategyCanvas from "../canvas/VisualStrategyCanvas";

export default function Phase5({ proposalData, setProposalData, proposalId }) {
  const queryClient = useQueryClient();
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("canvas");

  // Load user and organization
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };
    loadUserData();
  }, []);

  // Load canvas nodes for this proposal
  const { data: canvasNodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ['canvas-nodes', proposalId],
    queryFn: () => base44.entities.CanvasNode.filter({ 
      proposal_id: proposalId,
      organization_id: currentOrgId 
    }),
    enabled: !!proposalId && !!currentOrgId,
    initialData: [],
  });

  // Load solicitation documents
  const { data: documents = [] } = useQuery({
    queryKey: ['solicitation-documents', proposalId],
    queryFn: () => base44.entities.SolicitationDocument.filter({ 
      proposal_id: proposalId,
      organization_id: currentOrgId 
    }),
    enabled: !!proposalId && !!currentOrgId,
    initialData: [],
  });

  // Load AI agent templates
  const { data: agentTemplates = [] } = useQuery({
    queryKey: ['ai-agent-templates'],
    queryFn: () => base44.entities.AIAgentTemplate.list('-created_date'),
    initialData: [],
  });

  // Load win themes
  const { data: winThemes = [] } = useQuery({
    queryKey: ['win-themes', proposalId],
    queryFn: () => base44.entities.WinTheme.filter({ 
      proposal_id: proposalId,
      organization_id: currentOrgId 
    }),
    enabled: !!proposalId && !!currentOrgId,
    initialData: [],
  });

  // Load proposal sections
  const { data: sections = [] } = useQuery({
    queryKey: ['proposal-sections', proposalId],
    queryFn: () => base44.entities.ProposalSection.filter({ 
      proposal_id: proposalId 
    }),
    enabled: !!proposalId,
    initialData: [],
  });

  const handleCanvasUpdate = async (canvasState) => {
    // Save canvas state to proposal
    try {
      await base44.entities.Proposal.update(proposalId, {
        strategy_config: JSON.stringify(canvasState)
      });
      queryClient.invalidateQueries(['canvas-nodes', proposalId]);
    } catch (error) {
      console.error("Error saving canvas state:", error);
    }
  };

  if (!currentOrgId || !user) {
    return (
      <Card className="border-none shadow-xl">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading workspace...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="w-6 h-6 text-blue-600" />
            Phase 5: Visual Strategy Workspace
          </CardTitle>
          <CardDescription>
            Design your proposal strategy visually - connect documents, AI agents, win themes, and sections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="canvas">
                <Workflow className="w-4 h-4 mr-2" />
                Visual Canvas
              </TabsTrigger>
              <TabsTrigger value="competitors">
                <Target className="w-4 h-4 mr-2" />
                Competitors
              </TabsTrigger>
              <TabsTrigger value="themes">
                <Award className="w-4 h-4 mr-2" />
                Win Themes
              </TabsTrigger>
              <TabsTrigger value="guidance">
                <Lightbulb className="w-4 h-4 mr-2" />
                Guidance
              </TabsTrigger>
            </TabsList>

            {/* Visual Canvas Tab */}
            <TabsContent value="canvas" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-1">How to use the Visual Strategy Canvas:</h4>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>Drag documents from the sidebar onto the canvas</li>
                      <li>Create AI agent nodes to process documents and generate content</li>
                      <li>Connect nodes to show workflow and dependencies</li>
                      <li>Configure AI agents with the 5-panel configuration sidebar</li>
                      <li>Group related nodes together for organization</li>
                      <li>Execute AI agents to generate proposal sections</li>
                    </ul>
                  </div>
                </div>
              </div>

              <VisualStrategyCanvas
                proposalId={proposalId}
                proposalData={proposalData}
                organizationId={currentOrgId}
                user={user}
                canvasNodes={canvasNodes}
                documents={documents}
                agentTemplates={agentTemplates}
                winThemes={winThemes}
                sections={sections}
                onCanvasUpdate={handleCanvasUpdate}
              />
            </TabsContent>

            {/* Competitors Tab - Keep existing functionality */}
            <TabsContent value="competitors">
              <CompetitorAnalysis
                proposalId={proposalId}
                proposalData={proposalData}
                organizationId={currentOrgId}
              />
            </TabsContent>

            {/* Win Themes Tab - Keep existing functionality */}
            <TabsContent value="themes">
              <WinThemeGenerator
                proposalId={proposalId}
                proposalData={proposalData}
                organizationId={currentOrgId}
              />
            </TabsContent>

            {/* Guidance Tab */}
            <TabsContent value="guidance">
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-indigo-600" />
                    Strategy Best Practices
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-indigo-900 mb-2">Visual Canvas Workflow:</h3>
                    <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
                      <li><strong>Start with Documents:</strong> Drag your solicitation documents onto the canvas as the foundation</li>
                      <li><strong>Map Win Themes:</strong> Create win theme nodes that represent your competitive advantages</li>
                      <li><strong>Add AI Agents:</strong> Drop AI agent templates or create custom agents to analyze documents and generate content</li>
                      <li><strong>Connect the Dots:</strong> Draw connections showing how documents feed AI agents, which generate sections</li>
                      <li><strong>Group by Strategy:</strong> Use group nodes to organize related elements (e.g., "Technical Approach Strategy")</li>
                      <li><strong>Execute & Refine:</strong> Run AI agents, review outputs, adjust configurations, and iterate</li>
                    </ol>
                  </div>

                  <div className="border-t border-indigo-200 pt-4">
                    <h3 className="font-semibold text-indigo-900 mb-2">AI Agent Configuration Tips:</h3>
                    <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                      <li>Choose personas that match the section type (e.g., "Technical Writer" for technical approach)</li>
                      <li>Set appropriate tone and reading level for government proposals</li>
                      <li>Link multiple documents to provide comprehensive context</li>
                      <li>Use win themes in agent prompts to ensure alignment</li>
                      <li>Configure output storage to automatically create proposal sections</li>
                    </ul>
                  </div>

                  <div className="border-t border-indigo-200 pt-4">
                    <h3 className="font-semibold text-indigo-900 mb-2">Integration with Other Phases:</h3>
                    <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                      <li><strong>Phase 2:</strong> Documents uploaded here appear in the canvas sidebar</li>
                      <li><strong>Phase 4:</strong> Compliance requirements can be mapped to AI agent outputs</li>
                      <li><strong>Phase 6:</strong> AI-generated content flows directly into the proposal writer</li>
                      <li><strong>Phase 7:</strong> Canvas provides a visual roadmap for final review</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}