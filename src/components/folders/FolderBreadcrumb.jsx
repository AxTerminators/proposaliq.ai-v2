import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Home, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FolderBreadcrumb({ 
  folders, 
  currentFolderId, 
  onNavigate 
}) {
  // Build breadcrumb path
  const breadcrumbPath = useMemo(() => {
    if (!currentFolderId) return [];
    
    const path = [];
    let currentId = currentFolderId;
    const visited = new Set();
    
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const folder = folders.find(f => f.id === currentId);
      if (!folder) break;
      
      path.unshift(folder);
      currentId = folder.parent_folder_id;
    }
    
    return path;
  }, [folders, currentFolderId]);

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(null)}
        className={cn(
          "gap-2 h-8",
          !currentFolderId && "bg-blue-50 text-blue-700"
        )}
      >
        <Home className="w-4 h-4" />
        All Boards
      </Button>

      {breadcrumbPath.map((folder, index) => (
        <React.Fragment key={folder.id}>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(folder.id)}
            className={cn(
              "gap-2 h-8",
              index === breadcrumbPath.length - 1 && "bg-blue-50 text-blue-700"
            )}
          >
            <Folder className="w-4 h-4" />
            {folder.folder_name}
          </Button>
        </React.Fragment>
      ))}
    </div>
  );
}