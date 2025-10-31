import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Move } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

export default function FloatingChatButton({ proposalId, className }) {
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const [position, setPosition] = useState({ x: 24, y: 24 }); // Default: 24px from bottom-right
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load saved position from localStorage on mount
  useEffect(() => {
    const savedPosition = localStorage.getItem('floatingChatPosition');
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        setPosition(parsed);
      } catch (e) {
        console.error('Error loading chat button position:', e);
      }
    }
  }, []);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('floatingChatPosition', JSON.stringify(position));
  }, [position]);

  const handleMouseDown = (e) => {
    // Only start dragging if not clicking the button itself (to allow normal click)
    if (e.target.closest('button') && !e.target.closest('[data-drag-handle]')) {
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
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

  const handleClick = (e) => {
    // Don't navigate if we just finished dragging
    if (isDragging) {
      e.preventDefault();
      return;
    }

    if (proposalId) {
      navigate(createPageUrl(`Chat?proposalId=${proposalId}`));
    } else {
      navigate(createPageUrl("Chat"));
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
    >
      <Button
        onClick={handleClick}
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 relative",
          isDragging ? "scale-110 cursor-grabbing" : "hover:scale-110 cursor-grab"
        )}
        title={proposalId ? "Ask AI about this proposal" : "Ask AI Assistant"}
        data-drag-handle
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
        {proposalId ? "Ask AI about this proposal" : "AI Assistant"}
      </span>
      
      {/* Drag hint on first use */}
      {!localStorage.getItem('floatingChatDragHintShown') && (
        <span className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap animate-bounce pointer-events-none">
          💡 Drag me anywhere!
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-blue-600"></div>
        </span>
      )}
    </div>
  );
}