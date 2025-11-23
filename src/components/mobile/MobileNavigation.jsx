import React from "react";
import { Link, useLocation } from "react-router-dom";
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

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", url: createPageUrl("Dashboard") },
    { icon: FileText, label: "Pipeline", url: createPageUrl("Pipeline") },
    { icon: Calendar, label: "Calendar", url: createPageUrl("Calendar") },
    { icon: CheckSquare, label: "Tasks", url: createPageUrl("Tasks") },
    { icon: Users, label: "Team", url: createPageUrl("Team") },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
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