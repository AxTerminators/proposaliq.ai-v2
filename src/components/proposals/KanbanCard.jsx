import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, GripVertical } from "lucide-react";
import { format } from "date-fns";

export default function KanbanCard({ proposal, index, onProposalClick }) {
  const priorityColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800"
  };

  return (
    <Draggable draggableId={proposal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-3"
        >
          <Card 
            className={`cursor-pointer hover:shadow-md transition-all ${
              snapshot.isDragging ? "shadow-lg rotate-2" : ""
            }`}
            onClick={() => onProposalClick && onProposalClick(proposal)}
          >
            <CardHeader className="p-3 pb-2">
              <div className="flex items-start gap-2">
                <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-slate-900 line-clamp-2 mb-1">
                    {proposal.proposal_name}
                  </h4>
                  {proposal.agency_name && (
                    <p className="text-xs text-slate-600 truncate">
                      {proposal.agency_name}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-3 pt-0">
              <div className="flex flex-wrap gap-1 mb-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {proposal.project_type || "RFP"}
                </Badge>
                {proposal.match_score && (
                  <Badge className="text-xs bg-green-100 text-green-800">
                    {proposal.match_score}% match
                  </Badge>
                )}
              </div>
              
              {proposal.due_date && (
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <Calendar className="w-3 h-3" />
                  <span>Due {format(new Date(proposal.due_date), 'MMM d, yyyy')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}