import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, Save, Play, Grid, List } from "lucide-react";
import InfiniteCanvas from "./InfiniteCanvas";
import CanvasSidebar from "./CanvasSidebar";
import FloatingToolbar from "./FloatingToolbar";
import ConfigurationSidebar from "./ConfigurationSidebar";

export default function VisualStrategyCanvas({
  proposalId,
  proposalData,
  organizationId,
  user,
  canvasNodes = [],
  documents = [],
  agentTemplates = [],
  winThemes = [],
  sections = [],
  onCanvasUpdate
}) {
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  
  // Canvas state - use local state for nodes to enable optimistic updates
  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [showConfigSidebar, setShowConfigSidebar] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [pendingUpdate, setPendingUpdate] = useState(null);

  // Sync canvasNodes prop to local state
  useEffect(() => {
    setNodes(canvasNodes);
  }, [canvasNodes]);

  // Mutations for canvas operations
  const createNodeMutation = useMutation({
    mutationFn: (nodeData) => base44.entities.CanvasNode.create({
      ...nodeData,
      proposal_id: proposalId,
      organization_id: organizationId
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['canvas-nodes', proposalId]);
    }
  });

  const updateNodeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CanvasNode.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['canvas-nodes', proposalId]);
      setPendingUpdate(null);
    }
  });

  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId) => base44.entities.CanvasNode.delete(nodeId),
    onSuccess: () => {
      queryClient.invalidateQueries(['canvas-nodes', proposalId]);
    }
  });

  // Node creation handlers
  const handleAddNode = (nodeType, nodeConfig = {}) => {
    const newNode = {
      proposal_id: proposalId,
      organization_id: organizationId,
      node_type: nodeType,
      title: nodeConfig.name || nodeConfig.title || `New ${nodeType.replace('_', ' ')}`,
      description: nodeConfig.description || '',
      position_x: Math.random() * 400 + 100,
      position_y: Math.random() * 300 + 100,
      width: nodeType === 'group' ? 400 : nodeType === 'ai_agent' ? 350 : 200,
      height: nodeType === 'group' ? 300 : nodeType === 'ai_agent' ? 400 : 150,
      color: getNodeColor(nodeType),
      data: nodeConfig,
      connections: [],
      order: nodes.length
    };

    createNodeMutation.mutate(newNode);
  };

  const handleAddNodeFromDrop = (nodeType, nodeConfig = {}, x, y) => {
    const newNode = {
      proposal_id: proposalId,
      organization_id: organizationId,
      node_type: nodeType,
      title: nodeConfig.name || nodeConfig.title || `New ${nodeType.replace('_', ' ')}`,
      description: nodeConfig.description || '',
      position_x: Math.max(0, x),
      position_y: Math.max(0, y),
      width: nodeType === 'group' ? 400 : nodeType === 'ai_agent' ? 350 : 200,
      height: nodeType === 'group' ? 300 : nodeType === 'ai_agent' ? 400 : 150,
      color: getNodeColor(nodeType),
      data: nodeConfig,
      connections: [],
      order: nodes.length
    };

    createNodeMutation.mutate(newNode);
  };

  const handleCreateGroup = () => {
    handleAddNode('group', { title: 'New Group' });
  };

  const handleCreateDocumentAIAgent = () => {
    handleAddNode('ai_agent', { 
      agent_type: 'document_analyzer',
      document_ids: []
    });
  };

  const handleCreateCustomizableAIAgent = () => {
    handleAddNode('ai_agent', {
      session: {
        config: {
          model: 'gemini',
          persona: 'proposal_manager',
          tone: ['clear', 'professional'],
          creativity: 50
        },
        document_ids: []
      }
    });
  };

  // Optimistic node move - update local state immediately
  const handleNodeMove = (nodeId, x, y) => {
    // Update local state immediately for responsive UI
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === nodeId 
          ? { ...node, position_x: x, position_y: y }
          : node
      )
    );
    
    // Store pending update to be sent on mouse up
    setPendingUpdate({ id: nodeId, position_x: x, position_y: y });
  };

  // When dragging ends, sync with database
  const handleDragEnd = () => {
    if (pendingUpdate) {
      updateNodeMutation.mutate({
        id: pendingUpdate.id,
        data: { 
          position_x: pendingUpdate.position_x, 
          position_y: pendingUpdate.position_y 
        }
      });
    }
  };

  const handleNodeClick = (nodeId) => {
    setSelectedNodeId(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node && node.node_type === 'ai_agent') {
      setShowConfigSidebar(true);
    }
  };

  const handleNodeConnect = (fromNodeId, toNodeId) => {
    const fromNode = nodes.find(n => n.id === fromNodeId);
    if (fromNode) {
      const connections = fromNode.connections || [];
      if (!connections.includes(toNodeId)) {
        updateNodeMutation.mutate({
          id: fromNodeId,
          data: { connections: [...connections, toNodeId] }
        });
      }
    }
  };

  const handleNodeDelete = (nodeId) => {
    deleteNodeMutation.mutate(nodeId);
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
      setShowConfigSidebar(false);
    }
  };

  // Optimistic resize
  const handleNodeResize = (nodeId, width, height) => {
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === nodeId 
          ? { ...node, width, height }
          : node
      )
    );
    
    setPendingUpdate({ id: nodeId, width, height });
  };

  const handleNodeTitleChange = (nodeId, title) => {
    updateNodeMutation.mutate({
      id: nodeId,
      data: { title }
    });
  };

  const handleNodeConfigClick = (node) => {
    setSelectedNodeId(node.id);
    setShowConfigSidebar(true);
  };

  const handleRunAgent = async (node) => {
    try {
      const nodeData = node.data || {};
      const session = nodeData.session || {};
      const config = session.config || {};
      const documentIds = session.document_ids || [];

      if (!config.model) {
        alert('Please configure the AI agent first');
        return;
      }

      const documents = await Promise.all(
        documentIds.map(async (docId) => {
          try {
            const docs = await base44.entities.SolicitationDocument.filter({ id: docId });
            return docs[0];
          } catch (error) {
            console.error(`Error fetching document ${docId}:`, error);
            return null;
          }
        })
      );

      const validDocuments = documents.filter(d => d !== null);

      if (validDocuments.length === 0 && documentIds.length > 0) {
        alert('No valid documents found. Please check your document connections.');
        return;
      }

      const sectionFocusLabel = config.section_focus?.replace(/_/g, ' ') || 'full proposal';
      const personaLabel = config.persona?.replace(/_/g, ' ') || 'proposal manager';
      
      const prompt = `You are a ${personaLabel} for government proposals working on: ${proposalData.proposal_name}

**PROJECT DETAILS:**
- Agency: ${proposalData.agency_name || 'N/A'}
- Project: ${proposalData.project_title || 'N/A'}
- Type: ${proposalData.project_type || 'N/A'}
- Prime: ${proposalData.prime_contractor_name || 'N/A'}

**YOUR TASK:**
Generate professional ${sectionFocusLabel} content.

**WRITING PARAMETERS:**
- Model: ${config.model}
- Tone: ${config.tone?.join(', ') || 'professional, clear'}
- Creativity: ${config.creativity || 50}%
- Agency Type: ${config.agency_type || 'generic'}

${config.win_themes && config.win_themes.length > 0 ? `
**WIN THEMES TO EMPHASIZE:**
${config.win_themes.map(theme => `- ${theme}`).join('\n')}
` : ''}

${validDocuments.length > 0 ? `
**REFERENCE DOCUMENTS:**
${validDocuments.map(doc => `- ${doc.file_name} (${doc.document_type})`).join('\n')}
` : ''}

**REQUIREMENTS:**
1. Write compelling, government-appropriate content for ${sectionFocusLabel}
2. Maintain the specified tone and creativity level
3. Emphasize win themes throughout
4. Use clear headings and structure
5. Make it persuasive and evaluation-ready
6. Use HTML formatting for structure

Generate the content now:`;

      const fileUrls = validDocuments
        .filter(doc => doc.file_url)
        .map(doc => doc.file_url);

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined
      });

      if (config.output_storage === 'create_section') {
        const wordCount = response.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;
        
        await base44.entities.ProposalSection.create({
          proposal_id: proposalId,
          section_name: config.section_focus?.replace(/_/g, ' ') || 'AI Generated Section',
          section_type: config.section_focus || 'custom',
          content: response,
          word_count: wordCount,
          status: 'ai_generated',
          ai_prompt_used: prompt.substring(0, 500),
          order: sections.length
        });

        alert(`✅ AI generated ${wordCount} words and created a new proposal section!`);
        queryClient.invalidateQueries(['proposal-sections', proposalId]);
      } else {
        alert(`✅ AI generated content successfully!\n\nOutput: ${response.substring(0, 200)}...`);
      }

    } catch (error) {
      console.error("Error running AI agent:", error);
      alert(`❌ Error running AI agent: ${error.message}`);
    }
  };

  const handleDeleteConnection = (connectionId) => {
    const [fromId, toId] = connectionId.split('-');
    const fromNode = nodes.find(n => n.id === fromId);
    if (fromNode && fromNode.connections) {
      updateNodeMutation.mutate({
        id: fromId,
        data: { 
          connections: fromNode.connections.filter(c => c !== toId) 
        }
      });
    }
  };

  const handleCanvasViewChange = (offset, scale) => {
    setCanvasOffset(offset);
    setCanvasScale(scale);
  };

  const handleSaveConfiguration = (nodeId, updatedData) => {
    updateNodeMutation.mutate({
      id: nodeId,
      data: { data: updatedData }
    });
    setShowConfigSidebar(false);
  };

  const getNodeColor = (nodeType) => {
    const colors = {
      document: '#667eea',
      ai_agent: '#764ba2',
      template: '#f093fb',
      section: '#4facfe',
      group: '#43e97b',
      win_theme: '#f093fb',
      compliance: '#fbbf24'
    };
    return colors[nodeType] || '#667eea';
  };

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}>
      <div className="absolute inset-0 border-2 border-slate-200 rounded-lg overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
        <InfiniteCanvas
          ref={canvasRef}
          nodes={nodes}
          onNodeMove={handleNodeMove}
          onNodeClick={handleNodeClick}
          onNodeConnect={handleNodeConnect}
          onNodeDelete={handleNodeDelete}
          onNodeResize={handleNodeResize}
          onNodeTitleChange={handleNodeTitleChange}
          onDeleteConnection={handleDeleteConnection}
          onCanvasViewChange={handleCanvasViewChange}
          onNodeConfigClick={handleNodeConfigClick}
          onRunAgent={handleRunAgent}
          onAddNodeFromDrop={handleAddNodeFromDrop}
          onDragEnd={handleDragEnd}
          selectedNodeId={selectedNodeId}
          initialOffset={canvasOffset}
          initialScale={canvasScale}
        />

        <FloatingToolbar
          onAIAgentsClick={() => console.log('AI Agents clicked')}
          onFoldersClick={() => console.log('Folders clicked')}
          onProjectsClick={() => console.log('Projects clicked')}
          onCreateGroup={handleCreateGroup}
          onCreateDocumentAIAgent={handleCreateDocumentAIAgent}
          onCreateCustomizableAIAgent={handleCreateCustomizableAIAgent}
        />

        {showSidebar && (
          <div className="absolute left-0 top-0 h-full z-20">
            <CanvasSidebar
              documents={documents}
              sessions={[]}
              templates={agentTemplates}
              onAddNode={handleAddNode}
              isCollapsed={false}
              onToggleCollapse={() => setShowSidebar(false)}
            />
          </div>
        )}

        {!showSidebar && (
          <div className="absolute left-4 top-4 z-20">
            <Button
              onClick={() => setShowSidebar(true)}
              className="p-2 rounded-lg bg-white shadow-lg border-2 border-slate-200"
              title="Show sidebar"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        )}

        {showConfigSidebar && selectedNode && selectedNode.node_type === 'ai_agent' && (
          <div className="absolute right-0 top-0 h-full w-96 bg-white border-l-2 border-slate-200 shadow-xl overflow-y-auto z-30">
            <ConfigurationSidebar
              node={selectedNode}
              onClose={() => setShowConfigSidebar(false)}
              onSave={(config) => handleSaveConfiguration(selectedNode.id, config)}
            />
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex gap-2 z-20">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newScale = Math.min(canvasScale + 0.1, 2);
              setCanvasScale(newScale);
            }}
            className="bg-white shadow-lg"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newScale = Math.max(canvasScale - 0.1, 0.5);
              setCanvasScale(newScale);
            }}
            className="bg-white shadow-lg"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setCanvasOffset({ x: 0, y: 0 });
              setCanvasScale(1);
            }}
            className="bg-white shadow-lg"
            title="Reset view"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 z-20">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-700">
              {nodes.length} node{nodes.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}