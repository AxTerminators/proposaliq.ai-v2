
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Award } from "lucide-react";
import { format } from "date-fns";

export default function KanbanCard({ proposal, onClick, user, organization }) {
  const priorityColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800"
  };

  // Define colors for borderLeft based on status
  const getStatusBorderColor = (status) => {
    switch (status) {
      case 'qualified': return '#facc15'; // yellow-500
      case 'proposal_sent': return '#3b82f6'; // blue-500
      case 'negotiation': return '#ec4899'; // pink-500
      case 'won': return '#22c55e'; // green-500
      case 'lost': return '#ef4444'; // red-500
      default: return '#cbd5e1'; // slate-300
    }
  };

  // Define classes for status badge background and text colors
  const getStatusBadgeClasses = (status) => {
    switch (status) {
      case 'qualified': return 'bg-yellow-500 text-white';
      case 'proposal_sent': return 'bg-blue-500 text-white';
      case 'negotiation': return 'bg-pink-500 text-white';
      case 'won': return 'bg-green-500 text-white';
      case 'lost': return 'bg-red-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  // This function is mentioned in the outline placeholder but not used in the provided structure for icons.
  // Keeping it as a placeholder as per instruction for completeness.
  const getStatusIcon = (status) => {
    return null;
  };

  // Placeholder for createPageUrl function
  const createPageUrl = (path) => {
    // In a real application, this would typically integrate with a routing library or be a global helper.
    return `/${path}`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group mb-3"
    >
      <Card
        className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4"
        style={{ borderLeftColor: getStatusBorderColor(proposal.status) }}
        onClick={() => onClick && onClick(proposal)}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Proposal Name */}
            <h4 className="font-semibold text-sm text-slate-900 line-clamp-2">
              {proposal.proposal_name}
            </h4>

            {/* Agency Name */}
            {proposal.agency_name && (
              <p className="text-xs text-slate-600 truncate -mt-2">
                {proposal.agency_name}
              </p>
            )}

            {/* Status Badge */}
            {proposal.status && (
              <Badge className={`text-xs capitalize ${getStatusBadgeClasses(proposal.status)}`}>
                {proposal.status.replace(/_/g, ' ')}
              </Badge>
            )}

            {/* Project Type and Match Score Badges */}
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs capitalize">
                {proposal.project_type || "RFP"}
              </Badge>
              {proposal.match_score && (
                <Badge className="text-xs bg-green-100 text-green-800">
                  {proposal.match_score}% match
                </Badge>
              )}
            </div>

            {/* Due Date */}
            {proposal.due_date && (
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <Calendar className="w-3 h-3" />
                <span>Due {format(new Date(proposal.due_date), 'MMM d, yyyy')}</span>
              </div>
            )}

            {/* Add Win/Loss Capture button for won/lost proposals */}
            {(proposal.status === 'won' || proposal.status === 'lost') && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card onClick from firing
                  window.location.href = createPageUrl(`WinLossCapture?proposalId=${proposal.id}`);
                }}
              >
                <Award className="w-4 h-4 mr-2" />
                Capture Win/Loss Insights
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
