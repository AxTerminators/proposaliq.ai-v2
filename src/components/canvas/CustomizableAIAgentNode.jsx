
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Settings, Brain, Zap, FileText, Target, Workflow, Database, Bell } from "lucide-react";

export default function CustomizableAIAgentNode({
  node,
  onMove,
  onClick,
  onConnectionStart,
  onConnectionEnd,
  onDelete,
  onResize,
  onTitleChange,
  onConfigClick,
  onRunAgent,
  isSelected,
  isConnecting,
  scale,
  onDragStart,
  onResizeStart,
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(node.title || 'AI Agent');
  const titleInputRef = useRef(null);

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
                         target.closest('.resize-handle') ||
                         target.tagName === 'INPUT' ||
                         target.tagName === 'BUTTON';
    
    if (!isInteractive && e.button === 0) {
      e.stopPropagation();
      onDragStart(node.id, e.clientX, e.clientY, node.position_x, node.position_y);
    }
  };

  const getPersonaIcon = (persona) => {
    const icons = {
      proposal_manager: '👔',
      technical_writer: '⚙️',
      reviewer: '🔍',
      strategist: '🎯',
      analyst: '📊'
    };
    return icons[persona] || '🤖';
  };

  // Parse node data - data is stored as object, not string
  const nodeData = node.data || {};
  const session = nodeData.session || {};
  const config = session.config || {};
  const documentIds = session.document_ids || [];

  // Check if this node was created from a template (has config but no session ID yet)
  const isFromTemplate = !session.id && config.model;

  // Check if integrations are configured
  const hasIntegrations = config.external_integrations && config.external_integrations.length > 0;
  const hasDataConfig = config.output_storage && config.output_storage !== 'session_only';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${node.position_x}px`,
        top: `${node.position_y}px`,
        width: `${node.width || 350}px`,
        height: `${node.height || 400}px`,
        cursor: 'move',
        zIndex: isSelected ? 1000 : 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(node.id);
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Main Card */}
      <div
        className={`bg-white rounded-xl border-2 shadow-lg h-full flex flex-col ${isSelected ? 'ring-2 ring-purple-500' : ''}`}
        style={{
          background: node.color || '#f8f9fa',
          transition: 'box-shadow 0.2s',
        }}
      >
        {/* Header */}
        <div 
          className="p-3 border-b flex items-center justify-between"
          style={{ 
            borderColor: '#d1d5db',
            background: isFromTemplate 
              ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(167, 139, 250, 0.15))'
              : 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(167, 139, 250, 0.1))',
            minHeight: '50px'
          }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="text-2xl">
              {getPersonaIcon(config.persona)}
            </div>
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="px-2 py-1 text-sm flex-1 min-w-0 border border-slate-300 rounded bg-white"
                style={{ color: '#2d3748' }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex-1 min-w-0">
                <h3 
                  className="font-bold text-sm truncate"
                  style={{ color: '#2d3748' }}
                  onDoubleClick={handleTitleDoubleClick}
                  title={title}
                >
                  {title}
                </h3>
                {isFromTemplate && (
                  <p className="text-xs" style={{ color: '#667eea' }}>
                    From Template
                  </p>
                )}
              </div>
            )}
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            variant="ghost"
            size="sm"
            className="p-1 rounded flex-shrink-0 text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Body - Configuration Preview */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Model & Persona */}
          {config.model && (
            <div className="mb-3 p-2 rounded" style={{ background: '#f8fafc' }}>
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4" style={{ color: '#764ba2' }} />
                <span className="text-xs font-semibold" style={{ color: '#475569' }}>
                  {config.model || 'Not configured'}
                </span>
              </div>
              {config.persona && (
                <p className="text-xs" style={{ color: '#64748b' }}>
                  Persona: {config.persona.replace('_', ' ')}
                </p>
              )}
            </div>
          )}

          {/* Section Focus */}
          {config.section_focus && (
            <div className="mb-3 p-2 rounded flex items-start gap-2" style={{ background: '#fef3c7' }}>
              <Target className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#d97706' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: '#92400e' }}>
                  Focus: {config.section_focus.replace('_', ' ')}
                </p>
              </div>
            </div>
          )}

          {/* Tone & Creativity */}
          {config.tone && config.tone.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold mb-1" style={{ color: '#4a5568' }}>
                Tone
              </p>
              <div className="flex flex-wrap gap-1">
                {config.tone.slice(0, 3).map((tone, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: '#e0e7ff', color: '#3730a3' }}
                  >
                    {tone}
                  </span>
                ))}
                {config.tone.length > 3 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: '#e0e7ff', color: '#3730a3' }}
                  >
                    +{config.tone.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Documents Connected */}
          {documentIds.length > 0 && (
            <div className="mb-3 p-2 rounded flex items-center gap-2" style={{ background: '#dbeafe' }}>
              <FileText className="w-4 h-4" style={{ color: '#1e40af' }} />
              <span className="text-xs" style={{ color: '#1e3a8a' }}>
                {documentIds.length} document{documentIds.length !== 1 ? 's' : ''} connected
              </span>
            </div>
          )}

          {/* Data Storage Config */}
          {hasDataConfig && (
            <div className="mb-3 p-2 rounded flex items-center gap-2" style={{ background: '#dcfce7' }}>
              <Database className="w-4 h-4" style={{ color: '#166534' }} />
              <span className="text-xs" style={{ color: '#14532d' }}>
                Output: {config.output_storage.replace('_', ' ')}
              </span>
            </div>
          )}

          {/* Integrations */}
          {hasIntegrations && (
            <div className="mb-3 p-2 rounded flex items-center gap-2" style={{ background: '#fef3c7' }}>
              <Bell className="w-4 h-4" style={{ color: '#b45309' }} />
              <span className="text-xs" style={{ color: '#78350f' }}>
                {config.external_integrations.length} integration{config.external_integrations.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Not Configured State */}
          {!config.model && (
            <div className="text-center py-6">
              <Settings className="w-8 h-8 mx-auto mb-2" style={{ color: '#94a3b8' }} />
              <p className="text-xs mb-3" style={{ color: '#64748b' }}>
                Agent not configured yet
              </p>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigClick && onConfigClick(node);
                }}
                size="sm"
                className="neuro-button"
              >
                <Settings className="w-3 h-3 mr-1" />
                Configure
              </Button>
            </div>
          )}
        </div>

        {/* Footer - Actions */}
        {config.model && (
          <div 
            className="p-3 border-t flex gap-2"
            style={{ borderColor: '#e2e8f0' }}
          >
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onConfigClick && onConfigClick(node);
              }}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Settings className="w-3 h-3 mr-1" />
              Configure
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onRunAgent && onRunAgent(node);
              }}
              size="sm"
              className="flex-1 text-white"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
            >
              <Zap className="w-3 h-3 mr-1" />
              Run
            </Button>
          </div>
        )}

        {/* Resize Handle */}
        <div
          className="resize-handle absolute -bottom-2 -right-2 bg-white border-2 border-slate-200 rounded-full p-1 hover:scale-110 transition-transform cursor-nwse-resize shadow-md"
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(node.id, e.clientX, e.clientY, node.width || 350, node.height || 400);
          }}
          title="Resize node"
          style={{ zIndex: 20 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M10 2L2 10M10 6L6 10M10 10H6" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
