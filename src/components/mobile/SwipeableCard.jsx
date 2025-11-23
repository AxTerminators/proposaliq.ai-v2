import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * SwipeableCard - Card with swipe-to-reveal actions
 * Supports left and right swipe gestures to reveal action buttons
 */
export default function SwipeableCard({ 
  children, 
  leftActions = [], 
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  className,
  swipeThreshold = 80
}) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const touchStartX = useRef(0);
  const cardRef = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwipeActive(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwipeActive) return;
    
    const touchX = e.touches[0].clientX;
    const diff = touchX - touchStartX.current;
    
    // Limit swipe distance
    const maxSwipe = rightActions.length > 0 ? 140 : 0;
    const minSwipe = leftActions.length > 0 ? -140 : 0;
    
    if (diff > maxSwipe) {
      setSwipeOffset(maxSwipe);
    } else if (diff < minSwipe) {
      setSwipeOffset(minSwipe);
    } else {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsSwipeActive(false);
    
    // Snap to action position or reset
    if (swipeOffset > swipeThreshold && rightActions.length > 0) {
      setSwipeOffset(140); // Show right actions
      if (onSwipeRight) onSwipeRight();
    } else if (swipeOffset < -swipeThreshold && leftActions.length > 0) {
      setSwipeOffset(-140); // Show left actions
      if (onSwipeLeft) onSwipeLeft();
    } else {
      setSwipeOffset(0); // Reset
    }
  };

  const resetSwipe = () => {
    setSwipeOffset(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Right Actions (revealed on right swipe) */}
      {rightActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex items-stretch">
          {rightActions.map((action, idx) => (
            <Button
              key={idx}
              variant="ghost"
              className={cn(
                "h-full px-5 rounded-none",
                action.className || "bg-blue-600 hover:bg-blue-700 text-white"
              )}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
                resetSwipe();
              }}
            >
              {action.icon && <action.icon className="w-5 h-5" />}
              {action.label && <span className="ml-2">{action.label}</span>}
            </Button>
          ))}
        </div>
      )}

      {/* Left Actions (revealed on left swipe) */}
      {leftActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
          {leftActions.map((action, idx) => (
            <Button
              key={idx}
              variant="ghost"
              className={cn(
                "h-full px-5 rounded-none",
                action.className || "bg-red-600 hover:bg-red-700 text-white"
              )}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
                resetSwipe();
              }}
            >
              {action.icon && <action.icon className="w-5 h-5" />}
              {action.label && <span className="ml-2">{action.label}</span>}
            </Button>
          ))}
        </div>
      )}

      {/* Swipeable Content */}
      <div
        ref={cardRef}
        className={cn("relative bg-white", className)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwipeActive ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
}