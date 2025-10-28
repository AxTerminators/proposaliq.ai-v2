import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export default function Phase5({ proposalData, setProposalData, proposalId }) {
  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-600" />
          Phase 5: AI Strategy (Coming Soon)
        </CardTitle>
        <CardDescription>
          AI will suggest winning strategies for your proposal
        </CardDescription>
      </CardHeader>
      <CardContent className="py-12 text-center">
        <p className="text-slate-600">This phase is under development</p>
      </CardContent>
    </Card>
  );
}