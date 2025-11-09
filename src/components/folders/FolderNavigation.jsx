import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Star,
  Layers,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function FolderNavigation({ 
  organization, 
  selectedFolderId, 
  onSelectFolder,
  showBoardCounts = true 
}) {
  const [expandedFolders, setExpandedFolders] = useState(new Set());

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

  const { data: boards = [] } = useQuery({
    queryKey: ['boards-count', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.KanbanConfig.filter(
        { organization_id: organization.id }
      );
    },
    enabled: !!organization?.id && showBoardCounts,
  });

  // Build folder tree
  const folderTree = useMemo(() => {
    const buildTree = (parentId = null) => {
      return folders
        .filter(f => f.parent_folder_id === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(folder => ({
          ...folder,
          children: buildTree(folder.id),
          boardCount: showBoardCounts ? boards.filter(b => b.folder_id === folder.id).length : 0
        }));
    };
    return buildTree(null);
  }, [folders, boards, showBoardCounts]);

  const toggleExpanded = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderFolder = (folder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children.length > 0;

    return (
      <div key={folder.id}>
        <Button
          variant={isSelected ? "default" : "ghost"}
          className={cn(
            "w-full justify-start gap-2 mb-1",
            isSelected && "bg-blue-50 text-blue-700 hover:bg-blue-100"
          )}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
          onClick={() => onSelectFolder(folder.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(folder.id);
              }}
              className="p-0.5 hover:bg-white/20 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-4" />}
          
          {isExpanded ? (
            <FolderOpen className="w-4 h-4" />
          ) : (
            <Folder className="w-4 h-4" />
          )}
          
          <span className="flex-1 text-left truncate">{folder.folder_name}</span>
          
          {folder.is_favorite && (
            <Star className="w-3 h-3 text-yellow-600 fill-yellow-600" />
          )}
          
          {showBoardCounts && folder.boardCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {folder.boardCount}
            </Badge>
          )}
        </Button>

        {isExpanded && hasChildren && (
          <div>
            {folder.children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const unorganizedCount = showBoardCounts ? boards.filter(b => !b.folder_id).length : 0;

  return (
    <div className="space-y-2">
      <Button
        variant={selectedFolderId === null ? "default" : "ghost"}
        className={cn(
          "w-full justify-start gap-2",
          selectedFolderId === null && "bg-blue-50 text-blue-700 hover:bg-blue-100"
        )}
        onClick={() => onSelectFolder(null)}
      >
        <Home className="w-4 h-4" />
        <span className="flex-1 text-left">All Boards</span>
        {showBoardCounts && (
          <Badge variant="secondary" className="text-xs">
            {boards.length}
          </Badge>
        )}
      </Button>

      {folderTree.map(folder => renderFolder(folder, 0))}

      {unorganizedCount > 0 && (
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-slate-500"
          onClick={() => onSelectFolder('unorganized')}
        >
          <Layers className="w-4 h-4" />
          <span className="flex-1 text-left">Unorganized</span>
          <Badge variant="outline" className="text-xs">
            {unorganizedCount}
          </Badge>
        </Button>
      )}
    </div>
  );
}