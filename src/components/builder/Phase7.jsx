import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function Phase7({ proposalData, setProposalData, proposalId }) {
  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          Phase 7: Finalize & Export (Coming Soon)
        </CardTitle>
        <CardDescription>
          Review and export your completed proposal
        </CardDescription>
      </CardHeader>
      <CardContent className="py-12 text-center">
        <p className="text-slate-600">This phase is under development</p>
      </CardContent>
    </Card>
  );
}