import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Award,
  Users,
  Handshake,
  Settings,
  BookOpen,
  Download,
  Eye,
  Star
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  ProposalResource: FileText,
  PastPerformance: Award,
  KeyPersonnel: Users,
  TeamingPartner: Handshake,
  ExportTemplate: Settings,
  AdminData: BookOpen
};

const COLOR_MAP = {
  ProposalResource: 'text-blue-600',
  PastPerformance: 'text-green-600',
  KeyPersonnel: 'text-purple-600',
  TeamingPartner: 'text-orange-600',
  ExportTemplate: 'text-indigo-600',
  AdminData: 'text-cyan-600'
};

export default function ContentTableView({ items, organization }) {
  const getName = (item) => {
    return item.title || item.project_name || item.full_name || item.partner_name || item.template_name || 'Untitled';
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => {
            const Icon = ICON_MAP[item._contentType] || FileText;
            const color = COLOR_MAP[item._contentType] || 'text-slate-600';
            
            return (
              <TableRow key={`${item._contentType}-${item.id}`} className="hover:bg-slate-50">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", color)} />
                    <span className="text-xs text-slate-600">
                      {item._contentType.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.is_favorite && (
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    )}
                    <span className="font-medium text-slate-900">{getName(item)}</span>
                  </div>
                </TableCell>
                
                <TableCell>
                  {item.tags && item.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {item.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">No tags</span>
                  )}
                </TableCell>
                
                <TableCell>
                  {item.usage_count > 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      {item.usage_count} uses
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-400">Never used</span>
                  )}
                </TableCell>
                
                <TableCell>
                  {item.last_used_date ? (
                    <span className="text-xs text-slate-600">
                      {format(new Date(item.last_used_date), 'MMM d, yyyy')}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {item.file_url && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => window.open(item.file_url, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}