import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Star,
  MoreVertical,
  Edit,
  Trash2,
  FolderPlus,
  Archive
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function FolderTreeNavigation({ 
  folders, 
  selectedFolderId, 
  onSelectFolder, 
  organization 
}) {
  const [expandedFolderIds, setExpandedFolderIds] = useState(new Set());

  // Build folder tree structure
  const folderTree = useMemo(() => {
    const rootFolders = folders.filter(f => !f.parent_folder_id);
    
    const buildTree = (parentId) => {
      return folders
        .filter(f => f.parent_folder_id === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    };

    return rootFolders.map(root => ({
      ...root,
      children: buildTree(root.id)
    }));
  }, [folders]);

  const toggleExpand = (folderId) => {
    setExpandedFolderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const renderFolder = (folder, level = 0) => {
    const isSelected = selectedFolderId === folder.id;
    const isExpanded = expandedFolderIds.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-2 rounded-lg mb-1 cursor-pointer group transition-colors",
            isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50",
            "relative"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="p-0.5 hover:bg-slate-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          
          <div
            onClick={() => onSelectFolder(folder.id)}
            className="flex-1 flex items-center gap-2"
          >
            {isSelected || isExpanded ? (
              <FolderOpen className={cn("w-4 h-4", isSelected ? "text-blue-600" : "text-slate-600")} />
            ) : (
              <Folder className="w-4 h-4 text-slate-600" />
            )}
            
            <span className={cn(
              "text-sm font-medium truncate",
              isSelected ? "text-blue-700" : "text-slate-700"
            )}>
              {folder.folder_name}
            </span>
            
            {folder.is_favorite && (
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            )}
            
            {folder.content_count > 0 && (
              <Badge variant="secondary" className="text-xs ml-auto">
                {folder.content_count}
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FolderPlus className="w-4 h-4 mr-2" />
                Add Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {folder.children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {/* All Content */}
      <div
        onClick={() => onSelectFolder(null)}
        className={cn(
          "flex items-center gap-2 px-2 py-2 rounded-lg mb-2 cursor-pointer hover:bg-slate-50",
          !selectedFolderId && "bg-blue-50 text-blue-700"
        )}
      >
        <Library className="w-4 h-4" />
        <span className="text-sm font-medium">All Content</span>
        <Badge variant="secondary" className="text-xs ml-auto">
          {allContentItems.length}
        </Badge>
      </div>

      {/* Unorganized Items */}
      <div
        onClick={() => onSelectFolder('unorganized')}
        className={cn(
          "flex items-center gap-2 px-2 py-2 rounded-lg mb-4 cursor-pointer hover:bg-slate-50",
          selectedFolderId === 'unorganized' && "bg-amber-50 text-amber-700"
        )}
      >
        <Folder className="w-4 h-4" />
        <span className="text-sm font-medium">Unorganized</span>
        <Badge variant="outline" className="text-xs ml-auto">
          {allContentItems.filter(item => !item.folder_id).length}
        </Badge>
      </div>

      {/* Folder Tree */}
      <div className="border-t border-slate-200 pt-4">
        {folderTree.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No folders yet
          </p>
        ) : (
          folderTree.map(folder => renderFolder(folder))
        )}
      </div>
    </div>
  );
}