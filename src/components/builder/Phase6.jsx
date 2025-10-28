import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PenTool } from "lucide-react";

export default function Phase6({ proposalData, setProposalData, proposalId }) {
  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="w-5 h-5 text-green-600" />
          Phase 6: AI Proposal Writer (Coming Soon)
        </CardTitle>
        <CardDescription>
          AI will generate proposal content based on your references
        </CardDescription>
      </CardHeader>
      <CardContent className="py-12 text-center">
        <p className="text-slate-600">This phase is under development</p>
      </CardContent>
    </Card>
  );
}