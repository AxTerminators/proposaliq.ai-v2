import React, { useState, useRef, useEffect } from "react";
import CanvasNode from "./CanvasNode";
import GroupNode from "./GroupNode";
import DocumentAIAgentNode from "./DocumentAIAgentNode";
import CustomizableAIAgentNode from "./CustomizableAIAgentNode";
import ConnectionLine from "./ConnectionLine";

export default function InfiniteCanvas({
  nodes = [],
  onNodeMove,
  onNodeClick,
  onNodeConnect,
  onNodeDelete,
  onNodeResize,
  onNodeTitleChange,
  onDeleteConnection,
  onCanvasViewChange,
  onDocumentAIAgentDoubleClick,
  onNodeConfigClick,
  onRunAgent,
  selectedNodeId,
  initialOffset = { x: 0, y: 0 },
  initialScale = 1
}) {
  const canvasRef = useRef(null);
  const [offset, setOffset] = useState(initialOffset);
  const [scale, setScale] = useState(initialScale);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, nodeX: 0, nodeY: 0 });
  const [resizingNode, setResizingNode] = useState(null);
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      setOffset(initialOffset);
      setScale(initialScale);
      hasInitialized.current = true;
    }
  }, []);

  useEffect(() => {
    if (hasInitialized.current && onCanvasViewChange) {
      onCanvasViewChange(offset, scale);
    }
  }, [offset, scale, onCanvasViewChange]);

  const getBestConnectionPoints = (fromNode, toNode) => {
    const fromCenterX = fromNode.position_x + (fromNode.width || 200) / 2;
    const fromCenterY = fromNode.position_y + (fromNode.height || 150) / 2;
    const toCenterX = toNode.position_x + (toNode.width || 200) / 2;
    const toCenterY = toNode.position_y + (toNode.height || 150) / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    const isHorizontal = Math.abs(dx) > Math.abs(dy);

    let fromX, fromY, toX, toY;

    if (isHorizontal) {
      if (dx > 0) {
        fromX = fromNode.position_x + (fromNode.width || 200);
        fromY = fromNode.position_y + (fromNode.height || 150) / 2;
        toX = toNode.position_x;
        toY = toNode.position_y + (toNode.height || 150) / 2;
      } else {
        fromX = fromNode.position_x;
        fromY = fromNode.position_y + (fromNode.height || 150) / 2;
        toX = toNode.position_x + (toNode.width || 200);
        toY = toNode.position_y + (toNode.height || 150) / 2;
      }
    } else {
      if (dy > 0) {
        fromX = fromNode.position_x + (fromNode.width || 200) / 2;
        fromY = fromNode.position_y + (fromNode.height || 150);
        toX = toNode.position_x + (toNode.width || 200) / 2;
        toY = toNode.position_y;
      } else {
        fromX = fromNode.position_x + (fromNode.width || 200) / 2;
        fromY = fromNode.position_y;
        toX = toNode.position_x + (toNode.width || 200) / 2;
        toY = toNode.position_y + (toNode.height || 150);
      }
    }

    return {
      from: { x: fromX, y: fromY },
      to: { x: toX, y: toY }
    };
  };

  const handleCanvasMouseDown = (e) => {
    if (e.button === 0 && !draggingNode && !resizingNode) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning && !draggingNode && !resizingNode) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }

    if (draggingNode && onNodeMove) {
      const deltaX = (e.clientX - dragStartRef.current.mouseX) / scale;
      const deltaY = (e.clientY - dragStartRef.current.mouseY) / scale;
      
      onNodeMove(draggingNode, 
        dragStartRef.current.nodeX + deltaX,
        dragStartRef.current.nodeY + deltaY
      );
    }

    if (resizingNode && onNodeResize) {
      const deltaX = (e.clientX - resizeStartRef.current.mouseX) / scale;
      const deltaY = (e.clientY - resizeStartRef.current.mouseY) / scale;
      
      const newWidth = Math.max(150, resizeStartRef.current.width + deltaX);
      const newHeight = Math.max(100, resizeStartRef.current.height + deltaY);
      
      onNodeResize(resizingNode, newWidth, newHeight);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNode(null);
    setResizingNode(null);
  };

  const handleNodeDragStart = (nodeId, mouseX, mouseY, nodeX, nodeY) => {
    setDraggingNode(nodeId);
    dragStartRef.current = { mouseX, mouseY, nodeX, nodeY };
  };

  const handleNodeResizeStart = (nodeId, mouseX, mouseY, width, height) => {
    setResizingNode(nodeId);
    resizeStartRef.current = { mouseX, mouseY, width, height };
  };

  const handleCanvasClick = (e) => {
    if (e.target === e.currentTarget && onNodeClick) {
      onNodeClick(null);
    }
  };

  const groupedNodes = nodes.reduce((acc, node) => {
    if (node.parent_group_id) {
      if (!acc.children[node.parent_group_id]) {
        acc.children[node.parent_group_id] = [];
      }
      acc.children[node.parent_group_id].push(node);
    } else {
      acc.root.push(node);
    }
    return acc;
  }, { root: [], children: {} });

  const renderNode = (node) => {
    const childNodes = groupedNodes.children[node.id] || [];

    if (node.node_type === 'group') {
      return (
        <GroupNode
          key={node.id}
          node={node}
          childNodes={childNodes}
          onMove={onNodeMove}
          onClick={onNodeClick}
          onDelete={onNodeDelete}
          onResize={onNodeResize}
          onTitleChange={onNodeTitleChange}
          isSelected={selectedNodeId === node.id}
          scale={scale}
          onDragStart={handleNodeDragStart}
          onResizeStart={handleNodeResizeStart}
        />
      );
    }

    if (node.node_type === 'ai_agent') {
      const data = typeof node.data === 'string' ? JSON.parse(node.data) : node.data;
      const isDocumentAgent = data?.agent_type === 'document_analyzer';

      if (isDocumentAgent) {
        return (
          <DocumentAIAgentNode
            key={node.id}
            node={node}
            onMove={onNodeMove}
            onClick={onNodeClick}
            onDelete={onNodeDelete}
            onResize={onNodeResize}
            onTitleChange={onNodeTitleChange}
            onDoubleClick={onDocumentAIAgentDoubleClick}
            isSelected={selectedNodeId === node.id}
            scale={scale}
            onDragStart={handleNodeDragStart}
            onResizeStart={handleNodeResizeStart}
          />
        );
      }

      return (
        <CustomizableAIAgentNode
          key={node.id}
          node={node}
          onMove={onNodeMove}
          onClick={onNodeClick}
          onDelete={onNodeDelete}
          onResize={onNodeResize}
          onTitleChange={onNodeTitleChange}
          onConfigClick={onNodeConfigClick}
          onRunAgent={onRunAgent}
          isSelected={selectedNodeId === node.id}
          scale={scale}
          onDragStart={handleNodeDragStart}
          onResizeStart={handleNodeResizeStart}
        />
      );
    }

    return (
      <CanvasNode
        key={node.id}
        node={node}
        onMove={onNodeMove}
        onClick={onNodeClick}
        onDelete={onNodeDelete}
        onResize={onNodeResize}
        isSelected={selectedNodeId === node.id}
        scale={scale}
        onDragStart={handleNodeDragStart}
        onResizeStart={handleNodeResizeStart}
      />
    );
  };

  return (
    <div
      ref={canvasRef}
      className="w-full h-full overflow-hidden relative bg-white cursor-grab active:cursor-grabbing"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      style={{ touchAction: 'none' }}
    >
      <div
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        {/* SVG for connection lines */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '10000px',
            height: '10000px',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {nodes.map(fromNode => {
            const connections = fromNode.connections || [];
            return connections.map(toNodeId => {
              const toNode = nodes.find(n => n.id === toNodeId);
              if (!toNode) return null;

              const points = getBestConnectionPoints(fromNode, toNode);
              return (
                <ConnectionLine
                  key={`${fromNode.id}-${toNodeId}`}
                  from={points.from}
                  to={points.to}
                  connectionId={`${fromNode.id}-${toNodeId}`}
                  onDelete={onDeleteConnection}
                  isSelected={false}
                />
              );
            });
          })}
        </svg>

        {/* Render all root-level nodes */}
        {groupedNodes.root.map(renderNode)}
      </div>

      {/* Empty state when no nodes */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              Your Visual Strategy Canvas
            </h3>
            <p className="text-slate-500 mb-4">
              Start building your proposal workflow by:
            </p>
            <ul className="text-sm text-slate-600 text-left space-y-2 bg-white p-4 rounded-lg shadow-sm">
              <li>📄 <strong>Drag documents</strong> from the sidebar</li>
              <li>➕ <strong>Click the "Add Node" button</strong> below to create AI agents and groups</li>
              <li>🔗 <strong>Connect nodes</strong> to show workflow dependencies</li>
              <li>⚙️ <strong>Configure AI agents</strong> by clicking on them</li>
              <li>▶️ <strong>Run agents</strong> to generate proposal content</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}