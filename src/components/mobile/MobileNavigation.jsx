import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, LayoutGrid, MessageSquare, Calendar, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNavigation({ user, organization }) {
  const location = useLocation();

  const navItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: createPageUrl("Dashboard"),
      show: true
    },
    {
      icon: LayoutGrid,
      label: "Board",
      path: createPageUrl("Pipeline"),
      show: true
    },
    {
      icon: MessageSquare,
      label: "Chat",
      path: createPageUrl("Chat"),
      show: true
    },
    {
      icon: Calendar,
      label: "Calendar",
      path: createPageUrl("Calendar"),
      show: true
    },
    {
      icon: Settings,
      label: "Settings",
      path: createPageUrl("Settings"),
      show: true
    }
  ];

  const visibleItems = navItems.filter(item => item.show);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 lg:hidden z-50">
      <div className="flex items-center justify-around">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-4 flex-1 transition-colors",
                isActive
                  ? "text-blue-600"
                  : "text-slate-600 hover:text-blue-600"
              )}
            >
              <item.icon className={cn(
                "w-6 h-6 mb-1",
                isActive && "fill-current"
              )} />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}