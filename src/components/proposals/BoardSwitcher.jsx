import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Layers, 
  Star, 
  FileText, 
  Lightbulb, 
  Rocket, 
  Building2, 
  FileCheck,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

const BOARD_TYPE_ICONS = {
  master: { icon: Star, color: "text-amber-500" },
  rfp: { icon: FileText, color: "text-blue-500" },
  rfi: { icon: Lightbulb, color: "text-purple-500" },
  sbir: { icon: Rocket, color: "text-green-500" },
  gsa: { icon: Building2, color: "text-indigo-500" },
  idiq: { icon: FileCheck, color: "text-cyan-500" },
  state_local: { icon: MapPin, color: "text-orange-500" },
  custom: { icon: Layers, color: "text-slate-500" }
};

export default function BoardSwitcher({ boards, selectedBoardId, onBoardChange }) {
  if (!boards || boards.length === 0) {
    return null;
  }

  // Don't show switcher if only one board
  if (boards.length === 1) {
    return null;
  }

  const selectedBoard = boards.find(b => b.id === selectedBoardId);
  const iconConfig = selectedBoard?.board_type 
    ? BOARD_TYPE_ICONS[selectedBoard.board_type] 
    : BOARD_TYPE_ICONS.custom;

  const Icon = iconConfig?.icon || Layers;

  return (
    <div className="flex items-center gap-3 bg-white border-2 border-slate-200 rounded-lg px-4 py-2 shadow-sm">
      <Icon className={cn("w-5 h-5", iconConfig?.color || "text-slate-500")} />
      <div className="border-l h-6 border-slate-300" />
      <Select value={selectedBoardId || ""} onValueChange={onBoardChange}>
        <SelectTrigger className="w-64 border-none shadow-none focus:ring-0">
          <SelectValue placeholder="Select board..." />
        </SelectTrigger>
        <SelectContent>
          {boards.map(board => {
            const boardIconConfig = BOARD_TYPE_ICONS[board.board_type] || BOARD_TYPE_ICONS.custom;
            const BoardIcon = boardIconConfig.icon;
            
            return (
              <SelectItem key={board.id} value={board.id}>
                <div className="flex items-center gap-3">
                  <BoardIcon className={cn("w-4 h-4", boardIconConfig.color)} />
                  <span className="font-medium">{board.board_name}</span>
                  {board.is_master_board && (
                    <Badge className="bg-amber-100 text-amber-700 text-xs">Master</Badge>
                  )}
                  {board.applies_to_proposal_types?.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {board.applies_to_proposal_types.join(", ")}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <Badge variant="secondary" className="text-xs">
        {boards.length} board{boards.length > 1 ? 's' : ''}
      </Badge>
    </div>
  );
}