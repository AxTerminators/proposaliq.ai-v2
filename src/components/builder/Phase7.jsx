import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileText,
  Send,
  Loader2,
  Award,
  Shield
} from "lucide-react";
import ExportDialog from "../export/ExportDialog";
import SubmissionReadinessChecker from "./SubmissionReadinessChecker";
import RedTeamReview from "./RedTeamReview";
import ComplianceMatrixGenerator from "./ComplianceMatrixGenerator";
import WinLossAnalyzer from "../analytics/WinLossAnalyzer";

export default function Phase7({ proposal, user, organization, teamMembers }) {
  const [currentTab, setCurrentTab] = useState("submission");
  const [exporting, setExporting] = useState(false);
  const [readinessScore, setReadinessScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (proposal?.id) {
      checkReadiness();
    }
  }, [proposal?.id]);

  const checkReadiness = async () => {
    setLoading(true);
    try {
      const sections = await base44.entities.ProposalSection.filter({
        proposal_id: proposal.id
      });

      const requirements = await base44.entities.ComplianceRequirement.filter({
        proposal_id: proposal.id,
        organization_id: organization.id
      });

      const score = {
        sections_complete: sections.filter(s => s.status === 'approved').length,
        sections_total: sections.length,
        compliance_met: requirements.filter(r => r.compliance_status === 'compliant').length,
        compliance_total: requirements.length,
        overall: 0
      };

      score.overall = Math.round(
        ((score.sections_complete / (score.sections_total || 1)) * 0.6 +
        (score.compliance_met / (score.compliance_total || 1)) * 0.4) * 100
      );

      setReadinessScore(score);
    } catch (error) {
      console.error("Error checking readiness:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-blue-600" />
          Phase 7: Finalize & Submit
        </CardTitle>
        <CardDescription>
          Final checks, compliance review, submission, and post-proposal analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="submission">Submission Readiness</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Matrix</TabsTrigger>
            <TabsTrigger value="export">Export Proposal</TabsTrigger>
            <TabsTrigger value="review">Final Review</TabsTrigger>
            <TabsTrigger value="winloss">Win/Loss Analysis</TabsTrigger>
          </TabsList>

          {/* Submission Readiness */}
          <TabsContent value="submission">
            <SubmissionReadinessChecker proposal={proposal} organization={organization} />
          </TabsContent>

          {/* Compliance Matrix */}
          <TabsContent value="compliance">
            <ComplianceMatrixGenerator proposal={proposal} organization={organization} />
          </TabsContent>

          {/* Export */}
          <TabsContent value="export">
            <div className="space-y-6">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-blue-600" />
                    Export Options
                  </CardTitle>
                  <CardDescription>
                    Export your proposal in various formats
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ExportDialog proposal={proposal} organization={organization} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Final Review */}
          <TabsContent value="review">
            <RedTeamReview proposal={proposal} organization={organization} />
          </TabsContent>

          {/* Win/Loss Analysis */}
          <TabsContent value="winloss">
            <WinLossAnalyzer proposal={proposal} organization={organization} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}