import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  GitCompare,
  Plus,
  X,
  Star,
  Check,
  ArrowRight,
  DollarSign,
  Clock,
  Users,
  Target,
  Award,
  TrendingUp,
  Save,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function ProposalComparisonTool({ client, organization }) {
  const queryClient = useQueryClient();
  const [selectedProposals, setSelectedProposals] = useState([]);
  const [showCriteriaDialog, setShowCriteriaDialog] = useState(false);
  const [comparisonName, setComparisonName] = useState("");
  const [criteria, setCriteria] = useState([
    { name: "Price", weight: 25, scores: {} },
    { name: "Timeline", weight: 20, scores: {} },
    { name: "Quality", weight: 25, scores: {} },
    { name: "Experience", weight: 15, scores: {} },
    { name: "Communication", weight: 15, scores: {} }
  ]);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [winnerProposalId, setWinnerProposalId] = useState(null);

  // Get proposals shared with this client
  const { data: proposals = [] } = useQuery({
    queryKey: ['client-proposals', client.id],
    queryFn: async () => {
      const allProposals = await base44.entities.Proposal.list();
      return allProposals.filter(p => 
        p.shared_with_client_ids?.includes(client.id)
      );
    },
    initialData: []
  });

  // Get existing comparisons
  const { data: comparisons = [] } = useQuery({
    queryKey: ['comparisons', client.id],
    queryFn: () => base44.entities.ProposalComparison.filter({
      client_id: client.id,
      organization_id: organization.id
    }),
    initialData: []
  });

  const saveComparisonMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ProposalComparison.create({
        client_id: client.id,
        organization_id: organization.id,
        comparison_name: data.name,
        proposal_ids: selectedProposals.map(p => p.id),
        comparison_criteria: criteria,
        winner_proposal_id: winnerProposalId,
        decision_notes: decisionNotes,
        comparison_data: {
          proposals: selectedProposals,
          criteria: criteria,
          total_scores: calculateTotalScores()
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparisons'] });
      alert("✓ Comparison saved successfully!");
    }
  });

  const toggleProposal = (proposal) => {
    if (selectedProposals.find(p => p.id === proposal.id)) {
      setSelectedProposals(selectedProposals.filter(p => p.id !== proposal.id));
      // Remove scores for this proposal
      const newCriteria = criteria.map(c => ({
        ...c,
        scores: { ...c.scores, [proposal.id]: undefined }
      }));
      setCriteria(newCriteria);
    } else {
      if (selectedProposals.length >= 3) {
        alert("You can compare up to 3 proposals at a time");
        return;
      }
      setSelectedProposals([...selectedProposals, proposal]);
    }
  };

  const updateCriterionScore = (criterionIndex, proposalId, score) => {
    const newCriteria = [...criteria];
    newCriteria[criterionIndex].scores[proposalId] = parseInt(score);
    setCriteria(newCriteria);
  };

  const updateCriterionWeight = (criterionIndex, weight) => {
    const newCriteria = [...criteria];
    newCriteria[criterionIndex].weight = parseInt(weight);
    setCriteria(newCriteria);
  };

  const addCriterion = () => {
    setCriteria([...criteria, { name: "New Criterion", weight: 10, scores: {} }]);
  };

  const removeCriterion = (index) => {
    setCriteria(criteria.filter((_, idx) => idx !== index));
  };

  const calculateTotalScores = () => {
    const scores = {};
    selectedProposals.forEach(proposal => {
      let total = 0;
      criteria.forEach(criterion => {
        const score = criterion.scores[proposal.id] || 0;
        total += (score * criterion.weight) / 100;
      });
      scores[proposal.id] = total;
    });
    return scores;
  };

  const totalScores = calculateTotalScores();
  const maxScore = Math.max(...Object.values(totalScores), 0);
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  const handleSaveComparison = () => {
    if (!comparisonName) {
      alert("Please enter a comparison name");
      return;
    }
    saveComparisonMutation.mutate({ name: comparisonName });
  };

  const exportComparison = () => {
    const data = {
      comparison_name: comparisonName,
      proposals: selectedProposals.map(p => ({
        name: p.proposal_name,
        organization: p.prime_contractor_name,
        contract_value: p.contract_value
      })),
      criteria: criteria,
      scores: totalScores,
      winner: selectedProposals.find(p => p.id === winnerProposalId)?.proposal_name,
      notes: decisionNotes,
      date: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="w-6 h-6 text-purple-600" />
                Proposal Comparison Tool
              </CardTitle>
              <CardDescription>
                Compare up to 3 proposals side-by-side with custom criteria
              </CardDescription>
            </div>
            {selectedProposals.length >= 2 && (
              <div className="flex gap-2">
                <Button onClick={() => setShowCriteriaDialog(true)} variant="outline">
                  Customize Criteria
                </Button>
                <Button onClick={exportComparison} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button onClick={handleSaveComparison} className="bg-purple-600 hover:bg-purple-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save Comparison
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Comparison Name */}
      {selectedProposals.length >= 2 && (
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <Label>Comparison Name</Label>
            <Input
              value={comparisonName}
              onChange={(e) => setComparisonName(e.target.value)}
              placeholder="e.g., Q4 2024 Vendor Selection"
              className="mt-2"
            />
          </CardContent>
        </Card>
      )}

      {/* Proposal Selection */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Select Proposals to Compare</CardTitle>
          <CardDescription>
            Choose 2-3 proposals • {selectedProposals.length} selected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proposals.map(proposal => {
              const isSelected = selectedProposals.find(p => p.id === proposal.id);
              
              return (
                <Card
                  key={proposal.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    isSelected ? "ring-2 ring-purple-500 bg-purple-50" : ""
                  )}
                  onClick={() => toggleProposal(proposal)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-slate-900">{proposal.proposal_name}</h4>
                      {isSelected && (
                        <Check className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{proposal.prime_contractor_name}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {proposal.contract_value && (
                        <Badge variant="outline">
                          ${(proposal.contract_value / 1000).toFixed(0)}K
                        </Badge>
                      )}
                      {proposal.due_date && (
                        <Badge variant="outline">
                          Due: {moment(proposal.due_date).format('MMM D')}
                        </Badge>
                      )}
                      <Badge className="capitalize">{proposal.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {proposals.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <GitCompare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>No proposals available to compare</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Matrix */}
      {selectedProposals.length >= 2 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Scoring Matrix</CardTitle>
            <CardDescription>
              Rate each proposal on a scale of 1-10 • Weight totals: {totalWeight}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left p-4 font-semibold">Criteria</th>
                    <th className="text-center p-4 font-semibold">Weight</th>
                    {selectedProposals.map(proposal => (
                      <th key={proposal.id} className="text-center p-4 font-semibold">
                        {proposal.proposal_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((criterion, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-medium">{criterion.name}</td>
                      <td className="p-4 text-center">
                        <Badge variant="outline">{criterion.weight}%</Badge>
                      </td>
                      {selectedProposals.map(proposal => (
                        <td key={proposal.id} className="p-4">
                          <Select
                            value={criterion.scores[proposal.id]?.toString() || ""}
                            onValueChange={(value) => updateCriterionScore(idx, proposal.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Rate" />
                            </SelectTrigger>
                            <SelectContent>
                              {[1,2,3,4,5,6,7,8,9,10].map(score => (
                                <SelectItem key={score} value={score.toString()}>
                                  {score} / 10
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td className="p-4">Total Weighted Score</td>
                    <td className="p-4"></td>
                    {selectedProposals.map(proposal => (
                      <td key={proposal.id} className="p-4 text-center">
                        <div className="text-2xl text-purple-600">
                          {totalScores[proposal.id]?.toFixed(1) || '0.0'}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visual Comparison */}
      {selectedProposals.length >= 2 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Visual Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {selectedProposals.map(proposal => {
                const score = totalScores[proposal.id] || 0;
                const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                const isWinner = proposal.id === winnerProposalId;

                return (
                  <div key={proposal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-slate-900">{proposal.proposal_name}</h4>
                        {isWinner && (
                          <Badge className="bg-green-100 text-green-700">
                            <Award className="w-3 h-3 mr-1" />
                            Winner
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-purple-600">
                          {score.toFixed(1)}
                        </span>
                        <Button
                          size="sm"
                          variant={isWinner ? "default" : "outline"}
                          onClick={() => setWinnerProposalId(proposal.id)}
                        >
                          {isWinner ? "Selected" : "Select Winner"}
                        </Button>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-4" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decision Notes */}
      {selectedProposals.length >= 2 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Decision Notes</CardTitle>
            <CardDescription>
              Document your rationale for the final decision
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              rows={5}
              placeholder="Why did you choose this proposal? What were the key deciding factors?"
            />
          </CardContent>
        </Card>
      )}

      {/* Criteria Dialog */}
      <Dialog open={showCriteriaDialog} onOpenChange={setShowCriteriaDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize Comparison Criteria</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {criteria.map((criterion, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                <Input
                  value={criterion.name}
                  onChange={(e) => {
                    const newCriteria = [...criteria];
                    newCriteria[idx].name = e.target.value;
                    setCriteria(newCriteria);
                  }}
                  placeholder="Criterion name"
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={criterion.weight}
                    onChange={(e) => updateCriterionWeight(idx, e.target.value)}
                    className="w-20"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm text-slate-600">%</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeCriterion(idx)}
                  disabled={criteria.length <= 1}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button onClick={addCriterion} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Criterion
          </Button>

          {totalWeight !== 100 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              ⚠️ Weights should total 100% (currently {totalWeight}%)
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowCriteriaDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}