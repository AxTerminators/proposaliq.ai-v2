import React from "react";
import { useClient } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Check, ChevronDown, Crown, Users, Eye, Edit, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_CONFIG = {
  organization_owner: { label: "Owner", icon: Crown, color: "text-indigo-600 bg-indigo-50" },
  proposal_manager: { label: "Manager", icon: Shield, color: "text-blue-600 bg-blue-50" },
  writer: { label: "Writer", icon: Edit, color: "text-green-600 bg-green-50" },
  reviewer: { label: "Reviewer", icon: Eye, color: "text-purple-600 bg-purple-50" },
  guest: { label: "Guest", icon: Users, color: "text-amber-600 bg-amber-50" },
  viewer: { label: "Viewer", icon: Eye, color: "text-slate-600 bg-slate-50" }
};

export default function ClientSwitcher({ className = "" }) {
  const { 
    activeClient, 
    clientAccesses, 
    switchClient, 
    hasMultipleClients,
    loading 
  } = useClient();

  if (loading || !activeClient) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 animate-pulse", className)}>
        <Building2 className="w-4 h-4 text-slate-400" />
        <div className="h-4 w-32 bg-slate-200 rounded"></div>
      </div>
    );
  }

  const roleConfig = ROLE_CONFIG[activeClient.role] || ROLE_CONFIG.viewer;
  const RoleIcon = roleConfig.icon;

  // If only one client, show static display
  if (!hasMultipleClients) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200", className)}>
        <Building2 className="w-4 h-4 text-slate-600" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {activeClient.organization_name}
          </p>
        </div>
        <Badge className={cn("text-xs", roleConfig.color)}>
          <RoleIcon className="w-3 h-3 mr-1" />
          {roleConfig.label}
        </Badge>
      </div>
    );
  }

  // Multiple clients - show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "w-full justify-between bg-white hover:bg-slate-50 border-slate-300",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Building2 className="w-4 h-4 text-slate-600 flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {activeClient.organization_name}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Switch Client</span>
          <Badge variant="secondary" className="text-xs">
            {clientAccesses.length} {clientAccesses.length === 1 ? 'client' : 'clients'}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="max-h-96 overflow-y-auto">
          {clientAccesses.map((client) => {
            const isActive = client.organization_id === activeClient.organization_id;
            const clientRoleConfig = ROLE_CONFIG[client.role] || ROLE_CONFIG.viewer;
            const ClientRoleIcon = clientRoleConfig.icon;
            
            return (
              <DropdownMenuItem
                key={client.organization_id}
                onClick={() => switchClient(client)}
                className={cn(
                  "flex items-center gap-3 p-3 cursor-pointer",
                  isActive && "bg-blue-50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  isActive ? "bg-blue-100" : "bg-slate-100"
                )}>
                  <Building2 className={cn(
                    "w-5 h-5",
                    isActive ? "text-blue-600" : "text-slate-600"
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isActive ? "text-blue-900" : "text-slate-900"
                    )}>
                      {client.organization_name}
                    </p>
                    {isActive && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className={cn("text-xs", clientRoleConfig.color)}>
                      <ClientRoleIcon className="w-3 h-3 mr-1" />
                      {clientRoleConfig.label}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator />
        <div className="p-2">
          <p className="text-xs text-slate-500 px-2">
            You have access to {clientAccesses.length} client {clientAccesses.length === 1 ? 'organization' : 'organizations'}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}