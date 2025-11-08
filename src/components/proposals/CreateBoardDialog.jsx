import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const BOARD_TYPES = [
  {
    type: 'rfp',
    icon: '📋',
    name: 'RFP Board',
    description: 'Full-featured board for Request for Proposals',
    stages: '10 stages with detailed workflow',
    color: 'from-blue-500 to-blue-600'
  },
  {
    type: 'sbir',
    icon: '🔬',
    name: 'SBIR/STTR Board',
    description: 'Research-focused proposals',
    stages: '6 stages optimized for R&D',
    color: 'from-purple-500 to-purple-600'
  },
  {
    type: 'gsa',
    icon: '🏛️',
    name: 'GSA Schedule Board',
    description: 'GSA contract vehicle submissions',
    stages: '4 stages for schedule applications',
    color: 'from-amber-500 to-amber-600'
  },
  {
    type: 'rfi',
    icon: '❓',
    name: 'RFI Board',
    description: 'Request for Information responses',
    stages: '4 stages for info gathering',
    color: 'from-cyan-500 to-cyan-600'
  },
  {
    type: 'idiq',
    icon: '📑',
    name: 'IDIQ/BPA Board',
    description: 'Indefinite delivery contracts',
    stages: '4 stages for vehicle setup',
    color: 'from-green-500 to-green-600'
  },
  {
    type: 'state_local',
    icon: '🏢',
    name: 'State/Local Board',
    description: 'Non-federal government contracts',
    stages: '4 stages for local gov',
    color: 'from-rose-500 to-rose-600'
  }
];

export default function CreateBoardDialog({ isOpen, onClose, organization, onBoardCreated }) {
  const [creating, setCreating] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  const handleCreateBoard = async (boardType) => {
    if (!organization?.id) {
      alert("Organization not found");
      return;
    }

    setCreating(true);
    setSelectedType(boardType);

    try {
      const response = await base44.functions.invoke('createTypeSpecificBoard', {
        organization_id: organization.id,
        board_type: boardType
      });

      if (response.data.success) {
        if (response.data.was_created) {
          alert(`✅ ${response.data.board_name} created successfully!`);
        } else {
          alert(`ℹ️ ${response.data.board_name} already exists`);
        }
        
        if (onBoardCreated) {
          onBoardCreated(response.data.board_id);
        }
        
        onClose();
      }
    } catch (error) {
      console.error('Error creating board:', error);
      alert('Error creating board: ' + error.message);
    } finally {
      setCreating(false);
      setSelectedType(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-blue-600" />
            Create New Board
          </DialogTitle>
          <DialogDescription>
            Choose a board type optimized for your proposal workflow
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
          {BOARD_TYPES.map((board) => (
            <Card
              key={board.type}
              className={cn(
                "p-6 cursor-pointer transition-all hover:shadow-lg border-2",
                creating && selectedType === board.type
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 hover:border-blue-300"
              )}
              onClick={() => !creating && handleCreateBoard(board.type)}
            >
              <div className="flex items-start gap-4">
                <div className="text-5xl">{board.icon}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-900 mb-1">
                    {board.name}
                  </h3>
                  <p className="text-sm text-slate-600 mb-2">
                    {board.description}
                  </p>
                  <div className={cn(
                    "inline-block px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r text-white",
                    board.color
                  )}>
                    {board.stages}
                  </div>
                </div>
              </div>

              {creating && selectedType === board.type && (
                <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Creating board...</span>
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={creating}>
            {creating ? 'Creating...' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}