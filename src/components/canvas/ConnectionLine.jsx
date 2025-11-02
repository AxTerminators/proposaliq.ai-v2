import React, { useState } from "react";
import { X } from "lucide-react";

export default function ConnectionLine({ 
  from, 
  to, 
  isDrawing = false, 
  connectionId = null,
  onDelete = null,
  isSelected = false
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate control points for curved line
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const curve = Math.abs(dx) * 0.5;

  const path = `M ${from.x} ${from.y} C ${from.x + curve} ${from.y}, ${to.x - curve} ${to.y}, ${to.x} ${to.y}`;

  // Calculate midpoint for X button
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  const handleClick = (e) => {
    e.stopPropagation();
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (onDelete && connectionId) {
      onDelete(connectionId);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete && connectionId) {
      onDelete(connectionId);
    }
  };

  if (isDrawing) {
    return (
      <path
        d={path}
        fill="none"
        stroke="#667eea"
        strokeWidth={3}
        strokeDasharray="5,5"
        opacity={0.6}
      />
    );
  }

  return (
    <g>
      {/* Animated gradient for pulsing effect */}
      <defs>
        <linearGradient id={`pulse-gradient-${connectionId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9ca3af" stopOpacity="0.4">
            <animate
              attributeName="offset"
              values="0;1;0"
              dur="2s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%" stopColor="#667eea" stopOpacity="0.8">
            <animate
              attributeName="offset"
              values="0;1;0"
              dur="2s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#9ca3af" stopOpacity="0.4">
            <animate
              attributeName="offset"
              values="0;1;0"
              dur="2s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>

      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Visible connection line with pulsing animation */}
      <path
        d={path}
        fill="none"
        stroke={isSelected || isHovered ? "#667eea" : `url(#pulse-gradient-${connectionId})`}
        strokeWidth={isSelected || isHovered ? 3 : 2}
        opacity={isSelected || isHovered ? 1 : 0.6}
        style={{ 
          pointerEvents: 'none',
          transition: 'all 0.2s ease'
        }}
      />

      {/* Arrow head */}
      <defs>
        <marker
          id={`arrowhead-${connectionId}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            fill={isSelected || isHovered ? "#667eea" : "#9ca3af"}
            style={{ transition: 'fill 0.2s ease' }}
          />
        </marker>
      </defs>

      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={2}
        markerEnd={`url(#arrowhead-${connectionId})`}
        style={{ pointerEvents: 'none' }}
      />

      {/* Delete X button (shows on hover or selected) */}
      {(isHovered || isSelected) && onDelete && (
        <g
          transform={`translate(${midX}, ${midY})`}
          style={{ cursor: 'pointer' }}
          onClick={handleDeleteClick}
          onMouseEnter={() => setIsHovered(true)}
        >
          {/* Background circle */}
          <circle
            cx="0"
            cy="0"
            r="10"
            fill="#ef4444"
            stroke="white"
            strokeWidth="2"
            style={{ transition: 'all 0.2s ease' }}
          />
          {/* X icon */}
          <line
            x1="-4"
            y1="-4"
            x2="4"
            y2="4"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="4"
            y1="-4"
            x2="-4"
            y2="4"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Pulsing dots along the line for data flow effect */}
      {!isDrawing && (
        <>
          <circle r="3" fill="#667eea" opacity="0.8">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path={path}
            />
          </circle>
          <circle r="3" fill="#667eea" opacity="0.8">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path={path}
              begin="1s"
            />
          </circle>
        </>
      )}
    </g>
  );
}