import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Phase5 from '../components/builder/Phase5';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';

export default function ProposalStrategyConfig() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const proposalId = searchParams.get('proposalId');

  const { data: proposal, isLoading } = useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: () => base44.entities.Proposal.filter({ id: proposalId }).then(r => r[0]),
    enabled: !!proposalId
  });

  const handleSaveAndReturn = () => {
    // Navigate back to Kanban
    navigate(createPageUrl('Pipeline'));
  };

  if (!proposalId) return <div className="p-8">Error: No proposal ID provided</div>;
  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!proposal) return <div className="p-8">Error: Proposal not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{proposal.proposal_name}</h1>
          <p className="text-slate-500">Strategy Configuration</p>
        </div>
        <Phase5
          proposalData={proposal}
          proposalId={proposalId}
          onSaveAndGoToPipeline={handleSaveAndReturn}
        />
      </div>
    </div>
  );
}