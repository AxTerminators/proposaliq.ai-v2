
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  ThumbsUp,
  CheckCircle2,
  Sparkles,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClientSatisfactionSurvey() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [client, setClient] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [adminPreviewMode, setAdminPreviewMode] = useState(false);

  const [npsScore, setNpsScore] = useState(null);
  const [csatScore, setCsatScore] = useState(null);
  const [comments, setComments] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const proposalId = urlParams.get('proposal');
        const isAdminPreview = urlParams.get('admin_preview') === 'true';

        // Check if super admin in preview mode
        if (isAdminPreview && !token) {
          try {
            const user = await base44.auth.me();
            const isAdmin = user && user.admin_role === 'super_admin';

            if (isAdmin) {
              setAdminPreviewMode(true);
              setLoading(true); // Keep loading true while fetching sample data
              setError(null); // Clear any previous errors

              // Load sample data
              const allClients = await base44.entities.Client.list('-created_date', 1);
              if (allClients.length > 0) {
                const sampleClient = allClients[0];
                setClient(sampleClient);

                const proposals = await base44.entities.Proposal.filter({
                  organization_id: sampleClient.organization_id
                }, '-created_date', 1);

                if (proposals.length > 0) {
                  setProposal(proposals[0]);
                } else {
                  // If no proposals found for the sample client's organization, create a dummy one
                  setProposal({
                    id: "preview_proposal_id",
                    organization_id: sampleClient.organization_id,
                    proposal_name: "Sample Proposal (Preview Mode)",
                    contact_email: sampleClient.contact_email,
                    contact_name: sampleClient.contact_name,
                  });
                }
              } else {
                // If no clients exist, create dummy client and proposal for preview
                setClient({
                  id: "preview_client_id",
                  organization_id: "preview_org_id",
                  contact_email: "preview@example.com",
                  contact_name: "Preview User",
                });
                setProposal({
                  id: "preview_proposal_id",
                  organization_id: "preview_org_id",
                  proposal_name: "Sample Proposal (No Clients Found)",
                  contact_email: "preview@example.com",
                  contact_name: "Preview User",
                });
              }

              setLoading(false);
              return; // Exit here, admin preview data is loaded
            }
          } catch (authError) {
            console.log("User not authenticated or not admin for preview mode:", authError);
            // Fall through to regular survey link check if auth fails or user is not admin
          }
        }

        // If not admin preview mode, or admin preview failed/user not admin,
        // proceed with regular token-based authentication.
        if (!token || !proposalId) {
          setError("Invalid survey link");
          setLoading(false);
          return;
        }

        // Find client by token
        const clients = await base44.entities.Client.filter({ access_token: token });
        if (clients.length === 0) {
          setError("Invalid access token");
          setLoading(false);
          return;
        }

        const clientData = clients[0];

        // Get proposal
        const proposals = await base44.entities.Proposal.filter({ id: proposalId });
        if (proposals.length === 0) {
          setError("Proposal not found");
          setLoading(false);
          return;
        }

        const proposalData = proposals[0];

        // Check if already submitted
        const existingFeedback = await base44.entities.Feedback.filter({
          client_id: clientData.id,
          proposal_id: proposalId,
          issue_type: "post_proposal_satisfaction"
        });

        if (existingFeedback.length > 0) {
          setSubmitted(true);
        }

        setClient(clientData);
        setProposal(proposalData);
        setLoading(false);
      } catch (err) {
        console.error("Error loading survey:", err);
        setError("Failed to load survey");
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const submitSurveyMutation = useMutation({
    mutationFn: async () => {
      // Ensure proposal and client are available before attempting submission
      if (!proposal || !client) {
        throw new Error("Cannot submit feedback: proposal or client data missing.");
      }
      return await base44.entities.Feedback.create({
        organization_id: proposal.organization_id,
        client_id: client.id,
        proposal_id: proposal.id,
        reporter_email: client.contact_email,
        reporter_name: client.contact_name,
        issue_type: "post_proposal_satisfaction",
        priority: "low",
        title: `Satisfaction Survey - ${proposal.proposal_name}`,
        description: comments || "Survey completed",
        nps_score: npsScore,
        csat_score: csatScore,
        survey_type: "nps",
        status: "closed",
        page_url: window.location.href,
        browser_info: navigator.userAgent
      });
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = () => {
    if (adminPreviewMode) {
      alert("Preview mode - form submission is disabled.");
      return;
    }

    if (npsScore === null || csatScore === null) {
      alert("Please complete both ratings");
      return;
    }
    submitSurveyMutation.mutate();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  // Fallback error for when preview mode tried to load but found no data
  if (adminPreviewMode && (!proposal || !client)) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-6">
            <Card className="max-w-md">
                <CardContent className="p-8 text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Preview Setup Error</h2>
                    <p className="text-slate-600">Could not load sample client/proposal data for admin preview. Please ensure clients and proposals exist in the system, or check your super_admin status.</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Error</h2>
            <p className="text-slate-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-6">
        <Card className="max-w-2xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Thank You!</h2>
            <p className="text-lg text-slate-600 mb-2">
              Your feedback has been submitted successfully.
            </p>
            <p className="text-slate-500">
              We appreciate you taking the time to share your experience with us.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Admin Preview Badge */}
        {adminPreviewMode && (
          <div className="text-center mb-4">
            <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-md px-4 py-2">
              Admin Preview Mode <Sparkles className="ml-2 h-4 w-4" />
            </Badge>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">How did we do?</h1>
          <p className="text-slate-600">
            We'd love to hear your feedback on <strong>{proposal?.proposal_name || "a recent proposal"}</strong>
          </p>
        </div>

        {/* NPS Question */}
        <Card className="border-none shadow-xl mb-6">
          <CardHeader>
            <CardTitle className="text-xl">
              How likely are you to recommend our services to a colleague?
            </CardTitle>
            <p className="text-sm text-slate-600">Rate from 0 (Not at all likely) to 10 (Extremely likely)</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-11 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  onClick={() => setNpsScore(score)}
                  className={cn(
                    "aspect-square rounded-lg font-semibold text-lg transition-all",
                    npsScore === score
                      ? score <= 6
                        ? "bg-red-500 text-white scale-110"
                        : score <= 8
                        ? "bg-amber-500 text-white scale-110"
                        : "bg-green-500 text-white scale-110"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  {score}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-xs text-slate-500">
              <span>Not likely</span>
              <span>Extremely likely</span>
            </div>
          </CardContent>
        </Card>

        {/* CSAT Question */}
        <Card className="border-none shadow-xl mb-6">
          <CardHeader>
            <CardTitle className="text-xl">
              How satisfied are you with the proposal we delivered?
            </CardTitle>
            <p className="text-sm text-slate-600">Rate your overall satisfaction</p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  onClick={() => setCsatScore(score)}
                  className={cn(
                    "p-4 rounded-xl transition-all",
                    csatScore === score
                      ? "bg-amber-100 scale-110"
                      : "bg-slate-50 hover:bg-slate-100"
                  )}
                >
                  <Star
                    className={cn(
                      "w-12 h-12",
                      csatScore && csatScore >= score
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-sm text-slate-600">
              <span>Very Dissatisfied</span>
              <span>Very Satisfied</span>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card className="border-none shadow-xl mb-6">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Additional Comments (Optional)
            </CardTitle>
            <p className="text-sm text-slate-600">
              What did we do well? What could we improve?
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={5}
              placeholder="Share your thoughts..."
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="text-center">
          <Button
            onClick={handleSubmit}
            disabled={submitSurveyMutation.isPending || npsScore === null || csatScore === null || adminPreviewMode}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg"
            size="lg"
          >
            {submitSurveyMutation.isPending ? (
              "Submitting..."
            ) : (
              <>
                <ThumbsUp className="w-5 h-5 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Your feedback helps us improve our services. Thank you for your time!
        </p>
      </div>
    </div>
  );
}
