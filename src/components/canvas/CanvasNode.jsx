import React, { useState } from "react";
import { FileText, Bot, BookTemplate, Grid, Link2, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const nodeIcons = {
  document: FileText,
  ai_agent: Bot,
  template: BookTemplate,
  section: Grid,
  group: Grid,
  project: Grid
};

const nodeColors = {
  document: '#667eea',
  ai_agent: '#764ba2',
  template: '#f093fb',
  section: '#4facfe',
  group: '#43e97b',
  project: '#f093fb'
};

export default function CanvasNode({ 
  node, 
  onMove, 
  onClick, 
  onConnectionStart,
  onConnectionEnd,
  onDelete,
  onResize,
  isSelected,
  isConnecting,
  scale = 1,
  onDragStart,
  onResizeStart,
  isChildNode = false
}) {
  const Icon = nodeIcons[node.node_type] || Grid;
  const color = node.color || nodeColors[node.node_type] || '#667eea';

  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.node-action')) {
      return;
    }
    
    e.stopPropagation();
    e.preventDefault();
    
    if (onDragStart) {
      onDragStart(node.id, e.clientX, e.clientY, node.position_x, node.position_y);
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(node.id);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete) {
      onDelete(node.id);
    }
  };

  const handleResizeStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onResizeStart) {
      onResizeStart(node.id, e.clientX, e.clientY, node.width || 200, node.height || 150);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: node.position_x,
        top: node.position_y,
        width: node.width || 200,
        height: node.height || 150,
        cursor: 'grab',
        zIndex: isChildNode ? (isSelected ? 150 : 50) : (isSelected ? 10 : 1),
        userSelect: 'none',
        borderColor: isSelected ? color : 'transparent',
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={`bg-white rounded-xl border-2 shadow-lg p-4 transition-shadow ${
        isSelected ? 'ring-2 ring-offset-2' : ''
      } ${isConnecting ? 'ring-2 ring-blue-400' : ''}`}
    >
      {/* Delete Button */}
      <button
        className="node-action absolute -top-2 -right-2 bg-white border-2 border-slate-200 rounded-full p-1 hover:scale-110 transition-transform shadow-md"
        onClick={handleDelete}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        title="Delete node"
        style={{ zIndex: 20 }}
      >
        <X className="w-3 h-3" style={{ color: '#991b1b' }} />
      </button>

      {/* Resize Handle - Bottom Right */}
      <div
        className="node-action absolute -bottom-2 -right-2 bg-white border-2 border-slate-200 rounded-full p-1 hover:scale-110 transition-transform cursor-nwse-resize shadow-md"
        onMouseDown={handleResizeStart}
        title="Resize node"
        style={{ zIndex: 20 }}
      >
        <Maximize2 className="w-3 h-3" style={{ color: '#667eea' }} />
      </div>

      {/* Header with subtle gradient */}
      <div 
        className="flex items-center gap-2 mb-3 -mx-4 -mt-4 px-4 pt-4 pb-3"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(color, 0.08)}, ${hexToRgba(color, 0.12)})`,
          borderRadius: '12px 12px 0 0',
        }}
      >
        <div 
          className="bg-white rounded-lg p-2 shadow-sm"
          style={{ background: `${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 
            className="font-semibold text-sm truncate" 
            style={{ color: '#2d3748' }}
          >
            {node.title}
          </h4>
          <p className="text-xs truncate" style={{ color: '#718096' }}>
            {node.node_type.replace('_', ' ')}
          </p>
        </div>
      </div>

      {/* Content */}
      {node.description && (
        <p 
          className="text-xs mb-3 line-clamp-2" 
          style={{ color: '#718096' }}
        >
          {node.description}
        </p>
      )}

      {/* Data Preview */}
      {node.data && (
        <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
          <p className="text-xs" style={{ color: '#4a5568' }}>
            {node.data.agent_type && `Agent: ${node.data.agent_type}`}
            {node.data.document_id && `Document ID: ${node.data.document_id.slice(0, 8)}...`}
            {node.data.template_id && `Template ID: ${node.data.template_id.slice(0, 8)}...`}
          </p>
        </div>
      )}

      {/* Connection Count */}
      {node.connections && node.connections.length > 0 && (
        <div className="mt-3 flex items-center gap-1 text-xs" style={{ color: '#718096' }}>
          <Link2 className="w-3 h-3" />
          <span>{node.connections.length} connection{node.connections.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}