import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Send,
  UserPlus,
  FileText,
  BarChart3,
  Eye,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Quick Actions Panel for Client Organization Management
 * Common shortcuts for managing client workspaces
 */
export default function QuickClientActions({ 
  clientOrganization, 
  onOpenWorkspace,
  onManageUsers,
  onPushResources,
  onViewAnalytics,
  onEditSettings
}) {
  const actions = [
    {
      icon: Eye,
      label: "Open Workspace",
      description: "Switch to client view",
      color: "from-blue-500 to-indigo-600",
      onClick: onOpenWorkspace
    },
    {
      icon: UserPlus,
      label: "Manage Users",
      description: "Control access",
      color: "from-purple-500 to-pink-600",
      onClick: onManageUsers
    },
    {
      icon: Send,
      label: "Push Resources",
      description: "Share templates",
      color: "from-green-500 to-emerald-600",
      onClick: onPushResources
    },
    {
      icon: BarChart3,
      label: "View Analytics",
      description: "Performance metrics",
      color: "from-amber-500 to-orange-600",
      onClick: onViewAnalytics
    },
    {
      icon: Settings,
      label: "Edit Settings",
      description: "Update details",
      color: "from-slate-500 to-slate-700",
      onClick: onEditSettings
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {actions.map((action, idx) => {
        const Icon = action.icon;
        return (
          <button
            key={idx}
            onClick={action.onClick}
            className="group relative overflow-hidden rounded-xl border-2 border-slate-200 bg-white hover:border-blue-300 hover:shadow-lg transition-all p-4 text-left"
          >
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity",
              action.color
            )} />
            <Icon className={cn(
              "w-6 h-6 mb-2 bg-gradient-to-br bg-clip-text",
              action.color
            )} />
            <p className="font-semibold text-slate-900 text-sm mb-0.5">
              {action.label}
            </p>
            <p className="text-xs text-slate-500">
              {action.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}