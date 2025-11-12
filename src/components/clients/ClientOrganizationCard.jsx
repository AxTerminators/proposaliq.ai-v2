import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Mail,
  Globe,
  Users,
  Eye,
  Edit,
  Trash2,
  Archive,
  ArrowRight,
  UserPlus,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import OptimizedImage from "../ui/OptimizedImage";
import moment from "moment";

/**
 * Client Organization Card
 * Reusable card component for displaying client organization summary
 */
export default function ClientOrganizationCard({
  clientOrg,
  relationship,
  onOpenWorkspace,
  onManageUsers,
  onEdit,
  onDelete,
  onArchive,
  onClick,
  isArchived = false
}) {
  return (
    <Card
      className={cn(
        "border-none shadow-lg hover:shadow-xl transition-all cursor-pointer",
        isArchived && "opacity-75"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Logo if available */}
            {clientOrg.custom_branding?.logo_url && (
              <div className="mb-3">
                <OptimizedImage
                  src={clientOrg.custom_branding.logo_url}
                  alt={`${clientOrg.organization_name} logo`}
                  className="h-12 w-auto object-contain"
                  containerClassName="h-12"
                  aspectRatio="auto"
                />
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <CardTitle className="text-lg truncate">
                {clientOrg.organization_name}
              </CardTitle>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-blue-100 text-blue-700 text-xs">
                Client Workspace
              </Badge>
              {isArchived && (
                <Badge className="bg-slate-100 text-slate-700 text-xs">
                  <Archive className="w-3 h-3 mr-1" />
                  Archived
                </Badge>
              )}
              {relationship && (
                <Badge className={cn(
                  "text-xs",
                  relationship.relationship_status === 'active' ? "bg-green-100 text-green-700" :
                  relationship.relationship_status === 'prospect' ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-700"
                )}>
                  {relationship.relationship_status}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(clientOrg);
              }}
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(clientOrg);
              }}
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Contact Info */}
        {clientOrg.contact_name && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="truncate">{clientOrg.contact_name}</span>
          </div>
        )}
        {clientOrg.contact_email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <a 
              href={`mailto:${clientOrg.contact_email}`} 
              className="text-blue-600 hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {clientOrg.contact_email}
            </a>
          </div>
        )}
        {clientOrg.website_url && (
          <div className="flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <a 
              href={clientOrg.website_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              Visit Website
            </a>
          </div>
        )}

        {/* Relationship Stats */}
        {relationship && (
          <div className="pt-3 border-t">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="text-lg font-bold text-blue-900">
                  {relationship.total_proposals_created || 0}
                </div>
                <div className="text-xs text-blue-700">Proposals</div>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <div className="text-lg font-bold text-green-900">
                  {relationship.total_proposals_won || 0}
                </div>
                <div className="text-xs text-green-700">Won</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-2">
                <div className="text-lg font-bold text-purple-900">
                  {relationship.win_rate ? `${relationship.win_rate}%` : '-%'}
                </div>
                <div className="text-xs text-purple-700">Win Rate</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t space-y-2">
          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            onClick={(e) => {
              e.stopPropagation();
              onOpenWorkspace(clientOrg);
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            Open Workspace
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onManageUsers(clientOrg);
              }}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Users
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onArchive(clientOrg);
              }}
            >
              <Archive className="w-4 h-4 mr-1" />
              {isArchived ? "Unarchive" : "Archive"}
            </Button>
          </div>
        </div>

        {/* Footer */}
        {relationship?.last_interaction_date && (
          <div className="pt-2 border-t text-xs text-slate-500">
            Last activity: {moment(relationship.last_interaction_date).fromNow()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}