import React, { useState, useRef } from "react";
import { Folder, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GroupNode({
  node,
  childNodes,
  onMove,
  onClick,
  onConnectionStart,
  onConnectionEnd,
  onDelete,
  onResize,
  onTitleChange,
  isSelected,
  isConnecting,
  scale,
  onDragStart,
  onResizeStart,
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(node.title || 'Group');
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
    // Don't start drag if clicking on interactive elements
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

  return (
    <div
      style={{
        position: 'absolute',
        left: `${node.position_x}px`,
        top: `${node.position_y}px`,
        width: `${node.width || 400}px`,
        height: `${node.height || 300}px`,
        cursor: 'move',
        zIndex: isSelected ? 999 : 0,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(node.id);
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Group Container */}
      <div
        className={`h-full ${isSelected ? 'ring-2 ring-purple-400' : ''}`}
        style={{
          background: node.color || 'rgba(230, 230, 250, 0.3)',
          border: '2px dashed rgba(139, 92, 246, 0.4)',
          borderRadius: '16px',
          transition: 'all 0.2s',
        }}
      >
        {/* Header */}
        <div 
          className="p-3 flex items-center justify-between"
          style={{ 
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: '14px 14px 0 0',
            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
            minHeight: '50px'
          }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Folder className="w-5 h-5 flex-shrink-0" style={{ color: '#8b5cf6' }} />
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
            <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#6b21a8' }}>
              {childNodes.length} items
            </span>
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

        {/* Body - Drop Zone */}
        <div 
          className="p-4 h-full"
          style={{
            paddingTop: '60px',
          }}
        >
          {childNodes.length === 0 && (
            <div 
              className="flex items-center justify-center h-full"
              style={{
                border: '2px dashed rgba(139, 92, 246, 0.3)',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              <p className="text-sm" style={{ color: '#8b5cf6' }}>
                Drop items here to group
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Resize Handle - Bottom Right */}
      <div
        className="resize-handle absolute -bottom-2 -right-2 neuro-button rounded-full p-1 hover:scale-110 transition-transform cursor-nwse-resize"
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart(node.id, e.clientX, e.clientY, node.width || 400, node.height || 300);
        }}
        title="Resize group"
        style={{ background: '#e0e0e0', zIndex: 20 }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M10 2L2 10M10 6L6 10M10 10H6" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}