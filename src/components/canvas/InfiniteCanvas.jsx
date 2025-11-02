import React, { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2, Focus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CanvasNode from "./CanvasNode";
import GroupNode from "./GroupNode";
import DocumentAIAgentNode from "./DocumentAIAgentNode";
import CustomizableAIAgentNode from "./CustomizableAIAgentNode";
import ConnectionLine from "./ConnectionLine";

export default function InfiniteCanvas({
  nodes,
  onNodeMove,
  onNodeClick,
  onNodeConnect,
  onNodeDelete,
  onNodeResize,
  onCanvasClick,
  onNodeDrop,
  onNodeTitleChange,
  onNodeAddToGroup,
  onNodeRemoveFromGroup,
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
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [nearestDot, setNearestDot] = useState(null);

  // Track if we've initialized from props to avoid re-initialization loops
  const hasInitialized = useRef(false);

  // Node dragging state
  const [draggingNode, setDraggingNode] = useState(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, nodeX: 0, nodeY: 0, childrenStartPositions: [] });

  // Node resizing state
  const [resizingNode, setResizingNode] = useState(null);
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  // Drop zone tracking
  const [dropTargetGroupId, setDropTargetGroupId] = useState(null);

  // Initialize offset and scale from props ONLY ONCE on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      setOffset(initialOffset);
      setScale(initialScale);
      hasInitialized.current = true;
    }
  }, []); // Empty dependency array - only run once on mount

  // Notify parent component when offset or scale changes (debounced in parent)
  useEffect(() => {
    if (hasInitialized.current && onCanvasViewChange) {
      onCanvasViewChange(offset, scale);
    }
  }, [offset, scale, onCanvasViewChange]);

  // Connection dot positions
  const getConnectionDots = (node) => {
    const dots = [
      { id: `${node.id}-top`, x: node.position_x + (node.width || 200) / 2, y: node.position_y, position: 'top' },
      { id: `${node.id}-right`, x: node.position_x + (node.width || 200), y: node.position_y + (node.height || 150) / 2, position: 'right' },
      { id: `${node.id}-bottom`, x: node.position_x + (node.width || 200) / 2, y: node.position_y + (node.height || 150), position: 'bottom' },
      { id: `${node.id}-left`, x: node.position_x, y: node.position_y + (node.height || 150) / 2, position: 'left' },
    ];
    return dots;
  };

  // Calculate the best connection points between two nodes
  const getBestConnectionPoints = (fromNode, toNode) => {
    const fromCenterX = fromNode.position_x + (fromNode.width || 200) / 2;
    const fromCenterY = fromNode.position_y + (fromNode.height || 150) / 2;
    const toCenterX = toNode.position_x + (toNode.width || 200) / 2;
    const toCenterY = toNode.position_y + (toNode.height || 150) / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    const fromDots = getConnectionDots(fromNode);
    const toDots = getConnectionDots(toNode);

    // Determine primary direction based on which difference is larger
    const isHorizontal = Math.abs(dx) > Math.abs(dy);

    let fromDot, toDot;

    if (isHorizontal) {
      // Horizontal connection
      if (dx > 0) {
        // toNode is to the right of fromNode
        fromDot = fromDots.find(d => d.position === 'right');
        toDot = toDots.find(d => d.position === 'left');
      } else {
        // toNode is to the left of fromNode
        fromDot = fromDots.find(d => d.position === 'left');
        toDot = toDots.find(d => d.position === 'right');
      }
    } else {
      // Vertical connection
      if (dy > 0) {
        // toNode is below fromNode
        fromDot = fromDots.find(d => d.position === 'bottom');
        toDot = toDots.find(d => d.position === 'top');
      } else {
        // toNode is above fromNode
        fromDot = fromDots.find(d => d.position === 'top');
        toDot = toDots.find(d => d.position === 'bottom');
      }
    }

    // Fallback if specific positions aren't found (shouldn't happen with getConnectionDots)
    fromDot = fromDot || fromDots[0];
    toDot = toDot || toDots[0];

    return {
      from: { x: fromDot.x, y: fromDot.y },
      to: { x: toDot.x, y: toDot.y }
    };
  };

  // Find nearest connection dot when dragging connector
  const findNearestDot = (mouseX, mouseY) => {
    const snapDistance = 30;
    let nearest = null;
    let minDist = Infinity;

    nodes.forEach(node => {
      if (connectingFrom && node.id === connectingFrom.nodeId) return;
      
      const dots = getConnectionDots(node);
      dots.forEach(dot => {
        const dist = Math.sqrt(
          Math.pow(dot.x - mouseX, 2) + Math.pow(dot.y - mouseY, 2)
        );
        if (dist < snapDistance && dist < minDist) {
          minDist = dist;
          nearest = { ...dot, nodeId: node.id };
        }
      });
    });

    return nearest;
  };

  // Handle mouse events
  const handleCanvasMouseDown = (e) => {
    if (e.button === 0 && !draggingNode && !resizingNode) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = (e.clientX - rect.left - offset.x) / scale;
    const canvasY = (e.clientY - rect.top - offset.y) / scale;
    setMousePos({ x: canvasX, y: canvasY });

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

    if (connectingFrom) {
      const nearest = findNearestDot(canvasX, canvasY);
      setNearestDot(nearest);
    }
  };

  const handleMouseUp = (e) => {
    if (connectingFrom && nearestDot && onNodeConnect) {
      onNodeConnect(connectingFrom.nodeId, nearestDot.nodeId);
    }

    setIsPanning(false);
    setDraggingNode(null);
    setResizingNode(null);
    setConnectingFrom(null);
    setNearestDot(null);
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
    if (e.target === e.currentTarget && onCanvasClick) {
      onCanvasClick();
    }
  };

  // Group nodes by parent_group_id
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
      // Check if it's a document AI agent or customizable AI agent
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
      className="w-full h-full overflow-hidden relative cursor-grab active:cursor-grabbing"
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
          {/* Render connections between nodes */}
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

          {/* Drawing new connection */}
          {connectingFrom && (
            <ConnectionLine
              from={{ 
                x: connectingFrom.x,
                y: connectingFrom.y 
              }}
              to={nearestDot || mousePos}
              isDrawing={true}
            />
          )}
        </svg>

        {/* Render nodes */}
        {groupedNodes.root.map(renderNode)}
      </div>
    </div>
  );
}