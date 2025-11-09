import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Library,
  Search,
  Copy,
  Eye,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  FileText,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Quick insert dialog for browsing and inserting content from Content Library
 * Used in Phase 6 and other content editing contexts
 */
export default function ContentLibraryQuickInsert({ 
  isOpen, 
  onClose, 
  organization,
  onInsert,
  filterByCategory = null
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [previewContent, setPreviewContent] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ['folders-content-library', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Folder.filter({
        organization_id: organization.id,
        purpose: 'content_library'
      }, 'folder_name');
    },
    enabled: !!organization?.id && isOpen,
  });

  // Fetch library content
  const { data: libraryContent = [], isLoading } = useQuery({
    queryKey: ['library-quick-insert', organization?.id, selectedFolderId, filterByCategory],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      let query = {
        organization_id: organization.id,
        resource_type: 'boilerplate_text'
      };

      if (selectedFolderId) {
        query.folder_id = selectedFolderId;
      }

      if (filterByCategory) {
        query.content_category = filterByCategory;
      }

      return base44.entities.ProposalResource.filter(query, '-usage_count');
    },
    enabled: !!organization?.id && isOpen,
  });

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const buildFolderTree = (parentId = null) => {
    return folders
      .filter(f => f.parent_folder_id === parentId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  };

  const renderFolder = (folder, level = 0) => {
    const hasChildren = folders.some(f => f.parent_folder_id === folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const children = buildFolderTree(folder.id);

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm",
            isSelected 
              ? "bg-blue-100 text-blue-900 font-medium" 
              : "hover:bg-slate-100 text-slate-700",
            level > 0 && "ml-4"
          )}
          onClick={() => setSelectedFolderId(isSelected ? null : folder.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0.5 hover:bg-slate-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}
          
          <span className="text-base">{folder.icon || '📁'}</span>
          <span className="flex-1 truncate">{folder.folder_name}</span>
        </div>

        {isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredContent = libraryContent.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.tags?.some(t => t.toLowerCase().includes(query))
    );
  });

  const handleInsert = (content) => {
    if (onInsert) {
      onInsert(content.boilerplate_content);
    }
    onClose();
  };

  const handlePreview = (content) => {
    setPreviewContent(content);
    setShowPreview(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="w-5 h-5 text-blue-600" />
              Insert from Content Library
            </DialogTitle>
            <DialogDescription>
              Browse your library and insert reusable content
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 flex-1 min-h-0">
            {/* Folder Sidebar */}
            <div className="w-64 border-r pr-4 overflow-y-auto">
              <div className="mb-3">
                <p className="text-sm font-semibold text-slate-700 mb-2">Folders</p>
                <Button
                  variant={selectedFolderId === null ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSelectedFolderId(null)}
                >
                  <Library className="w-4 h-4 mr-2" />
                  All Content
                </Button>
              </div>
              <div className="space-y-1">
                {buildFolderTree().map(folder => renderFolder(folder))}
              </div>
            </div>

            {/* Content List */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search library content..."
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
                    <p className="text-slate-600">Loading library...</p>
                  </div>
                ) : filteredContent.length === 0 ? (
                  <div className="text-center py-12">
                    <Library className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {searchQuery ? 'No Results Found' : 'No Content in This Folder'}
                    </h3>
                    <p className="text-slate-600 text-sm">
                      {searchQuery 
                        ? 'Try a different search term' 
                        : 'Promote content from proposals to build your library'}
                    </p>
                  </div>
                ) : (
                  filteredContent.map(item => (
                    <Card key={item.id} className="border-2 hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <h4 className="font-semibold text-slate-900 truncate">
                                {item.title}
                              </h4>
                              {item.is_favorite && (
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                              {item.description || 'No description'}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs capitalize">
                                {item.content_category?.replace('_', ' ')}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {item.word_count} words
                              </Badge>
                              {item.usage_count > 0 && (
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  Used {item.usage_count}x
                                </Badge>
                              )}
                            </div>
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.tags.slice(0, 4).map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreview(item)}
                            className="flex-1"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleInsert(item)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Insert
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              {previewContent?.title}
            </DialogTitle>
            <DialogDescription>
              {previewContent?.description || 'Content preview'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="capitalize">
                {previewContent?.content_category?.replace('_', ' ')}
              </Badge>
              <Badge variant="secondary">
                {previewContent?.word_count} words
              </Badge>
              {previewContent?.usage_count > 0 && (
                <Badge className="bg-green-100 text-green-700">
                  Used {previewContent.usage_count}x
                </Badge>
              )}
            </div>

            <div className="border rounded-lg p-6 bg-white prose prose-sm max-w-none max-h-[60vh] overflow-y-auto">
              <div 
                dangerouslySetInnerHTML={{ __html: previewContent?.boilerplate_content }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewContent) {
                  handleInsert(previewContent);
                  setShowPreview(false);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Copy className="w-4 h-4 mr-2" />
              Insert This Content
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}