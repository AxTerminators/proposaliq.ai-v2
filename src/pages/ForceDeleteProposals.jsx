import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ForceDeleteProposals() {
    const queryClient = useQueryClient();
    const [deleting, setDeleting] = useState({});

    const { data: proposals = [], isLoading, refetch } = useQuery({
        queryKey: ['all-proposals-admin'],
        queryFn: async () => {
            return await base44.entities.Proposal.list('-created_date', 1000);
        }
    });

    const deleteProposal = async (proposalId) => {
        try {
            setDeleting(prev => ({ ...prev, [proposalId]: true }));
            
            const response = await base44.functions.invoke('deleteProposal', {
                proposal_id: proposalId
            });

            if (response.data.success) {
                toast.success('Proposal deleted successfully');
                refetch();
            } else {
                toast.error('Failed to delete proposal');
            }
        } catch (error) {
            console.error('Error deleting proposal:', error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setDeleting(prev => ({ ...prev, [proposalId]: false }));
        }
    };

    const deleteAll = async () => {
        if (!confirm(`Are you sure you want to delete ALL ${proposals.length} proposals? This cannot be undone!`)) {
            return;
        }

        for (const proposal of proposals) {
            await deleteProposal(proposal.id);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8">
                <div className="flex items-center gap-2 text-slate-600">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Loading proposals...
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Force Delete Proposals</h1>
                <p className="text-slate-600">Admin tool to delete proposals that aren't showing up on Kanban boards</p>
            </div>

            {proposals.length > 0 && (
                <Card className="mb-6 border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="text-red-900 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Danger Zone
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={deleteAll}
                            variant="destructive"
                            className="w-full"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete All {proposals.length} Proposals
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-slate-900">
                        All Proposals ({proposals.length})
                    </h2>
                    <Button onClick={refetch} variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                {proposals.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <p className="text-slate-600">No proposals found</p>
                        </CardContent>
                    </Card>
                ) : (
                    proposals.map((proposal) => (
                        <Card key={proposal.id} className="hover:border-slate-300 transition-colors">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-slate-900">
                                                {proposal.proposal_name || 'Untitled Proposal'}
                                            </h3>
                                            <Badge variant="outline">
                                                {proposal.proposal_type_category || 'N/A'}
                                            </Badge>
                                            <Badge>
                                                {proposal.status || 'N/A'}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-slate-600 space-y-1">
                                            <div>ID: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">{proposal.id}</code></div>
                                            <div>Stage: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">{proposal.custom_workflow_stage_id || 'N/A'}</code></div>
                                            <div>Org: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">{proposal.organization_id}</code></div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => deleteProposal(proposal.id)}
                                        disabled={deleting[proposal.id]}
                                        variant="destructive"
                                        size="sm"
                                    >
                                        {deleting[proposal.id] ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                Deleting...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}