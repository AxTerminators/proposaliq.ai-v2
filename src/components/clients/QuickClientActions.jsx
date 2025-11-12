
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Eye,
  Users, // Replaces UserPlus
  Package, // Replaces Send
  BarChart3,
  Settings,
  Archive,
  CheckCircle2,
  LinkIcon // New icon for portal link
} from "lucide-react";
import { cn } from "@/lib/utils";
import ClientPortalLinkGenerator from "./ClientPortalLinkGenerator";

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
  onEditSettings,
  onArchiveToggle,
  onDelete, // onDelete is declared in props but not used in the outline, so it remains unused.
  isArchived = false
}) {
  const actions = [
    {
      icon: Eye,
      label: "Open Workspace",
      description: "Switch to this client's workspace",
      gradient: "from-blue-500 to-indigo-600",
      onClick: onOpenWorkspace
    },
    {
      icon: Users,
      label: "Manage Users",
      description: "Add or remove user access",
      gradient: "from-purple-500 to-pink-600",
      onClick: onManageUsers
    },
    {
      icon: Package,
      label: "Push Resources",
      description: "Share templates and content",
      gradient: "from-green-500 to-emerald-600",
      onClick: onPushResources
    },
    {
      icon: BarChart3,
      label: "View Analytics",
      description: "Client performance metrics",
      gradient: "from-amber-500 to-orange-600",
      onClick: onViewAnalytics
    },
    {
      icon: Settings,
      label: "Edit Settings",
      description: "Update client details",
      gradient: "from-slate-500 to-slate-700",
      onClick: onEditSettings
    },
    {
      icon: isArchived ? CheckCircle2 : Archive,
      label: isArchived ? "Unarchive" : "Archive",
      description: isArchived ? "Restore to active" : "Archive this client",
      gradient: "from-slate-400 to-slate-600",
      onClick: onArchiveToggle
    }
  ];

  return (
    <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
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
              action.gradient
            )} />
            <Icon className="w-6 h-6 text-blue-600 mb-2" />
            <p className="font-semibold text-slate-900 text-sm mb-0.5">
              {action.label}
            </p>
            <p className="text-xs text-slate-600">
              {action.description}
            </p>
          </button>
        );
      })}

      {/* NEW: Generate Portal Link */}
      <ClientPortalLinkGenerator
        clientOrganization={clientOrganization}
        trigger={
          <button className="group relative overflow-hidden rounded-xl border-2 border-slate-200 bg-white hover:border-purple-300 hover:shadow-lg transition-all p-4 text-left">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity" />
            <LinkIcon className="w-6 h-6 text-purple-600 mb-2" />
            <p className="font-semibold text-slate-900 text-sm mb-0.5">
              Generate Portal Link
            </p>
            <p className="text-xs text-slate-600">
              Secure client access
            </p>
          </button>
        }
      />
    </div>
  );
}
