import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, DollarSign } from "lucide-react";
import LaborRateManager from "@/components/pricing/LaborRateManager";
import CLINBuilder from "@/components/pricing/CLINBuilder";
import PricingSummary from "@/components/pricing/PricingSummary";
import PricingAnalyzer from "@/components/pricing/PricingAnalyzer";
import SubcontractorManager from "@/components/pricing/SubcontractorManager";

export default function PricingBuilder() {
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get proposal ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const proposalId = urlParams.get('id');

        if (!proposalId) {
          alert('No proposal ID provided');
          navigate(createPageUrl('Pipeline'));
          return;
        }

        // Load user and organization
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );

        if (orgs.length === 0) {
          alert('No organization found');
          navigate(createPageUrl('Pipeline'));
          return;
        }

        const org = orgs[0];
        setOrganization(org);

        // Load proposal
        const proposals = await base44.entities.Proposal.filter({
          id: proposalId,
          organization_id: org.id
        });

        if (proposals.length === 0) {
          alert('Proposal not found');
          navigate(createPageUrl('Pipeline'));
          return;
        }

        setProposal(proposals[0]);
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading pricing data');
        navigate(createPageUrl('Pipeline'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Auto-save is handled by individual components
      setLastSaved(new Date());
      alert('✓ Pricing saved successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving pricing data');
    } finally {
      setSaving(false);
    }
  };

  const handleBackToPipeline = () => {
    navigate(createPageUrl('Pipeline'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">Loading pricing builder...</p>
        </div>
      </div>
    );
  }

  if (!proposal || !organization) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleBackToPipeline}
              className="hover:bg-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pipeline
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-8 h-8 text-green-600" />
                Pricing & Cost Builder
              </h1>
              <p className="text-slate-600 mt-1">
                {proposal.proposal_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-sm text-green-600">
                ✓ Last saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        </div>

        {/* Main Pricing Interface */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle>Build Your Pricing Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="labor" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="labor">Labor Rates</TabsTrigger>
                <TabsTrigger value="clins">CLINs</TabsTrigger>
                <TabsTrigger value="subs">Subcontractors</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>

              {/* Labor Rates Tab */}
              <TabsContent value="labor">
                <LaborRateManager 
                  organization={organization}
                  proposal={proposal}
                />
              </TabsContent>

              {/* CLINs Tab */}
              <TabsContent value="clins">
                <CLINBuilder
                  proposal={proposal}
                  organization={organization}
                />
              </TabsContent>

              {/* Subcontractors Tab */}
              <TabsContent value="subs">
                <SubcontractorManager
                  proposal={proposal}
                  organization={organization}
                />
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary">
                <PricingSummary
                  proposal={proposal}
                  organization={organization}
                />
              </TabsContent>

              {/* Analysis Tab */}
              <TabsContent value="analysis">
                <PricingAnalyzer
                  proposal={proposal}
                  organization={organization}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handleBackToPipeline}
            className="bg-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Pipeline
          </Button>

          <Button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save and Continue
          </Button>
        </div>
      </div>
    </div>
  );
}