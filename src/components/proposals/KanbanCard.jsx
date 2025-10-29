import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2, TrendingUp } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";

export default function KanbanCard({ proposal, index }) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.stopPropagation();
    navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`));
  };

  return (
    <Draggable draggableId={proposal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <Card
            onClick={handleClick}
            className={`mb-3 cursor-pointer transition-all hover:shadow-lg ${
              snapshot.isDragging ? "shadow-2xl rotate-2 scale-105" : ""
            }`}
          >
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                {proposal.proposal_name}
              </h3>
              
              <div className="space-y-2 text-sm">
                {proposal.agency_name && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-3 h-3" />
                    <span className="truncate">{proposal.agency_name}</span>
                  </div>
                )}
                
                {proposal.due_date && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(proposal.due_date).toLocaleDateString()}</span>
                  </div>
                )}

                {proposal.solicitation_number && (
                  <div className="text-xs text-slate-500">
                    #{proposal.solicitation_number}
                  </div>
                )}

                {proposal.match_score && (
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    <Badge variant="outline" className="text-xs">
                      {proposal.match_score}% Match
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}