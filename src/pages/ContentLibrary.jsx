import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FolderPlus,
  Library,
  Search,
  FileText,
  Award,
  Users,
  Handshake,
  BookOpen,
  Filter,
  Grid3x3,
  List as ListIcon,
  ChevronRight,
  Folder as FolderIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import FolderSidebar from "@/components/folders/FolderSidebar";
import { useOrganization } from "@/components/layout/OrganizationContext";

const CONTENT_TYPE_CONFIG = {
  'ProposalResource': { 
    icon: FileText, 
    label: 'Resources', 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  'PastPerformance': { 
    icon: Award, 
    label: 'Past Performance', 
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  'KeyPersonnel': { 
    icon: Users, 
    label: 'Key Personnel', 
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  'TeamingPartner': { 
    icon: Handshake, 
    label: 'Teaming Partners', 
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  'AdminData': { 
    icon: BookOpen, 
    label: 'Admin Data', 
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
};

export default function ContentLibrary() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filterType, setFilterType] = useState('all');

  // Fetch content for selected folder
  const { data: folderContent = [], isLoading: isLoadingContent } = useQuery({
    queryKey: ['folder-content', selectedFolderId, organization?.id],
    queryFn: async () => {
      if (!organization?.id || !selectedFolderId) return [];
      
      const content = [];
      
      // Fetch all content types
      const [resources, pastPerf, personnel, partners, adminData] = await Promise.all([
        base44.entities.ProposalResource.filter({ 
          organization_id: organization.id,
          folder_id: selectedFolderId 
        }),
        base44.entities.PastPerformance.filter({ 
          organization_id: organization.id,
          folder_id: selectedFolderId 
        }),
        base44.entities.KeyPersonnel.filter({ 
          organization_id: organization.id,
          folder_id: selectedFolderId 
        }),
        base44.entities.TeamingPartner.filter({ 
          organization_id: organization.id,
          folder_id: selectedFolderId 
        }),
        base44.entities.AdminData.filter({ 
          folder_id: selectedFolderId 
        })
      ]);

      // Combine and tag with entity type
      content.push(...resources.map(r => ({ ...r, _entityType: 'ProposalResource' })));
      content.push(...pastPerf.map(p => ({ ...p, _entityType: 'PastPerformance' })));
      content.push(...personnel.map(p => ({ ...p, _entityType: 'KeyPersonnel' })));
      content.push(...partners.map(p => ({ ...p, _entityType: 'TeamingPartner' })));
      content.push(...adminData.map(a => ({ ...a, _entityType: 'AdminData' })));

      return content;
    },
    enabled: !!organization?.id && !!selectedFolderId,
  });

  // Filter and search content
  const filteredContent = folderContent.filter(item => {
    if (filterType !== 'all' && item._entityType !== filterType) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = item.title || item.project_name || item.full_name || item.partner_name || '';
      const description = item.description || item.project_description || '';
      return name.toLowerCase().includes(query) || description.toLowerCase().includes(query);
    }
    
    return true;
  });

  const getItemTitle = (item) => {
    return item.title || item.project_name || item.full_name || item.partner_name || 'Untitled';
  };

  const getItemDescription = (item) => {
    return item.description || item.project_description || item.bio_short || item.past_performance_summary || 'No description';
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Folder Sidebar */}
      <FolderSidebar
        organization={organization}
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
        purpose="content_library"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Library className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Content Library</h1>
                <p className="text-sm text-slate-600">
                  Centralized repository for all reusable content
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <ListIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search content by name, description..."
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All Types
              </Button>
              {Object.entries(CONTENT_TYPE_CONFIG).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={type}
                    variant={filterType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType(type)}
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Display */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedFolderId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <FolderIcon className="w-20 h-20 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Select a Folder
                </h3>
                <p className="text-slate-600">
                  Choose a folder from the sidebar to view its contents, or create a new folder to get started.
                </p>
              </div>
            </div>
          ) : isLoadingContent ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-slate-600">Loading content...</p>
              </div>
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <Library className="w-20 h-20 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {searchQuery || filterType !== 'all' ? 'No Results Found' : 'Folder is Empty'}
                </h3>
                <p className="text-slate-600">
                  {searchQuery || filterType !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Add content to this folder from various parts of the application'}
                </p>
              </div>
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
                : "space-y-3"
            )}>
              {filteredContent.map(item => {
                const config = CONTENT_TYPE_CONFIG[item._entityType] || {};
                const Icon = config.icon || FileText;

                return (
                  <Card 
                    key={`${item._entityType}-${item.id}`}
                    className={cn(
                      "border-2 transition-all hover:shadow-lg cursor-pointer",
                      config.borderColor
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          config.bgColor
                        )}>
                          <Icon className={cn("w-5 h-5", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">
                            {getItemTitle(item)}
                          </CardTitle>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {getItemDescription(item)}
                      </p>
                      
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{item.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {item.usage_count > 0 && (
                        <div className="text-xs text-slate-500 pt-2 border-t">
                          Used {item.usage_count} time{item.usage_count !== 1 ? 's' : ''}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}