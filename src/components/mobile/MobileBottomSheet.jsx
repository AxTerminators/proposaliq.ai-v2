import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom sheet component with pull-to-dismiss gesture
 * Optimized for mobile touch interactions
 */
export default function MobileBottomSheet({ 
  isOpen, 
  onClose, 
  title, 
  description,
  children,
  height = "90vh",
  snapPoints = [0.9, 0.5, 0.25]
}) {
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);

  const handleDragStart = (e) => {
    setDragStart(e.touches[0].clientY);
  };

  const handleDragMove = (e) => {
    if (!dragStart) return;
    setDragCurrent(e.touches[0].clientY);
  };

  const handleDragEnd = () => {
    if (!dragStart || !dragCurrent) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const dragDistance = dragCurrent - dragStart;
    
    // If dragged down more than 100px, close the sheet
    if (dragDistance > 100) {
      onClose();
    }

    setDragStart(null);
    setDragCurrent(null);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-2xl"
        style={{ height }}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* Drag Handle */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-300 rounded-full" />

        <SheetHeader className="pb-4 pt-6 border-b">
          <SheetTitle>{title}</SheetTitle>
          {description && (
            <SheetDescription>{description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="overflow-y-auto" style={{ maxHeight: `calc(${height} - 120px)` }}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}