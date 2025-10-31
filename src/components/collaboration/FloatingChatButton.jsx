import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Move } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

export default function FloatingChatButton({ proposalId, className }) {
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  
  // Calculate default bottom-right position
  const getDefaultPosition = () => {
    const buttonSize = 56; // 14 * 4 (w-14)
    const margin = 24;
    return {
      x: window.innerWidth - buttonSize - margin,
      y: window.innerHeight - buttonSize - margin
    };
  };

  const [position, setPosition] = useState(getDefaultPosition());
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasBeenDragged, setHasBeenDragged] = useState(false);

  // Load session position (if user has dragged it during this session)
  useEffect(() => {
    const sessionPosition = sessionStorage.getItem('floatingChatPosition');
    if (sessionPosition) {
      try {
        const parsed = JSON.parse(sessionPosition);
        setPosition(parsed);
        setHasBeenDragged(true);
      } catch (e) {
        console.error('Error loading chat button position:', e);
      }
    }
  }, []);

  // Reset to default position on window resize if user hasn't dragged it
  useEffect(() => {
    const handleResize = () => {
      if (!hasBeenDragged) {
        setPosition(getDefaultPosition());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hasBeenDragged]);

  // Save position to sessionStorage only when user drags (not on default)
  useEffect(() => {
    if (hasBeenDragged) {
      sessionStorage.setItem('floatingChatPosition', JSON.stringify(position));
    }
  }, [position, hasBeenDragged]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    e.preventDefault();
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Check if movement is significant (more than 5px)
    const movedDistance = Math.sqrt(
      Math.pow(newX - position.x, 2) + Math.pow(newY - position.y, 2)
    );
    
    if (movedDistance > 5) {
      setHasMoved(true);
      setHasBeenDragged(true);
    }

    // Get button dimensions
    const buttonWidth = 56; // 14 * 4 (w-14)
    const buttonHeight = 56; // 14 * 4 (h-14)

    // Constrain to viewport bounds
    const maxX = window.innerWidth - buttonWidth - 24;
    const maxY = window.innerHeight - buttonHeight - 24;
    
    const constrainedX = Math.max(24, Math.min(newX, maxX));
    const constrainedY = Math.max(24, Math.min(newY, maxY));

    setPosition({ x: constrainedX, y: constrainedY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove global event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
      document.body.style.cursor = 'grabbing';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, dragStart, position]);

  const handleDoubleClick = (e) => {
    e.preventDefault();
    
    // Only navigate if the button wasn't just dragged
    if (!hasMoved) {
      if (proposalId) {
        navigate(createPageUrl(`Chat?proposalId=${proposalId}`));
      } else {
        navigate(createPageUrl("Chat"));
      }
    }
  };

  return (
    <div
      ref={buttonRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 50
      }}
      className={cn("group", className)}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <Button
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 relative",
          isDragging ? "scale-110 cursor-grabbing" : "hover:scale-110 cursor-grab"
        )}
        title={proposalId ? "Double-click to ask AI about this proposal" : "Double-click to open AI Assistant"}
        data-drag-handle
        // Prevent default button click behavior
        onClick={(e) => e.preventDefault()}
      >
        <div className="relative">
          <MessageCircle className="w-6 h-6 text-white" />
          <Sparkles className="w-3 h-3 text-white absolute -top-1 -right-1 animate-pulse" />
        </div>
        
        {/* Drag handle indicator */}
        <div className={cn(
          "absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity",
          isDragging && "opacity-100"
        )}>
          <Move className="w-3 h-3 text-indigo-600" />
        </div>
      </Button>
      
      {/* Tooltip */}
      <span className={cn(
        "absolute right-16 top-1/2 transform -translate-y-1/2 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-opacity pointer-events-none",
        isDragging ? "opacity-0" : "opacity-0 group-hover:opacity-100"
      )}>
        {proposalId ? "Double-click: Ask AI • Drag: Move" : "Double-click: AI Assistant • Drag: Move"}
      </span>
      
      {/* Drag hint on first use */}
      {!sessionStorage.getItem('floatingChatDragHintShown') && !hasBeenDragged && (
        <span 
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap animate-bounce pointer-events-none"
          onAnimationEnd={() => {
            setTimeout(() => {
              sessionStorage.setItem('floatingChatDragHintShown', 'true');
            }, 3000);
          }}
        >
          💡 Drag to move • Double-click to open!
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-blue-600"></div>
        </span>
      )}
    </div>
  );
}