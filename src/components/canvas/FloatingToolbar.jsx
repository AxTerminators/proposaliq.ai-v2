import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Folder, FileText, Plus, Grid } from "lucide-react";

export default function FloatingToolbar({
  onAIAgentsClick,
  onFoldersClick,
  onProjectsClick,
  onCreateGroup,
  onCreateDocumentAIAgent,
  onCreateCustomizableAIAgent
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-slate-200 p-2">
        {!isExpanded ? (
          <Button
            onClick={() => setIsExpanded(true)}
            className="rounded-lg px-4 py-2 text-white"
            style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
          >
            <Plus className="w-5 h-5 mr-2" />
            <span className="font-semibold">Add Node</span>
          </Button>
        ) : (
          <div className="flex items-center gap-2 p-1">
            <Button
              onClick={onCreateGroup}
              variant="outline"
              className="rounded-lg p-2"
              title="Create Group"
            >
              <Folder className="w-5 h-5" style={{ color: '#43e97b' }} />
            </Button>

            <Button
              onClick={onCreateDocumentAIAgent}
              variant="outline"
              className="rounded-lg p-2"
              title="Create Document AI Agent"
            >
              <FileText className="w-5 h-5" style={{ color: '#667eea' }} />
            </Button>

            <Button
              onClick={onCreateCustomizableAIAgent}
              variant="outline"
              className="rounded-lg p-2"
              title="Create AI Agent"
            >
              <Brain className="w-5 h-5" style={{ color: '#764ba2' }} />
            </Button>

            <div className="w-px h-6 bg-slate-300 mx-1" />

            <Button
              onClick={() => setIsExpanded(false)}
              variant="ghost"
              className="rounded-lg p-2"
            >
              <Grid className="w-5 h-5" style={{ color: '#94a3b8' }} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}