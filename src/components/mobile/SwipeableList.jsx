import React, { useState, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SwipeableList - List with pull-to-refresh functionality
 * Mobile-optimized component for smooth refresh interactions
 */
export default function SwipeableList({ 
  children, 
  onRefresh, 
  className,
  refreshThreshold = 80,
  maxPullDistance = 150 
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullToRefresh, setIsPullToRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const scrollRef = useRef(null);

  const handleTouchStart = (e) => {
    if (!scrollRef.current || scrollRef.current.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!scrollRef.current || scrollRef.current.scrollTop > 0) return;
    
    const touchY = e.touches[0].clientY;
    const diff = touchY - touchStartY.current;
    
    if (diff > 0 && diff < maxPullDistance) {
      // Prevent default scroll behavior during pull
      if (diff > 10) {
        e.preventDefault();
      }
      setPullDistance(diff);
      setIsPullToRefresh(diff > refreshThreshold);
    }
  };

  const handleTouchEnd = async () => {
    if (isPullToRefresh && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    setIsPullToRefresh(false);
  };

  return (
    <div className="relative">
      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all z-10 pointer-events-none"
          style={{ 
            transform: `translateY(${Math.min(pullDistance - 20, refreshThreshold)}px)`,
            opacity: Math.min(pullDistance / refreshThreshold, 1)
          }}
        >
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all",
            isPullToRefresh ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"
          )}>
            <RefreshCw className={cn(
              "w-4 h-4 transition-transform",
              isRefreshing && "animate-spin",
              isPullToRefresh && !isRefreshing && "rotate-180"
            )} />
            <span className="text-sm font-medium">
              {isRefreshing ? "Refreshing..." : isPullToRefresh ? "Release to refresh" : "Pull to refresh"}
            </span>
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div
        ref={scrollRef}
        className={cn("overflow-y-auto", className)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          paddingTop: pullDistance > 0 ? `${Math.min(pullDistance, maxPullDistance)}px` : '0',
          transition: pullDistance === 0 ? 'padding-top 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}