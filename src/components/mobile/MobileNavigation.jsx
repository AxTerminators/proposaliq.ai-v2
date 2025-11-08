import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  CheckSquare,
  Menu,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function MobileNavigation({ user, organization }) {
  const location = useLocation();

  const isConsultant = organization?.organization_type === 'consultancy';

  const navigationItems = [
    { 
      title: "Dashboard", 
      url: createPageUrl("Dashboard"), 
      icon: LayoutDashboard,
      showFor: "all"
    },
    { 
      title: "Pipeline", 
      url: createPageUrl("Pipeline"), 
      icon: FileText,
      showFor: "all"
    },
    { 
      title: "Calendar", 
      url: createPageUrl("Calendar"), 
      icon: Calendar,
      showFor: "all"
    },
    { 
      title: "Tasks", 
      url: createPageUrl("Tasks"), 
      icon: CheckSquare,
      showFor: "all"
    },
    { 
      title: isConsultant ? "Clients" : "More", 
      url: isConsultant ? createPageUrl("Clients") : createPageUrl("Settings"), 
      icon: isConsultant ? Users : Menu,
      showFor: "all"
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-inset-bottom">
      <div className="grid grid-cols-5 h-16">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.url;
          const Icon = item.icon;

          return (
            <Link
              key={item.title}
              to={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all active:bg-slate-100 touch-manipulation",
                isActive ? "text-blue-600" : "text-slate-600"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
              <span className={cn(
                "text-xs font-medium",
                isActive && "font-bold"
              )}>
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Safe area padding for devices with notches */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
}