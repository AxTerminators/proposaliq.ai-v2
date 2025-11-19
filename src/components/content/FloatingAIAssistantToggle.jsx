import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Floating AI Assistant Toggle Button
 * 
 * A minimized, draggable floating button that expands the AI Assistant when clicked
 * Position persists across sessions using localStorage
 */
export default function FloatingAIAssistantToggle({ onExpand }) {
  const [position, setPosition] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);

  // Load saved position from localStorage on mount
  useEffect(() => {
    const savedPosition = localStorage.getItem('ai-assistant-toggle-position');
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        setPosition(parsed);
      } catch (e) {
        console.error('Error parsing saved position:', e);
      }
    }
  }, []);

  // Handle mouse down - start dragging
  const handleMouseDown = (e) => {
    // Prevent dragging if clicking directly (we want click to expand)
    // Only drag if user moves mouse while holding down
    const rect = buttonRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    // Add temporary listeners for drag detection
    const handleMouseMove = (moveEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - e.clientX);
      const deltaY = Math.abs(moveEvent.clientY - e.clientY);
      
      // Only start dragging if moved more than 5px (prevents accidental drags)
      if (deltaX > 5 || deltaY > 5) {
        setIsDragging(true);
        document.removeEventListener('mousemove', handleMouseMove);
      }
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle mouse move - update position while dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - 56; // 56px = button width
      const maxY = window.innerHeight - 56;
      
      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));
      
      setPosition({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      
      // Save position to localStorage
      if (position.x !== null && position.y !== null) {
        localStorage.setItem('ai-assistant-toggle-position', JSON.stringify(position));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, position]);

  // Handle click - only expand if not dragging
  const handleClick = () => {
    if (!isDragging) {
      onExpand();
    }
  };

  // Compute style based on position
  const buttonStyle = position.x !== null && position.y !== null
    ? { left: `${position.x}px`, top: `${position.y}px` }
    : { bottom: '1.5rem', right: '1.5rem' }; // Default position

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={buttonRef}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            style={buttonStyle}
            className={`fixed h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 z-50 transition-all duration-300 hover:scale-110 animate-in fade-in zoom-in ${
              isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'
            }`}
            size="icon"
          >
            <Sparkles className="h-6 w-6 text-white animate-pulse" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-slate-900 text-white">
          <p>{isDragging ? 'Drag to reposition' : 'Click to open • Drag to move'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}