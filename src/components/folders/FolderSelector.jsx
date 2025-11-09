import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Folder, FolderOpen, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function FolderSelector({ 
  organization, 
  value, 
  onChange, 
  filterType = null, // 'proposal_boards', 'project_boards', or null for all
  placeholder = "Select folder...",
  allowNone = true,
  className
}) {
  const { data: folders = [] } = useQuery({
    queryKey: ['folders', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Folder.filter(
        { organization_id: organization.id },
        'folder_name'
      );
    },
    enabled: !!organization?.id,
  });

  // Filter folders by type if needed
  const filteredFolders = useMemo(() => {
    if (!filterType) return folders;
    return folders.filter(f => 
      f.folder_type === 'mixed' || f.folder_type === filterType
    );
  }, [folders, filterType]);

  // Build hierarchical display names
  const foldersWithPaths = useMemo(() => {
    const buildPath = (folderId, visited = new Set()) => {
      if (visited.has(folderId)) return ''; // Prevent infinite loops
      visited.add(folderId);
      
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return '';
      
      if (!folder.parent_folder_id) {
        return folder.folder_name;
      }
      
      const parentPath = buildPath(folder.parent_folder_id, visited);
      return parentPath ? `${parentPath} / ${folder.folder_name}` : folder.folder_name;
    };

    return filteredFolders.map(folder => ({
      ...folder,
      fullPath: buildPath(folder.id)
    }));
  }, [filteredFolders, folders]);

  return (
    <Select value={value || 'none'} onValueChange={(val) => onChange(val === 'none' ? null : val)}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && (
          <SelectItem value="none">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <span>No folder (root level)</span>
            </div>
          </SelectItem>
        )}
        {foldersWithPaths.map(folder => (
          <SelectItem key={folder.id} value={folder.id}>
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-blue-600" />
              <span>{folder.fullPath}</span>
              {folder.board_count > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {folder.board_count}
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}