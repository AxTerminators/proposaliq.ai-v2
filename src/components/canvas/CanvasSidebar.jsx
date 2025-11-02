import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Bot, BookTemplate, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CanvasSidebar({
  documents = [],
  sessions = [],
  templates = [],
  onAddNode,
  isCollapsed = false,
  onToggleCollapse
}) {
  const [activeTab, setActiveTab] = useState("documents");

  const truncateText = (text, maxLength = 30) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (isCollapsed) {
    return (
      <div className="w-12 h-full bg-white border-r-2 border-slate-200 flex flex-col items-center py-4">
        <Button
          onClick={onToggleCollapse}
          variant="ghost"
          size="icon"
          className="mb-4"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="space-y-4">
          <FileText className="w-5 h-5 text-slate-400" />
          <Bot className="w-5 h-5 text-slate-400" />
          <BookTemplate className="w-5 h-5 text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-white border-r-2 border-slate-200 flex flex-col">
      <div className="p-4 border-b-2 border-slate-200 flex items-center justify-between">
        <h3 className="font-bold text-lg text-slate-800">Canvas Library</h3>
        <Button
          onClick={onToggleCollapse}
          variant="ghost"
          size="icon"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 m-4 mb-0">
          <TabsTrigger value="documents">
            <FileText className="w-4 h-4 mr-2" />
            Docs
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Bot className="w-4 h-4 mr-2" />
            AI
          </TabsTrigger>
          <TabsTrigger value="templates">
            <BookTemplate className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="flex-1 overflow-hidden m-0 p-4">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {documents.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No documents available
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => onAddNode && onAddNode('document', { document_id: doc.id, name: doc.file_name })}
                  >
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800 truncate" title={doc.file_name}>
                          {truncateText(doc.file_name)}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {doc.document_type || 'Document'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="sessions" className="flex-1 overflow-hidden m-0 p-4">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No AI sessions available
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => onAddNode && onAddNode('ai_agent', { session_id: session.id, name: session.name || 'AI Session' })}
                  >
                    <div className="flex items-start gap-2">
                      <Bot className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800 truncate" title={session.name}>
                          {truncateText(session.name || 'AI Session')}
                        </p>
                        <p className="text-xs text-slate-500">
                          AI Session
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="templates" className="flex-1 overflow-hidden m-0 p-4">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No templates available
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => onAddNode && onAddNode('ai_agent', { 
                      name: template.name,
                      session: {
                        config: template.config
                      }
                    })}
                  >
                    <div className="flex items-start gap-2">
                      <div className="text-2xl flex-shrink-0">
                        {template.icon || '🤖'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800 truncate" title={template.name}>
                          {truncateText(template.name)}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {template.description || 'AI Agent Template'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}