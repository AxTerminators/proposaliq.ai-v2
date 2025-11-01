import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function EventResizeHandle({ 
  event, 
  position = "bottom", 
  onResize,
  disabled = false 
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeData, setResizeData] = useState({ startY: 0, originalDuration: 0 });
  const handleRef = useRef(null);

  const handleMouseDown = (e) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const eventStart = moment(event.start_date);
    const eventEnd = moment(event.end_date);
    const originalDuration = eventEnd.diff(eventStart, 'minutes');
    
    setIsResizing(true);
    setResizeData({
      startY: e.clientY,
      originalDuration
    });

    // Add global mouse move and mouse up listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;

    const deltaY = e.clientY - resizeData.startY;
    const pixelsPerHour = 80; // Matches the min-h-[80px] in week/day views
    const hoursChanged = deltaY / pixelsPerHour;
    const minutesChanged = Math.round(hoursChanged * 60 / 15) * 15; // Snap to 15-min intervals

    // Calculate new duration (minimum 15 minutes)
    const newDuration = Math.max(15, resizeData.originalDuration + minutesChanged);
    
    // Visual feedback could be added here (e.g., updating a preview)
  };

  const handleMouseUp = (e) => {
    if (!isResizing) return;

    const deltaY = e.clientY - resizeData.startY;
    const pixelsPerHour = 80;
    const hoursChanged = deltaY / pixelsPerHour;
    const minutesChanged = Math.round(hoursChanged * 60 / 15) * 15; // Snap to 15-min intervals

    const newDuration = Math.max(15, resizeData.originalDuration + minutesChanged);
    
    // Calculate new end time
    const eventStart = moment(event.start_date);
    const newEndTime = moment(eventStart).add(newDuration, 'minutes');

    // Only call onResize if duration actually changed
    if (newDuration !== resizeData.originalDuration) {
      onResize({
        id: event.original_id || event.id,
        start_date: event.start_date,
        end_date: newEndTime.toISOString(),
        source_type: event.source_type
      });
    }

    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  if (disabled) return null;

  return (
    <div
      ref={handleRef}
      className={cn(
        "absolute left-0 right-0 h-2 cursor-ns-resize z-10 group",
        position === "bottom" ? "bottom-0" : "top-0",
        isResizing && "h-4"
      )}
      onMouseDown={handleMouseDown}
    >
      <div className={cn(
        "absolute left-1/2 transform -translate-x-1/2 w-16 h-1 bg-white/50 rounded-full transition-all",
        "group-hover:h-1.5 group-hover:bg-white/80",
        isResizing && "h-2 bg-white shadow-lg",
        position === "bottom" ? "bottom-0.5" : "top-0.5"
      )} />
    </div>
  );
}