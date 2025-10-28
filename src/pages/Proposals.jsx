import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Plus, 
  Search,
  Calendar,
  Building2,
  TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Proposals() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: proposals, isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date'),
    initialData: [],
  });

  const filteredProposals = proposals.filter(proposal => {
    const matchesSearch = proposal.proposal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         proposal.agency_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         proposal.solicitation_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || proposal.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusConfig = {
    draft: { label: "Draft", color: "bg-slate-100 text-slate-700" },
    in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
    submitted: { label: "Submitted", color: "bg-purple-100 text-purple-700" },
    won: { label: "Won", color: "bg-green-100 text-green-700" },
    lost: { label: "Lost", color: "bg-red-100 text-red-700" }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Proposals</h1>
          <p className="text-slate-600">Manage your proposal pipeline</p>
        </div>
        <Button 
          onClick={() => navigate(createPageUrl("ProposalBuilder"))}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Proposal
        </Button>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search proposals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
              {["all", "draft", "in_progress", "submitted", "won", "lost"].map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                  className="whitespace-nowrap"
                >
                  {status === "all" ? "All" : statusConfig[status]?.label || status}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3,4].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-20 h-20 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 text-lg mb-2">
                {searchQuery || filterStatus !== "all" ? "No proposals match your filters" : "No proposals yet"}
              </p>
              <p className="text-slate-500 mb-6">
                {searchQuery || filterStatus !== "all" ? "Try adjusting your search or filters" : "Create your first proposal to get started"}
              </p>
              {!searchQuery && filterStatus === "all" && (
                <Button onClick={() => navigate(createPageUrl("ProposalBuilder"))}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Proposal
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer bg-white"
                  onClick={() => navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`))}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900 mb-1">
                            {proposal.proposal_name}
                          </h3>
                          {proposal.solicitation_number && (
                            <p className="text-sm text-slate-500">
                              Solicitation: {proposal.solicitation_number}
                            </p>
                          )}
                        </div>
                        <Badge className={statusConfig[proposal.status]?.color}>
                          {statusConfig[proposal.status]?.label || proposal.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        {proposal.agency_name && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            {proposal.agency_name}
                          </div>
                        )}
                        {proposal.due_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            Due: {new Date(proposal.due_date).toLocaleDateString()}
                          </div>
                        )}
                        {proposal.match_score && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-slate-400" />
                            Match Score: {proposal.match_score}/100
                          </div>
                        )}
                      </div>

                      {proposal.project_type && (
                        <div className="mt-3">
                          <Badge variant="outline">{proposal.project_type}</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}