
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Folder as FolderIcon,
  Eye,
  BarChart3,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import FolderSidebar from "@/components/folders/FolderSidebar";
import { useOrganization } from "@/components/layout/OrganizationContext";
import LibraryBulkOperations from "@/components/content/LibraryBulkOperations";
import LibraryItemDetailView from "@/components/content/LibraryItemDetailView";

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
  const [selectedItems, setSelectedItems] = useState([]);
  const [detailViewItem, setDetailViewItem] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Fetch content for selected folder
  const { data: folderContent = [], isLoading: isLoadingContent, refetch } = useQuery({
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

  // Calculate library stats
  const libraryStats = React.useMemo(() => {
    const totalWords = folderContent.reduce((sum, item) => sum + (item.word_count || 0), 0);
    const totalUsage = folderContent.reduce((sum, item) => sum + (item.usage_count || 0), 0);
    const favorites = folderContent.filter(item => item.is_favorite).length;
    
    return {
      totalItems: folderContent.length,
      totalWords,
      totalUsage,
      favorites
    };
  }, [folderContent]);

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

  const toggleItemSelection = (item) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id && i._entityType === item._entityType);
      if (isSelected) {
        return prev.filter(i => !(i.id === item.id && i._entityType === item._entityType));
      } else {
        return [...prev, item];
      }
    });
  };

  const isItemSelected = (item) => {
    return selectedItems.some(i => i.id === item.id && i._entityType === item._entityType);
  };

  const handleItemClick = (item, e) => {
    // If clicking checkbox, handle selection
    if (e.target.type === 'checkbox') {
      toggleItemSelection(item);
    } else {
      // Otherwise open detail view
      setDetailViewItem(item);
      setShowDetailView(true);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Folder Sidebar */}
      <FolderSidebar
        organization={organization}
        selectedFolderId={selectedFolderId}
        onSelectFolder={(folderId) => {
          setSelectedFolderId(folderId);
          setSelectedItems([]); // Clear selections when changing folders
        }}
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
                variant={showStats ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowStats(!showStats)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Stats
              </Button>
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

          {/* Stats Panel */}
          {showStats && selectedFolderId && (
            <div className="grid grid-cols-4 gap-3 mb-4 p-4 bg-slate-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-1">Total Items</p>
                <p className="text-2xl font-bold text-slate-900">{libraryStats.totalItems}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-1">Total Words</p>
                <p className="text-2xl font-bold text-slate-900">
                  {(libraryStats.totalWords / 1000).toFixed(1)}k
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-1">Total Uses</p>
                <p className="text-2xl font-bold text-slate-900">{libraryStats.totalUsage}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-1">Favorites</p>
                <p className="text-2xl font-bold text-slate-900">{libraryStats.favorites}</p>
              </div>
            </div>
          )}

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
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              All
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
                  <span className="hidden lg:inline">{config.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Selection indicator */}
          {selectedItems.length > 0 && (
            <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <Checkbox checked={true} />
              <span className="text-sm font-medium text-blue-900">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </span>
            </div>
          )}
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
                    : 'Add content to this folder using "Promote to Library" throughout the app'}
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
                const isSelected = isItemSelected(item);

                return (
                  <Card 
                    key={`${item._entityType}-${item.id}`}
                    className={cn(
                      "border-2 transition-all hover:shadow-lg cursor-pointer group relative",
                      config.borderColor,
                      isSelected && "ring-4 ring-blue-300 border-blue-500"
                    )}
                    onClick={(e) => handleItemClick(item, e)}
                  >
                    {/* Selection Checkbox */}
                    <div className="absolute top-3 right-3 z-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItemSelection(item)}
                        className="bg-white"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3 pr-8">
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

                      <div className="flex items-center justify-between pt-2 border-t text-xs text-slate-500">
                        {item.usage_count > 0 && (
                          <span>Used {item.usage_count}x</span>
                        )}
                        {item.word_count > 0 && (
                          <span>{item.word_count} words</span>
                        )}
                      </div>

                      {/* Hover action */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailViewItem(item);
                            setShowDetailView(true);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      <LibraryBulkOperations
        selectedItems={selectedItems}
        onClearSelection={() => setSelectedItems([])}
        organization={organization}
        currentFolderId={selectedFolderId}
      />

      {/* Detail View Dialog */}
      <LibraryItemDetailView
        item={detailViewItem}
        isOpen={showDetailView}
        onClose={() => {
          setShowDetailView(false);
          setDetailViewItem(null);
        }}
        onItemUpdated={() => refetch()}
      />
    </div>
  );
}
