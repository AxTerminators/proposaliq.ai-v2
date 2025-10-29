import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusConfig = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  submitted: { label: "Submitted", color: "bg-purple-100 text-purple-700" },
  won: { label: "Won", color: "bg-green-100 text-green-700" },
  lost: { label: "Lost", color: "bg-red-100 text-red-700" },
  archived: { label: "Archived", color: "bg-slate-100 text-slate-500" }
};

export default function ProposalsTable({ proposals }) {
  const navigate = useNavigate();

  if (proposals.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-20 h-20 mx-auto text-slate-300 mb-4" />
        <p className="text-slate-600 text-lg mb-2">No proposals found</p>
        <p className="text-slate-500">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="font-semibold">Proposal Name</TableHead>
            <TableHead className="font-semibold">Agency</TableHead>
            <TableHead className="font-semibold">Solicitation #</TableHead>
            <TableHead className="font-semibold">Due Date</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Match Score</TableHead>
            <TableHead className="font-semibold">Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.map((proposal) => (
            <TableRow
              key={proposal.id}
              onClick={() => navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`))}
              className="cursor-pointer hover:bg-blue-50 transition-colors"
            >
              <TableCell className="font-medium">{proposal.proposal_name}</TableCell>
              <TableCell>{proposal.agency_name || '-'}</TableCell>
              <TableCell>{proposal.solicitation_number || '-'}</TableCell>
              <TableCell>
                {proposal.due_date 
                  ? new Date(proposal.due_date).toLocaleDateString() 
                  : '-'}
              </TableCell>
              <TableCell>
                <Badge className={statusConfig[proposal.status]?.color}>
                  {statusConfig[proposal.status]?.label || proposal.status}
                </Badge>
              </TableCell>
              <TableCell>
                {proposal.match_score ? (
                  <Badge variant="outline">{proposal.match_score}%</Badge>
                ) : '-'}
              </TableCell>
              <TableCell>
                {proposal.project_type ? (
                  <Badge variant="secondary">{proposal.project_type}</Badge>
                ) : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}