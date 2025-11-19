import React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import AIWritingAssistant from "./AIWritingAssistant";

/**
 * Floating AI Assistant Panel Component
 * 
 * This component wraps the AIWritingAssistant and provides:
 * - Minimize/close functionality
 * - Floating panel styling
 * - Responsive positioning
 */
export default function FloatingAIAssistantPanel({
  proposalId,
  sectionId,
  sectionType,
  contextData,
  existingContent,
  onContentGenerated,
  onMinimize
}) {
  return (
    <div className="h-full flex flex-col border-l border-slate-200 bg-white animate-in slide-in-from-right duration-300">
      {/* Header with Minimize Button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-slate-900">AI Writing Assistant</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onMinimize}
          className="h-8 w-8 hover:bg-slate-200 transition-colors"
          title="Minimize AI Assistant"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* AI Writing Assistant Content */}
      <div className="flex-1 overflow-y-auto">
        <AIWritingAssistant
          proposalId={proposalId}
          sectionId={sectionId}
          sectionType={sectionType}
          contextData={contextData}
          existingContent={existingContent}
          onContentGenerated={onContentGenerated}
        />
      </div>
    </div>
  );
}