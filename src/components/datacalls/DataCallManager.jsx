import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileQuestion, Plus } from "lucide-react";
import DataCallInitiator from "./DataCallInitiator";
import DataCallReviewer from "./DataCallReviewer";

/**
 * DataCallManager - Main interface for managing data calls
 * Can be used in ProposalCardModal or as standalone page
 */
export default function DataCallManager({ 
  proposal, 
  organization, 
  user,
  defaultTab = "active"
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: allDataCalls = [] } = useQuery({
    queryKey: ['data-call-requests', proposal?.id, organization?.id],
    queryFn: async () => {
      const query = proposal
        ? { proposal_id: proposal.id, organization_id: organization.id }
        : { organization_id: organization.id };

      return base44.entities.DataCallRequest.filter(query, '-created_date');
    },
    enabled: !!organization?.id
  });

  const activeDataCalls = allDataCalls.filter(dc => 
    !['completed'].includes(dc.overall_status)
  );

  const completedDataCalls = allDataCalls.filter(dc => 
    dc.overall_status === 'completed'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileQuestion className="w-7 h-7 text-blue-600" />
            Data Call Requests
          </h2>
          <p className="text-slate-600 mt-1">
            Request and manage information from {proposal ? 'clients, team members, and partners' : 'your team and partners'}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Data Call
        </Button>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            Active ({activeDataCalls.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedDataCalls.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({allDataCalls.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <DataCallReviewer 
            proposal={proposal}
            organization={organization}
          />
        </TabsContent>

        <TabsContent value="completed">
          <DataCallReviewer 
            proposal={proposal}
            organization={organization}
          />
        </TabsContent>

        <TabsContent value="all">
          <DataCallReviewer 
            proposal={proposal}
            organization={organization}
          />
        </TabsContent>
      </Tabs>

      <DataCallInitiator
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        proposal={proposal}
        organization={organization}
        user={user}
      />
    </div>
  );
}