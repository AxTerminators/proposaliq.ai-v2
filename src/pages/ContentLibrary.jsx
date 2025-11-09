
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Filter,
  FolderPlus,
  Library,
  FileText,
  Award,
  Users,
  Handshake,
  BookOpen,
  Settings,
  Star,
  Clock,
  TrendingUp,
  LayoutGrid,
  List,
  Table,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganization } from "../components/layout/OrganizationContext";
import FolderTreeNavigation from "../components/contentLibrary/FolderTreeNavigation";
import ContentItemCard from "../components/contentLibrary/ContentItemCard";
import ContentTableView from "../components/contentLibrary/ContentTableView";
import AddContentDialog from "../components/contentLibrary/AddContentDialog";
import AddFolderDialog from "../components/contentLibrary/AddFolderDialog";
import ContentFilterPanel from "../components/contentLibrary/ContentFilterPanel";
import ContentStats from "../components/contentLibrary/ContentStats";

const CONTENT_TYPES = [
  { value: 'all', label: 'All Content', icon: Library, color: 'text-slate-600' },
  { value: 'ProposalResource', label: 'Resources', icon: FileText, color: 'text-blue-600' },
  { value: 'PastPerformance', label: 'Past Performance', icon: Award, color: 'text-green-600' },
  { value: 'KeyPersonnel', label: 'Key Personnel', icon: Users, color: 'text-purple-600' },
  { value: 'TeamingPartner', label: 'Teaming Partners', icon: Handshake, color: 'text-orange-600' },
  { value: 'ExportTemplate', label: 'Templates', icon: Settings, color: 'text-indigo-600' },
  { value: 'AdminData', label: 'Guidelines', icon: BookOpen, color: 'text-cyan-600' }
];

export default function ContentLibrary() {
  const queryClient = useQueryClient();
  const { organization, user } = useOrganization();
  
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContentType, setSelectedContentType] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showAddContent, setShowAddContent] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ['folders', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Folder.filter(
        { organization_id: organization.id },
        'order'
      );
    },
    enabled: !!organization?.id,
  });

  // Fetch all content entities
  const { data: resources = [] } = useQuery({
    queryKey: ['proposal-resources', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ProposalResource.filter(
        { organization_id: organization.id },
        '-last_used_date'
      );
    },
    enabled: !!organization?.id,
  });

  const { data: pastPerformance = [] } = useQuery({
    queryKey: ['past-performance', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.PastPerformance.filter(
        { organization_id: organization.id },
        '-last_used_date'
      );
    },
    enabled: !!organization?.id,
  });

  const { data: personnel = [] } = useQuery({
    queryKey: ['key-personnel', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.KeyPersonnel.filter(
        { organization_id: organization.id },
        '-last_used_date'
      );
    },
    enabled: !!organization?.id,
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['teaming-partners', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.TeamingPartner.filter(
        { organization_id: organization.id },
        '-last_collaboration_date'
      );
    },
    enabled: !!organization?.id,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['export-templates', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ExportTemplate.filter(
        { organization_id: organization.id },
        '-usage_count'
      );
    },
    enabled: !!organization?.id,
  });

  const { data: adminData = [] } = useQuery({
    queryKey: ['admin-data'],
    queryFn: async () => {
      return base44.entities.AdminData.filter({}, '-created_date');
    },
  });

  // Combine all content items with type metadata
  const allContentItems = useMemo(() => {
    const items = [];
    
    resources.forEach(item => items.push({ ...item, _contentType: 'ProposalResource', _icon: FileText }));
    pastPerformance.forEach(item => items.push({ ...item, _contentType: 'PastPerformance', _icon: Award }));
    personnel.forEach(item => items.push({ ...item, _contentType: 'KeyPersonnel', _icon: Users }));
    partners.forEach(item => items.push({ ...item, _contentType: 'TeamingPartner', _icon: Handshake }));
    templates.forEach(item => items.push({ ...item, _contentType: 'ExportTemplate', _icon: Settings }));
    adminData.forEach(item => items.push({ ...item, _contentType: 'AdminData', _icon: BookOpen }));
    
    return items;
  }, [resources, pastPerformance, personnel, partners, templates, adminData]);

  // Filter content items
  const filteredContent = useMemo(() => {
    let filtered = allContentItems;

    // Filter by folder
    if (selectedFolderId === 'unorganized') {
      filtered = filtered.filter(item => !item.folder_id);
    } else if (selectedFolderId) {
      filtered = filtered.filter(item => item.folder_id === selectedFolderId);
    }

    // Filter by content type
    if (selectedContentType !== 'all') {
      filtered = filtered.filter(item => item._contentType === selectedContentType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const searchableFields = [
          item.title,
          item.project_name,
          item.full_name,
          item.partner_name,
          item.template_name,
          item.description,
          item.file_name,
          ...(item.tags || []),
          ...(item.keywords || [])
        ];
        
        return searchableFields.some(field => 
          field && field.toLowerCase().includes(query)
        );
      });
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(item => {
        const itemTags = item.tags || [];
        return selectedTags.every(tag => itemTags.includes(tag));
      });
    }

    return filtered;
  }, [allContentItems, selectedFolderId, selectedContentType, searchQuery, selectedTags]);

  // Get all unique tags from content
  const allTags = useMemo(() => {
    const tagSet = new Set();
    allContentItems.forEach(item => {
      (item.tags || []).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [allContentItems]);

  // Get selected folder
  const selectedFolder = useMemo(() => {
    if (!selectedFolderId || selectedFolderId === 'unorganized') return null;
    return folders.find(f => f.id === selectedFolderId);
  }, [selectedFolderId, folders]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedContentType !== 'all') count++;
    if (selectedTags.length > 0) count += selectedTags.length;
    return count;
  }, [searchQuery, selectedContentType, selectedTags]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedContentType('all');
    setSelectedTags([]);
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Library className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Content Library</h1>
              <p className="text-slate-600">Organize and manage all your reusable content</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddFolder(true)}
              variant="outline"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
            <Button
              onClick={() => setShowAddContent(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Content
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search across all content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          <div className="flex gap-1 border rounded-lg p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <Table className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <ContentFilterPanel
            contentTypes={CONTENT_TYPES}
            selectedContentType={selectedContentType}
            onContentTypeChange={setSelectedContentType}
            allTags={allTags}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            onClearAll={clearAllFilters}
          />
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Folder Navigation */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900 mb-2">Folders</h2>
            <ContentStats 
              totalItems={allContentItems.length}
              filteredItems={filteredContent.length}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <FolderTreeNavigation
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              organization={organization}
              allContentItems={allContentItems}
            />
          </div>
        </div>

        {/* Main Content Display */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFolderId(null)}
                className={cn(!selectedFolderId && "text-blue-600 font-semibold")}
              >
                All Content
              </Button>
              {selectedFolder && (
                <>
                  <span>/</span>
                  <span className="text-blue-600 font-semibold">{selectedFolder.folder_name}</span>
                </>
              )}
              {selectedFolderId === 'unorganized' && (
                <>
                  <span>/</span>
                  <span className="text-amber-600 font-semibold">Unorganized</span>
                </>
              )}
            </div>
          </div>

          {/* Content Type Tabs */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {CONTENT_TYPES.map(type => {
              const Icon = type.icon;
              const count = selectedContentType === type.value 
                ? filteredContent.length
                : allContentItems.filter(item => type.value === 'all' || item._contentType === type.value).length;
              
              return (
                <Button
                  key={type.value}
                  variant={selectedContentType === type.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedContentType(type.value)}
                  className="gap-2"
                >
                  <Icon className={cn("w-4 h-4", selectedContentType !== type.value && type.color)} />
                  {type.label}
                  <Badge variant={selectedContentType === type.value ? "secondary" : "outline"}>
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>

          {/* Results Count and Actions */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">
              Showing <strong>{filteredContent.length}</strong> of <strong>{allContentItems.length}</strong> items
              {activeFiltersCount > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={clearAllFilters}
                  className="ml-2"
                >
                  Clear filters
                </Button>
              )}
            </p>
          </div>

          {/* Content Display */}
          {filteredContent.length === 0 ? (
            <Card className="border-2 border-dashed border-slate-300">
              <CardContent className="p-12 text-center">
                <Library className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {searchQuery || activeFiltersCount > 0 ? 'No content found' : 'No content yet'}
                </h3>
                <p className="text-slate-600 mb-4">
                  {searchQuery || activeFiltersCount > 0 
                    ? 'Try adjusting your search or filters'
                    : 'Start building your content library by adding resources, past performance, or personnel'}
                </p>
                {!searchQuery && activeFiltersCount === 0 && (
                  <Button onClick={() => setShowAddContent(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Content
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredContent.map(item => (
                    <ContentItemCard
                      key={`${item._contentType}-${item.id}`}
                      item={item}
                      organization={organization}
                    />
                  ))}
                </div>
              )}

              {viewMode === 'list' && (
                <div className="space-y-2">
                  {filteredContent.map(item => (
                    <ContentItemCard
                      key={`${item._contentType}-${item.id}`}
                      item={item}
                      organization={organization}
                      viewMode="list"
                    />
                  ))}
                </div>
              )}

              {viewMode === 'table' && (
                <ContentTableView
                  items={filteredContent}
                  organization={organization}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AddContentDialog
        isOpen={showAddContent}
        onClose={() => setShowAddContent(false)}
        organization={organization}
        selectedFolderId={selectedFolderId}
      />

      <AddFolderDialog
        isOpen={showAddFolder}
        onClose={() => setShowAddFolder(false)}
        organization={organization}
        parentFolderId={selectedFolderId === 'unorganized' ? null : selectedFolderId}
      />
    </div>
  );
}
