import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Trash2, Archive, CheckCircle, Edit } from "lucide-react";

export default function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  leftAction = { icon: Archive, label: 'Archive', color: 'bg-amber-500' },
  rightAction = { icon: CheckCircle, label: 'Complete', color: 'bg-green-500' },
  disabled = false
}) {
  const [touchStart, setTouchStart] = useState(null);
  const [touchCurrent, setTouchCurrent] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRef = useRef(null);

  const swipeThreshold = 100; // pixels to trigger action
  const translateX = touchCurrent && touchStart ? touchCurrent - touchStart : 0;
  const swipePercentage = Math.abs(translateX) / swipeThreshold;
  const isLeftSwipe = translateX < 0;
  const isRightSwipe = translateX > 0;

  const handleTouchStart = (e) => {
    if (disabled) return;
    setTouchStart(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!touchStart || disabled) return;
    setTouchCurrent(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || disabled) {
      setTouchStart(null);
      setTouchCurrent(null);
      setIsSwiping(false);
      return;
    }

    const swipedDistance = Math.abs(translateX);

    if (swipedDistance >= swipeThreshold) {
      if (isLeftSwipe && onSwipeLeft) {
        onSwipeLeft();
      } else if (isRightSwipe && onSwipeRight) {
        onSwipeRight();
      }
    }

    setTouchStart(null);
    setTouchCurrent(null);
    setIsSwiping(false);
  };

  const LeftIcon = leftAction.icon;
  const RightIcon = rightAction.icon;

  return (
    <div className="relative overflow-hidden">
      {/* Left Action Background */}
      {isLeftSwipe && (
        <div 
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-end px-6 transition-all",
            leftAction.color,
            swipePercentage >= 1 ? "opacity-100" : "opacity-60"
          )}
          style={{ width: `${Math.min(Math.abs(translateX), 200)}px` }}
        >
          <div className="flex flex-col items-center text-white">
            <LeftIcon className="w-6 h-6 mb-1" />
            <span className="text-xs font-semibold">{leftAction.label}</span>
          </div>
        </div>
      )}

      {/* Right Action Background */}
      {isRightSwipe && (
        <div 
          className={cn(
            "absolute inset-y-0 left-0 flex items-center justify-start px-6 transition-all",
            rightAction.color,
            swipePercentage >= 1 ? "opacity-100" : "opacity-60"
          )}
          style={{ width: `${Math.min(Math.abs(translateX), 200)}px` }}
        >
          <div className="flex flex-col items-center text-white">
            <RightIcon className="w-6 h-6 mb-1" />
            <span className="text-xs font-semibold">{rightAction.label}</span>
          </div>
        </div>
      )}

      {/* Swipeable Card */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "transition-transform touch-pan-y",
          isSwiping ? "transition-none" : "duration-300 ease-out"
        )}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}