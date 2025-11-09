import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Layers, Star, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BOARD_TYPE_ICONS = {
  'master': '⭐',
  'rfp': '📋',
  'rfi': '📝',
  'sbir': '🔬',
  'gsa': '🏛️',
  'idiq': '📑',
  'state_local': '🏢',
  'rfp_15_column': '🎯',
  'template_workspace': '📂',
  'custom_proposal': '🎨',
  'custom_project': '🛠️',
  'custom': '📊'
};

export default function BoardSwitcher({ 
  isOpen, 
  onClose, 
  boards, 
  currentBoardId, 
  onSelectBoard,
  proposals = [] 
}) {
  const getProposalCount = (board) => {
    if (board.is_master_board) {
      return proposals.length;
    }

    if (board.board_type === 'rfp_15_column') {
      return proposals.filter(p => p.proposal_type_category === 'RFP_15_COLUMN').length;
    }

    if (board.applies_to_proposal_types && board.applies_to_proposal_types.length > 0) {
      return proposals.filter(p => 
        board.applies_to_proposal_types.includes(p.proposal_type_category)
      ).length;
    }

    return 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Switch Board
          </DialogTitle>
          <DialogDescription>
            Select which board you want to view
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 py-4">
          {boards.map(board => {
            const proposalCount = getProposalCount(board);
            const icon = BOARD_TYPE_ICONS[board.board_type] || '📊';
            const isSelected = board.id === currentBoardId;
            const columnCount = board.columns?.filter(c => !c.is_terminal).length || 0;

            return (
              <Card
                key={board.id}
                className={cn(
                  "cursor-pointer transition-all border-2",
                  isSelected 
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" 
                    : "border-slate-200 hover:border-blue-300 hover:shadow-lg",
                  board.is_master_board && "border-amber-300"
                )}
                onClick={() => {
                  onSelectBoard(board.id);
                  onClose();
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{icon}</div>
                      <div>
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                          {board.board_name}
                          {board.is_master_board && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          )}
                        </h3>
                        <Badge variant="outline" className="mt-1 text-xs capitalize">
                          {board.board_type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-slate-600">Proposals</p>
                      <p className="text-xl font-bold text-slate-900">{proposalCount}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-slate-600">Columns</p>
                      <p className="text-xl font-bold text-slate-900">{columnCount}</p>
                    </div>
                  </div>

                  {board.applies_to_proposal_types && board.applies_to_proposal_types.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {board.applies_to_proposal_types.map(type => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}