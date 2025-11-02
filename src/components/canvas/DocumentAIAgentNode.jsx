import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, X, Brain, FileText, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DocumentAIAgentNode({
  node,
  onMove,
  onClick,
  onConnectionStart,
  onConnectionEnd,
  onDelete,
  onResize,
  onTitleChange,
  onDoubleClick,
  isSelected,
  isConnecting,
  scale,
  onDragStart,
  onResizeStart,
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(node.title || 'Document AI Agent');
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const titleInputRef = useRef(null);

  const { data: allDocuments = [] } = useQuery({
    queryKey: ['all-documents'],
    queryFn: () => base44.entities.SolicitationDocument.list('-created_date'),
    initialData: [],
  });

  // Parse node data
  const nodeData = typeof node.data === 'string' ? JSON.parse(node.data) : node.data || {};
  const selectedDocuments = allDocuments.filter(doc => 
    nodeData.document_ids?.includes(doc.id)
  );

  const handleTitleDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== node.title) {
      onTitleChange(node.id, title.trim());
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setTitle(node.title);
      setIsEditingTitle(false);
    }
  };

  const handleMouseDown = (e) => {
    const target = e.target;
    const isInteractive = target.closest('button') || 
                         target.closest('input') || 
                         target.closest('.document-list') ||
                         target.closest('.resize-handle') ||
                         target.tagName === 'INPUT' ||
                         target.tagName === 'BUTTON';
    
    if (!isInteractive && e.button === 0) {
      e.stopPropagation();
      onDragStart(node.id, e.clientX, e.clientY, node.position_x, node.position_y);
    }
  };

  const handleDoubleClick = (e) => {
    const target = e.target;
    const isInteractive = target.closest('button') || 
                         target.closest('input') || 
                         target.closest('.document-list') ||
                         target.tagName === 'INPUT' ||
                         target.tagName === 'BUTTON' ||
                         target.tagName === 'H3';
    
    if (!isInteractive && onDoubleClick) {
      e.stopPropagation();
      onDoubleClick(node);
    }
  };

  const handleDocumentToggle = (docId) => {
    const currentDocs = nodeData.document_ids || [];
    const updatedDocs = currentDocs.includes(docId)
      ? currentDocs.filter(id => id !== docId)
      : [...currentDocs, docId];

    base44.entities.CanvasNode.update(node.id, {
      data: JSON.stringify({
        ...nodeData,
        document_ids: updatedDocs
      })
    });
  };

  const truncateFileName = (name, maxLength = 25) => {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: `${node.position_x}px`,
          top: `${node.position_y}px`,
          width: `${node.width || 500}px`,
          height: `${node.height || 400}px`,
          cursor: 'move',
          zIndex: isSelected ? 1000 : 1,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(node.id);
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {/* Main Card */}
        <div
          className={`neuro-card h-full flex flex-col ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
          style={{
            background: node.color || '#e0e0e0',
            transition: 'box-shadow 0.2s',
          }}
        >
          {/* Header */}
          <div 
            className="p-3 border-b flex items-center justify-between"
            style={{ 
              borderColor: '#d1d5db',
              minHeight: '50px'
            }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Brain className="w-5 h-5 flex-shrink-0" style={{ color: '#8b5cf6' }} />
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  className="neuro-input px-2 py-1 text-sm flex-1 min-w-0 border-none"
                  style={{ color: '#2d3748' }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h3 
                  className="font-bold text-sm flex-1 min-w-0 truncate"
                  style={{ color: '#2d3748' }}
                  onDoubleClick={handleTitleDoubleClick}
                  title={title}
                >
                  {title}
                </h3>
              )}
              <Badge className="text-xs" style={{ background: '#667eea20', color: '#667eea' }}>
                Document AI
              </Badge>
            </div>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              className="neuro-button p-1 rounded flex-shrink-0"
              style={{ color: '#991b1b' }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            {/* Documents Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold" style={{ color: '#4a5568' }}>
                  Connected Documents ({selectedDocuments.length})
                </h4>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDocumentSelector(!showDocumentSelector);
                  }}
                  className="neuro-button p-1 rounded text-xs"
                  size="sm"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>

              <div className="document-list space-y-1 max-h-32 overflow-y-auto">
                {selectedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 p-2 rounded"
                    style={{ background: '#f8fafc' }}
                  >
                    <FileText className="w-3 h-3 flex-shrink-0" style={{ color: '#667eea' }} />
                    <span className="text-xs flex-1 truncate" style={{ color: '#475569' }} title={doc.file_name}>
                      {truncateFileName(doc.file_name)}
                    </span>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDocumentToggle(doc.id);
                      }}
                      className="p-1"
                      variant="ghost"
                      size="sm"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {selectedDocuments.length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: '#94a3b8' }}>
                    No documents connected
                  </p>
                )}
              </div>
            </div>

            {/* AI Chat Hint */}
            <div 
              className="mt-auto p-3 rounded-lg flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))' }}
            >
              <MessageSquare className="w-4 h-4" style={{ color: '#764ba2' }} />
              <p className="text-xs" style={{ color: '#475569' }}>
                Double-click to open AI chat
              </p>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className="resize-handle absolute -bottom-2 -right-2 neuro-button rounded-full p-1 hover:scale-110 transition-transform cursor-nwse-resize"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart(node.id, e.clientX, e.clientY, node.width || 500, node.height || 400);
            }}
            title="Resize node"
            style={{ background: '#e0e0e0', zIndex: 20 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10 2L2 10M10 6L6 10M10 10H6" stroke="#667eea" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Document Selector Modal */}
      {showDocumentSelector && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            e.stopPropagation();
            setShowDocumentSelector(false);
          }}
        >
          <div
            className="neuro-card p-6 max-w-md w-full max-h-96 overflow-y-auto"
            style={{ background: 'white' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4" style={{ color: '#2d3748' }}>
              Select Documents
            </h3>
            <div className="space-y-2">
              {allDocuments.map((doc) => (
                <label
                  key={doc.id}
                  className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={nodeData.document_ids?.includes(doc.id) || false}
                    onChange={() => handleDocumentToggle(doc.id)}
                    className="rounded"
                  />
                  <FileText className="w-4 h-4" style={{ color: '#667eea' }} />
                  <span className="text-sm flex-1 truncate" title={doc.file_name}>
                    {doc.file_name}
                  </span>
                </label>
              ))}
              {allDocuments.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: '#94a3b8' }}>
                  No documents available
                </p>
              )}
            </div>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setShowDocumentSelector(false);
              }}
              className="mt-4 w-full"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </>
  );
}