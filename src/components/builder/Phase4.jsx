import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Target } from "lucide-react";

export default function Phase4({ proposalData, setProposalData, proposalId }) {
  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" />
          Phase 4: AI Evaluator (Coming Soon)
        </CardTitle>
        <CardDescription>
          AI will analyze your proposal for completeness and compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="py-12 text-center">
        <p className="text-slate-600">This phase is under development</p>
      </CardContent>
    </Card>
  );
}