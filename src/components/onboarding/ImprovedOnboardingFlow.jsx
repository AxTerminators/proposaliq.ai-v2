import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Briefcase,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Improved Onboarding Flow
 * Streamlined setup for new users
 */
export default function ImprovedOnboardingFlow({ user, onComplete }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [orgType, setOrgType] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [orgData, setOrgData] = useState({
    organization_name: '',
    contact_name: user?.full_name || '',
    contact_email: user?.email || '',
    organization_type: ''
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data) => {
      const org = await base44.entities.Organization.create(data);

      // Create default subscription
      await base44.entities.Subscription.create({
        organization_id: org.id,
        plan_type: orgType === 'consultancy' ? 'consultant_basic' : 'free',
        token_credits: 200000,
        max_users: orgType === 'consultancy' ? 5 : 3
      });

      // Add user access
      await base44.auth.updateMe({
        active_client_id: org.id,
        client_accesses: [
          ...(user.client_accesses || []),
          {
            organization_id: org.id,
            organization_name: data.organization_name,
            organization_type: data.organization_type,
            role: 'organization_owner',
            added_date: new Date().toISOString(),
            is_favorite: true
          }
        ]
      });

      // Create master board
      if (orgType === 'corporate') {
        await base44.functions.invoke('ensureMasterBoardOnFirstLoad', {
          organization_id: org.id
        });
      }

      // Create default folders
      await base44.functions.invoke('createDefaultContentLibraryFolders', {
        organization_id: org.id
      });

      return org;
    },
    onSuccess: async (org) => {
      queryClient.invalidateQueries();
      toast.success(`Welcome to ${org.organization_name}!`);
      
      if (onComplete) {
        onComplete(org);
      } else {
        // Reload to apply new context
        window.location.href = createPageUrl("Dashboard");
      }
    },
    onError: (error) => {
      toast.error('Setup failed: ' + error.message);
      setIsCreating(false);
    }
  });

  const handleSelectOrgType = (type) => {
    setOrgType(type);
    setOrgData({
      ...orgData,
      organization_type: type === 'consultancy' ? 'consulting_firm' : 'corporate'
    });
    setStep(2);
  };

  const handleCreateOrg = async () => {
    if (!orgData.organization_name.trim()) {
      toast.error('Organization name is required');
      return;
    }

    setIsCreating(true);
    createOrgMutation.mutate(orgData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <Card className="max-w-4xl w-full border-none shadow-2xl">
        <CardContent className="p-12">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold",
              step >= 1 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
            )}>
              1
            </div>
            <div className="w-16 h-1 bg-slate-200" />
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold",
              step >= 2 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
            )}>
              2
            </div>
            <div className="w-16 h-1 bg-slate-200" />
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold",
              step >= 3 ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
            )}>
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Step 1: Choose Organization Type */}
          {step === 1 && (
            <div className="space-y-6 text-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-3">
                  Welcome to ProposalIQ.ai! 👋
                </h2>
                <p className="text-lg text-slate-600">
                  Let's set up your workspace. How will you be using the platform?
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <button
                  onClick={() => handleSelectOrgType('corporate')}
                  className="group p-8 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <Building2 className="w-12 h-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Corporate/In-House Team
                  </h3>
                  <p className="text-slate-600 text-sm mb-4">
                    Your team writes proposals for your own organization
                  </p>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Single organization workspace
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Team collaboration tools
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      AI-powered proposal builder
                    </li>
                  </ul>
                </button>

                <button
                  onClick={() => handleSelectOrgType('consultancy')}
                  className="group p-8 rounded-2xl border-2 border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                >
                  <Briefcase className="w-12 h-12 text-purple-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Consulting Firm
                  </h3>
                  <p className="text-slate-600 text-sm mb-4">
                    You manage proposals for multiple client organizations
                  </p>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Multi-client management
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Isolated client workspaces
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Portfolio analytics
                    </li>
                  </ul>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Organization Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 mb-3">
                  Set Up Your {orgType === 'consultancy' ? 'Consulting Firm' : 'Organization'}
                </h2>
                <p className="text-slate-600">
                  Tell us a bit about your {orgType === 'consultancy' ? 'firm' : 'team'}
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-4">
                <div>
                  <Label>Organization Name *</Label>
                  <Input
                    value={orgData.organization_name}
                    onChange={(e) => setOrgData({
                      ...orgData,
                      organization_name: e.target.value
                    })}
                    placeholder={orgType === 'consultancy' ? 'Acme Consulting Group' : 'Acme Defense Solutions'}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Your Name</Label>
                    <Input
                      value={orgData.contact_name}
                      onChange={(e) => setOrgData({
                        ...orgData,
                        contact_name: e.target.value
                      })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={orgData.contact_email}
                      onChange={(e) => setOrgData({
                        ...orgData,
                        contact_email: e.target.value
                      })}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-blue-900">
                    <Sparkles className="w-4 h-4 inline mr-2" />
                    We'll automatically set up:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-blue-800 ml-6">
                    <li>• Your proposal board and workflow</li>
                    <li>• Content library with default folders</li>
                    <li>• Team collaboration tools</li>
                    {orgType === 'consultancy' && (
                      <li>• Client workspace management</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex justify-center gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateOrg}
                  disabled={!orgData.organization_name.trim() || isCreating}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Your Workspace...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}