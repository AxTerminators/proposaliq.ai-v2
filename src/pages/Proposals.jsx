import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search,
  LayoutGrid,
  List,
  Table as TableIcon
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ProposalsKanban from "../components/proposals/ProposalsKanban";
import ProposalsList from "../components/proposals/ProposalsList";
import ProposalsTable from "../components/proposals/ProposalsTable";

export default function Proposals() {
  const navigate = useNavigate();
  const [organization, setOrganization] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: proposals, isLoading } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const filteredProposals = proposals.filter(proposal => {
    const matchesSearch = proposal.proposal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         proposal.agency_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         proposal.solicitation_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || proposal.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
              {["all", "evaluating", "watch_list", "draft", "in_progress", "submitted", "won", "lost", "archived"].map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                  className="whitespace-nowrap capitalize"
                >
                  {status === "all" ? "All" : status.replace('_', ' ')}
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
          ) : (
            <Tabs defaultValue="kanban" className="space-y-6">
              <TabsList>
                <TabsTrigger value="kanban">
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="w-4 h-4 mr-2" />
                  List
                </TabsTrigger>
                <TabsTrigger value="table">
                  <TableIcon className="w-4 h-4 mr-2" />
                  Table
                </TabsTrigger>
              </TabsList>

              <TabsContent value="kanban">
                <ProposalsKanban 
                  proposals={filteredProposals} 
                  organizationId={organization?.id}
                  userRole="organization_owner"
                />
              </TabsContent>

              <TabsContent value="list">
                <ProposalsList proposals={filteredProposals} />
              </TabsContent>

              <TabsContent value="table">
                <ProposalsTable proposals={filteredProposals} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}