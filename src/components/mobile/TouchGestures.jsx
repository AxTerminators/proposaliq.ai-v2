import React, { useState, useRef, useEffect } from "react";

/**
 * TouchGestures - Higher-order component that adds swipe and gesture support
 * Usage: <TouchGestures onSwipeLeft={...} onSwipeRight={...}>{children}</TouchGestures>
 */
export default function TouchGestures({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  onLongPress,
  threshold = 50,
  className = ""
}) {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const longPressTimer = useRef(null);

  const minSwipeDistance = threshold;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
      time: Date.now()
    });

    // Long press detection
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress();
      }, 500);
    }
  };

  const onTouchMove = (e) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });

    // Cancel long press if user moves
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const onTouchEnd = () => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const absDistanceX = Math.abs(distanceX);
    const absDistanceY = Math.abs(distanceY);

    // Determine if it's a horizontal or vertical swipe
    const isHorizontalSwipe = absDistanceX > absDistanceY;
    const isVerticalSwipe = absDistanceY > absDistanceX;

    // Horizontal swipes
    if (isHorizontalSwipe) {
      if (distanceX > minSwipeDistance && onSwipeLeft) {
        onSwipeLeft();
      }
      if (distanceX < -minSwipeDistance && onSwipeRight) {
        onSwipeRight();
      }
    }

    // Vertical swipes
    if (isVerticalSwipe) {
      if (distanceY > minSwipeDistance && onSwipeUp) {
        onSwipeUp();
      }
      if (distanceY < -minSwipeDistance && onSwipeDown) {
        onSwipeDown();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * SwipeableCard - A card component with built-in swipe actions
 */
export function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  leftAction = { icon: null, color: "bg-red-500", label: "Delete" },
  rightAction = { icon: null, color: "bg-green-500", label: "Complete" },
  className = ""
}) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Limit the drag distance
    const maxDrag = 100;
    const limitedDiff = Math.max(-maxDrag, Math.min(maxDrag, diff));
    setOffset(limitedDiff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // Trigger action if swiped far enough
    if (offset < -60 && onSwipeLeft) {
      onSwipeLeft();
    } else if (offset > 60 && onSwipeRight) {
      onSwipeRight();
    }

    // Reset position
    setOffset(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Left Action (revealed when swiping right) */}
      {offset > 0 && rightAction && (
        <div 
          className={`absolute left-0 top-0 bottom-0 flex items-center justify-center px-6 ${rightAction.color}`}
          style={{ width: `${offset}px` }}
        >
          {rightAction.icon && <div className="text-white">{rightAction.icon}</div>}
        </div>
      )}

      {/* Right Action (revealed when swiping left) */}
      {offset < 0 && leftAction && (
        <div 
          className={`absolute right-0 top-0 bottom-0 flex items-center justify-center px-6 ${leftAction.color}`}
          style={{ width: `${Math.abs(offset)}px` }}
        >
          {leftAction.icon && <div className="text-white">{leftAction.icon}</div>}
        </div>
      )}

      {/* Card Content */}
      <div
        className={`${className} transition-transform`}
        style={{ 
          transform: `translateX(${offset}px)`,
          transitionDuration: isDragging ? '0ms' : '200ms'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * PullToRefresh - Pull-down-to-refresh component
 */
export function PullToRefresh({ children, onRefresh, threshold = 80 }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    // Only activate if at top of scroll
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current === 0 || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Prevent default scrolling when pulling down
      e.preventDefault();
      setPullDistance(Math.min(diff, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh error:", error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    startY.current = 0;
    setPullDistance(0);
  };

  const getRefreshText = () => {
    if (isRefreshing) return "Refreshing...";
    if (pullDistance >= threshold) return "Release to refresh";
    return "Pull to refresh";
  };

  return (
    <div className="relative overflow-auto" ref={containerRef}>
      {/* Pull Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-blue-50 text-blue-700 font-medium text-sm transition-all z-50"
          style={{ 
            height: `${pullDistance}px`,
            opacity: pullDistance / threshold
          }}
        >
          <div className="flex items-center gap-2">
            {isRefreshing ? (
              <div className="w-5 h-5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
            ) : (
              <div 
                className="w-5 h-5 text-xl transition-transform"
                style={{ transform: `rotate(${(pullDistance / threshold) * 180}deg)` }}
              >
                ↓
              </div>
            )}
            <span>{getRefreshText()}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: isRefreshing ? 'transform 0.2s' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}