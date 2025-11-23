import React, { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  CheckSquare,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile Navigation
 * Fixed bottom navigation bar for mobile devices
 */
export default function MobileNavigation({ user, organization }) {
  const location = useLocation();
  const navigate = useNavigate();
  const touchStartX = useRef(0);
  const [swipeIndicator, setSwipeIndicator] = useState(0);

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", url: createPageUrl("Dashboard") },
    { icon: FileText, label: "Pipeline", url: createPageUrl("Pipeline") },
    { icon: Calendar, label: "Calendar", url: createPageUrl("Calendar") },
    { icon: CheckSquare, label: "Tasks", url: createPageUrl("Tasks") },
    { icon: Users, label: "Team", url: createPageUrl("Team") },
  ];

  // Swipe to go back gesture
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    const touchX = e.touches[0].clientX;
    const diff = touchX - touchStartX.current;
    
    // Only show indicator for right swipe from left edge
    if (touchStartX.current < 50 && diff > 0 && diff < 200) {
      setSwipeIndicator(diff);
    }
  };

  const handleTouchEnd = () => {
    if (swipeIndicator > 100) {
      navigate(-1); // Go back
    }
    setSwipeIndicator(0);
  };

  return (
    <>
      {/* Swipe back indicator */}
      {swipeIndicator > 0 && (
        <div 
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
          style={{ transform: `translateX(${Math.min(swipeIndicator - 50, 0)}px)` }}
        >
          <div className={cn(
            "bg-blue-600 text-white rounded-r-full px-4 py-3 shadow-lg transition-all",
            swipeIndicator > 100 && "bg-green-600"
          )}>
            <span className="text-lg">←</span>
          </div>
        </div>
      )}

      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.url;

          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[64px] min-h-[56px]",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 active:bg-slate-100"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}