
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Added Label import
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Library,
  FileText,
  Award,
  Users,
  Handshake,
  Settings,
  BookOpen,
  Eye,
  ArrowRight,
  Folder,
  Star,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const CONTENT_TYPE_FILTERS = [
  { value: 'all', label: 'All', icon: Library },
  { value: 'ProposalResource', label: 'Resources', icon: FileText },
  { value: 'PastPerformance', label: 'Projects', icon: Award },
  { value: 'KeyPersonnel', label: 'Personnel', icon: Users },
  { value: 'TeamingPartner', label: 'Partners', icon: Handshake }
];

export default function ContentLibraryBrowser({ 
  isOpen, 
  onClose, 
  organization, 
  onSelect,
  contentTypeFilter = null,
  showPreview = true
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(contentTypeFilter || 'all');
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

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
    enabled: !!organization?.id && isOpen,
  });

  // Fetch content
  const { data: resources = [] } = useQuery({
    queryKey: ['proposal-resources', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ProposalResource.filter(
        { organization_id: organization.id },
        '-usage_count'
      );
    },
    enabled: !!organization?.id && isOpen,
  });

  const { data: pastPerformance = [] } = useQuery({
    queryKey: ['past-performance', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.PastPerformance.filter(
        { organization_id: organization.id },
        '-usage_count'
      );
    },
    enabled: !!organization?.id && isOpen,
  });

  const { data: personnel = [] } = useQuery({
    queryKey: ['key-personnel', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.KeyPersonnel.filter(
        { organization_id: organization.id },
        '-usage_count'
      );
    },
    enabled: !!organization?.id && isOpen,
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['teaming-partners', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.TeamingPartner.filter(
        { organization_id: organization.id },
        '-usage_count'
      );
    },
    enabled: !!organization?.id && isOpen,
  });

  // Combine and filter content
  const allContent = useMemo(() => {
    const items = [];
    resources.forEach(item => items.push({ ...item, _contentType: 'ProposalResource', _icon: FileText }));
    pastPerformance.forEach(item => items.push({ ...item, _contentType: 'PastPerformance', _icon: Award }));
    personnel.forEach(item => items.push({ ...item, _contentType: 'KeyPersonnel', _icon: Users }));
    partners.forEach(item => items.push({ ...item, _contentType: 'TeamingPartner', _icon: Handshake }));
    return items;
  }, [resources, pastPerformance, personnel, partners]);

  const filteredContent = useMemo(() => {
    let filtered = allContent;

    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item._contentType === typeFilter);
    }

    if (selectedFolderId) {
      filtered = filtered.filter(item => item.folder_id === selectedFolderId);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const searchableFields = [
          item.title,
          item.project_name,
          item.full_name,
          item.partner_name,
          item.description,
          ...(item.tags || []),
          ...(item.keywords || [])
        ];
        return searchableFields.some(field => field && field.toLowerCase().includes(query));
      });
    }

    return filtered;
  }, [allContent, typeFilter, selectedFolderId, searchQuery]);

  const getName = (item) => {
    return item.title || item.project_name || item.full_name || item.partner_name || 'Untitled';
  };

  const getPreviewContent = (item) => {
    if (item.boilerplate_content) return item.boilerplate_content;
    if (item.project_description) return item.project_description;
    if (item.description) return item.description;
    return 'No preview available';
  };

  const handleInsert = (item) => {
    if (onSelect) {
      onSelect(item);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="w-6 h-6 text-blue-600" />
            Browse Content Library
          </DialogTitle>
          <DialogDescription>
            Select content to insert into your proposal
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Left Panel - Folders */}
          <div className="w-64 border-r pr-4 overflow-y-auto">
            <div className="space-y-1">
              <Button
                variant={!selectedFolderId ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setSelectedFolderId(null)}
              >
                <Library className="w-4 h-4 mr-2" />
                All Content
              </Button>
              
              {folders.map(folder => (
                <Button
                  key={folder.id}
                  variant={selectedFolderId === folder.id ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <Folder className="w-4 h-4 mr-2" />
                  {folder.folder_name}
                  {folder.content_count > 0 && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {folder.content_count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Middle Panel - Content List */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 space-y-3 pb-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                {CONTENT_TYPE_FILTERS.map(type => {
                  const Icon = type.icon;
                  return (
                    <Button
                      key={type.value}
                      variant={typeFilter === type.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTypeFilter(type.value)}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {type.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-3">
              {filteredContent.length === 0 ? (
                <div className="text-center py-12">
                  <Library className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-600">No content found</p>
                </div>
              ) : (
                filteredContent.map(item => {
                  const Icon = item._icon;
                  const isSelected = previewItem?.id === item.id;
                  
                  return (
                    <Card
                      key={`${item._contentType}-${item.id}`}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        isSelected && "ring-2 ring-blue-500 bg-blue-50"
                      )}
                      onClick={() => setPreviewItem(item)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <Icon className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-slate-900 mb-1 truncate">
                                {getName(item)}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {item._contentType.replace(/([A-Z])/g, ' $1').trim()}
                                </Badge>
                                {item.usage_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    {item.usage_count}
                                  </span>
                                )}
                              </div>
                              {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.tags.slice(0, 2).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInsert(item);
                            }}
                            className="ml-2"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel - Preview */}
          {showPreview && (
            <div className="w-96 border-l pl-4 overflow-y-auto">
              {previewItem ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">
                      {getName(previewItem)}
                    </h3>
                    <Badge className="mb-3">
                      {previewItem._contentType.replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                  </div>

                  {previewItem.description && (
                    <div>
                      <Label className="text-xs text-slate-600">Description</Label>
                      <p className="text-sm text-slate-900 mt-1">{previewItem.description}</p>
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <Label className="text-xs text-slate-600 mb-2 block">Preview</Label>
                    <div className="text-sm text-slate-900 whitespace-pre-wrap">
                      {getPreviewContent(previewItem)}
                    </div>
                  </div>

                  {previewItem.tags && previewItem.tags.length > 0 && (
                    <div>
                      <Label className="text-xs text-slate-600 mb-2 block">Tags</Label>
                      <div className="flex flex-wrap gap-1">
                        {previewItem.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {previewItem.usage_count > 0 && (
                      <div>
                        <span className="text-slate-600">Used</span>
                        <p className="font-semibold text-slate-900">{previewItem.usage_count} times</p>
                      </div>
                    )}
                    {previewItem.last_used_date && (
                      <div>
                        <span className="text-slate-600">Last Used</span>
                        <p className="font-semibold text-slate-900">
                          {format(new Date(previewItem.last_used_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handleInsert(previewItem)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Insert This Content
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Eye className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-600">
                    Select an item to preview
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
