import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  Eye,
  Download,
  MoreVertical,
  FileText,
  Award,
  Users,
  Handshake,
  Settings,
  BookOpen,
  Clock,
  TrendingUp,
  Edit,
  Trash2,
  Copy,
  FolderInput
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const CONTENT_TYPE_CONFIG = {
  ProposalResource: {
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    getName: (item) => item.title,
    getSubtitle: (item) => item.resource_type?.replace(/_/g, ' ')
  },
  PastPerformance: {
    icon: Award,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    getName: (item) => item.project_name,
    getSubtitle: (item) => item.client_name
  },
  KeyPersonnel: {
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    getName: (item) => item.full_name,
    getSubtitle: (item) => item.title
  },
  TeamingPartner: {
    icon: Handshake,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    getName: (item) => item.partner_name,
    getSubtitle: (item) => item.partner_type?.replace(/_/g, ' ')
  },
  ExportTemplate: {
    icon: Settings,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    getName: (item) => item.template_name,
    getSubtitle: (item) => item.template_type?.replace(/_/g, ' ')
  },
  AdminData: {
    icon: BookOpen,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    getName: (item) => item.title,
    getSubtitle: (item) => item.data_type?.replace(/_/g, ' ')
  }
};

export default function ContentItemCard({ item, organization, viewMode = 'grid' }) {
  const config = CONTENT_TYPE_CONFIG[item._contentType] || CONTENT_TYPE_CONFIG.ProposalResource;
  const Icon = config.icon;
  const name = config.getName(item);
  const subtitle = config.getSubtitle(item);

  const handleDownload = () => {
    if (item.file_url) {
      window.open(item.file_url, '_blank');
    }
  };

  if (viewMode === 'list') {
    return (
      <Card className={cn("border-l-4", config.borderColor)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bgColor)}>
              <Icon className={cn("w-5 h-5", config.color)} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 mb-1 truncate">{name}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {subtitle && (
                  <span className="text-sm text-slate-600">{subtitle}</span>
                )}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex gap-1">
                    {item.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {item.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{item.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-600">
              {item.usage_count > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{item.usage_count} uses</span>
                </div>
              )}
              
              {item.last_used_date && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{format(new Date(item.last_used_date), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {item.is_favorite && (
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FolderInput className="w-4 h-4 mr-2" />
                    Move to Folder
                  </DropdownMenuItem>
                  {item.file_url && (
                    <DropdownMenuItem onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("hover:shadow-lg transition-all group border-2", config.borderColor)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", config.bgColor)}>
            <Icon className={cn("w-6 h-6", config.color)} />
          </div>
          
          <div className="flex items-center gap-1">
            {item.is_favorite && (
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FolderInput className="w-4 h-4 mr-2" />
                  Move to Folder
                </DropdownMenuItem>
                {item.file_url && (
                  <DropdownMenuItem onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2 min-h-[2.5rem]">
          {name}
        </h3>
        
        {subtitle && (
          <p className="text-sm text-slate-600 mb-3 capitalize">{subtitle}</p>
        )}

        {item.description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">
            {item.description}
          </p>
        )}

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{item.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-500 pt-3 border-t border-slate-100">
          {item.usage_count > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{item.usage_count} uses</span>
            </div>
          )}
          
          {item.last_used_date && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{format(new Date(item.last_used_date), 'MMM d')}</span>
            </div>
          )}

          {item.win_rate_when_used > 0 && (
            <Badge className="bg-green-100 text-green-700 text-xs">
              {item.win_rate_when_used}% win rate
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}