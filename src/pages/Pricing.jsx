import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  Crown, 
  Zap,
  Rocket,
  Users,
  Sparkles,
  TrendingUp,
  Plus,
  ArrowRight,
  Star
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const PLANS = [
  {
    id: "free",
    name: "Free Plan",
    price: 0,
    credits: 200000,
    users: 1,
    icon: Users,
    color: "from-slate-100 to-slate-50",
    borderColor: "border-slate-200",
    features: [
      "200K token credits",
      "1 user account",
      "Basic AI features",
      "Community support",
      "7-phase proposal builder",
      "AI chat assistant",
      "Document upload"
    ]
  },
  {
    id: "pro",
    name: "Pro Plan",
    price: 99,
    credits: 1000000,
    users: 3,
    icon: Zap,
    color: "from-blue-100 to-indigo-50",
    borderColor: "border-blue-300",
    badge: "Most Popular",
    badgeColor: "bg-blue-600",
    features: [
      "1M token credits",
      "3 user accounts",
      "Advanced AI features",
      "Priority support",
      "Multi-LLM access (Gemini, Claude, ChatGPT)",
      "Custom templates",
      "Advanced analytics",
      "Collaboration tools",
      "Past performance library"
    ]
  },
  {
    id: "power",
    name: "Power Plan",
    price: 499,
    credits: 5000000,
    users: 10,
    icon: Rocket,
    color: "from-purple-100 to-pink-50",
    borderColor: "border-purple-300",
    features: [
      "5M token credits",
      "10 user accounts",
      "All AI features",
      "Dedicated support",
      "API access",
      "Custom integrations",
      "Advanced analytics & reporting",
      "Team training sessions",
      "Priority feature requests",
      "Custom workflow automation"
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise Plan",
    price: "Custom",
    credits: "Unlimited",
    users: "Unlimited",
    icon: Crown,
    color: "from-amber-100 to-orange-50",
    borderColor: "border-amber-300",
    badge: "Contact Sales",
    badgeColor: "bg-amber-600",
    features: [
      "Custom token credits",
      "Unlimited users",
      "White-label option",
      "24/7 phone support",
      "Custom AI training on your data",
      "SLA guarantee (99.9% uptime)",
      "Dedicated account manager",
      "On-premise deployment option",
      "Custom contract terms",
      "Advanced security & compliance"
    ]
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showTopOffDialog, setShowTopOffDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const authenticated = await base44.auth.isAuthenticated();
        setIsAuthenticated(authenticated);
        
        if (authenticated) {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
          
          const orgs = await base44.entities.Organization.filter(
            { created_by: currentUser.email },
            '-created_date',
            1
          );
          if (orgs.length > 0) {
            setOrganization(orgs[0]);
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUserData();
  }, []);

  const { data: subscription } = useQuery({
    queryKey: ['subscription', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      const subs = await base44.entities.Subscription.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );
      return subs.length > 0 ? subs[0] : null;
    },
    enabled: !!organization?.id,
  });

  const upgradeMutation = useMutation({
    mutationFn: async (planId) => {
      const plan = PLANS.find(p => p.id === planId);
      if (!subscription || !organization) return;

      await base44.entities.Subscription.update(subscription.id, {
        plan_type: planId,
        token_credits: plan.credits,
        max_users: plan.users,
        monthly_price: plan.price,
        status: "active"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setShowUpgradeDialog(false);
      alert("✓ Plan upgraded successfully! Your new token credits are now available.");
    },
  });

  const topOffMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) return;

      await base44.entities.Subscription.update(subscription.id, {
        token_credits: subscription.token_credits + 200000
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setShowTopOffDialog(false);
      alert("✓ 200K tokens added successfully!");
    },
  });

  const handlePlanAction = (plan) => {
    if (!isAuthenticated) {
      base44.auth.redirectToLogin(createPageUrl("Pricing"));
      return;
    }

    if (!organization) {
      navigate(createPageUrl("Onboarding"));
      return;
    }

    if (plan.id === "enterprise") {
      window.location.href = "mailto:sales@proposaliq.ai?subject=Enterprise Plan Inquiry";
      return;
    }

    if (subscription && subscription.plan_type === plan.id) {
      return; // Already on this plan
    }

    setSelectedPlan(plan);
    setShowUpgradeDialog(true);
  };

  const handleTopOff = () => {
    if (!isAuthenticated) {
      base44.auth.redirectToLogin(createPageUrl("Pricing"));
      return;
    }

    setShowTopOffDialog(true);
  };

  const tokenPercentage = subscription 
    ? ((subscription.token_credits - subscription.token_credits_used) / subscription.token_credits) * 100 
    : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(createPageUrl("Dashboard"))}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">ProposalIQ.ai</h1>
              <p className="text-xs text-slate-500">Pricing Plans</p>
            </div>
          </div>
          
          {isAuthenticated && (
            <Button variant="outline" onClick={() => navigate(createPageUrl("Dashboard"))}>
              Back to Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className="py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-4 bg-blue-100 text-blue-700 border-none">
            <TrendingUp className="w-3 h-3 mr-1" />
            Simple, Transparent Pricing
          </Badge>
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Scale your proposal writing with flexible plans designed for teams of all sizes. 
            All plans include our powerful AI proposal builder.
          </p>
          
          {/* Current Plan Status */}
          {subscription && (
            <Card className="max-w-2xl mx-auto border-none shadow-lg bg-white">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-left">
                    <p className="text-sm text-slate-600 mb-1">Current Plan</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-slate-900 capitalize">
                        {subscription.plan_type} Plan
                      </p>
                      <Badge>{subscription.status}</Badge>
                    </div>
                  </div>
                  <div className="flex-1 max-w-xs">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-600">Token Credits</span>
                      <span className="font-semibold">
                        {((subscription.token_credits - subscription.token_credits_used) / 1000).toFixed(0)}K / {(subscription.token_credits / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          tokenPercentage > 50 ? 'bg-green-500' :
                          tokenPercentage > 20 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${tokenPercentage}%` }}
                      />
                    </div>
                  </div>
                  <Button onClick={handleTopOff} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tokens
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => {
              const isCurrentPlan = subscription?.plan_type === plan.id;
              const PlanIcon = plan.icon;
              
              return (
                <Card 
                  key={plan.id}
                  className={`border-2 transition-all hover:shadow-2xl relative ${
                    isCurrentPlan 
                      ? 'border-green-500 shadow-xl' 
                      : plan.badge 
                      ? plan.borderColor + ' shadow-xl'
                      : 'border-slate-200 hover:' + plan.borderColor
                  }`}
                >
                  {plan.badge && !isCurrentPlan && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className={`${plan.badgeColor} text-white px-4 py-1`}>
                        {plan.badge}
                      </Badge>
                    </div>
                  )}
                  
                  {isCurrentPlan && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-green-600 text-white px-4 py-1">
                        <Check className="w-3 h-3 mr-1" />
                        Current Plan
                      </Badge>
                    </div>
                  )}

                  <CardHeader className={`bg-gradient-to-br ${plan.color} border-b`}>
                    <div className="flex items-center justify-between mb-4">
                      <PlanIcon className="w-10 h-10 text-slate-700" />
                    </div>
                    <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-5xl font-bold text-slate-900">
                        {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                      </span>
                      {typeof plan.price === 'number' && (
                        <span className="text-slate-600 ml-2">/month</span>
                      )}
                    </div>
                    <CardDescription className="mt-3 text-slate-700">
                      {typeof plan.credits === 'number' 
                        ? `${(plan.credits / 1000).toFixed(0)}K tokens/month`
                        : `${plan.credits} tokens`}
                    </CardDescription>
                    <CardDescription className="text-slate-700">
                      {typeof plan.users === 'number' ? `${plan.users} user${plan.users > 1 ? 's' : ''}` : `${plan.users} users`}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-6">
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className={`w-full ${
                        isCurrentPlan 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : plan.badge 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                          : ''
                      }`}
                      variant={isCurrentPlan ? "default" : plan.badge ? "default" : "outline"}
                      disabled={isCurrentPlan}
                      onClick={() => handlePlanAction(plan)}
                    >
                      {isCurrentPlan ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Current Plan
                        </>
                      ) : plan.id === "enterprise" ? (
                        <>
                          Contact Sales
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        subscription ? 'Upgrade' : 'Get Started'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Token Top-Off Section */}
      <div className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-none shadow-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
            
            <CardContent className="p-8 md:p-12 relative z-10">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge className="mb-4 bg-white/20 text-white border-none">
                    <Star className="w-3 h-3 mr-1" />
                    Token Top-Off
                  </Badge>
                  <h2 className="text-3xl font-bold mb-4">
                    Need More Tokens?
                  </h2>
                  <p className="text-indigo-100 mb-6">
                    Running low on token credits mid-month? No problem! Top up your account with additional tokens anytime.
                  </p>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      <span>No subscription change required</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      <span>Instant token delivery</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      <span>Never run out of AI power</span>
                    </li>
                  </ul>
                </div>
                
                <Card className="bg-white text-slate-900 border-none shadow-xl">
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4">
                        <Plus className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Token Top-Off</h3>
                      <p className="text-slate-600">Add credits anytime</p>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600">Additional Tokens</span>
                        <span className="font-bold text-lg">200,000</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">One-time Cost</span>
                        <span className="font-bold text-3xl text-blue-600">$29</span>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      onClick={handleTopOff}
                      disabled={!isAuthenticated || !subscription}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Purchase 200K Tokens
                    </Button>
                    
                    {!isAuthenticated && (
                      <p className="text-xs text-slate-500 text-center mt-3">
                        Sign in to purchase tokens
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="space-y-4">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">What happens if I run out of tokens?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  If you run out of tokens, you can either upgrade to a higher plan that includes more monthly tokens, or purchase a one-time token top-off of 200K tokens for $29. Your AI features will be temporarily unavailable until you add more tokens.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">How many proposals can I write with my tokens?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  On average, a comprehensive full proposal with all sections uses approximately 126,000 tokens. This means the Free plan (200K tokens) can generate 1-2 full proposals, Pro plan (1M tokens) can generate 7-8 proposals, and Power plan (5M tokens) can generate 35-40 proposals per month.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Can I change plans at any time?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Yes! You can upgrade or downgrade your plan at any time. When you upgrade, you'll immediately get access to the new token allocation and user seats. Unused tokens do not roll over when changing plans.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">What's included in all plans?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  All plans include access to our 7-phase AI proposal builder, document upload, AI chat assistant, proposal evaluation, and secure cloud storage. Higher tiers unlock additional AI models, team collaboration features, and priority support.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to {selectedPlan?.name}?</DialogTitle>
            <DialogDescription>
              You'll immediately get access to {(selectedPlan?.credits / 1000).toFixed(0)}K token credits and {selectedPlan?.users} user seats.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-700">New Monthly Cost</span>
                <span className="text-2xl font-bold text-blue-600">${selectedPlan?.price}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Token Credits</span>
                <span className="font-semibold">{(selectedPlan?.credits / 1000).toFixed(0)}K/month</span>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Your current tokens will be replaced with the new plan's token allocation. This change takes effect immediately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => upgradeMutation.mutate(selectedPlan?.id)}
              disabled={upgradeMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {upgradeMutation.isPending ? "Upgrading..." : "Confirm Upgrade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Top-Off Dialog */}
      <Dialog open={showTopOffDialog} onOpenChange={setShowTopOffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add 200K Token Credits</DialogTitle>
            <DialogDescription>
              Top up your account with an additional 200,000 tokens for $29
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-700">Current Tokens</span>
                <span className="font-semibold">
                  {subscription ? ((subscription.token_credits - subscription.token_credits_used) / 1000).toFixed(0) : 0}K
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-700">Additional Tokens</span>
                <span className="font-semibold text-green-600">+200K</span>
              </div>
              <div className="border-t border-indigo-300 my-2"></div>
              <div className="flex items-center justify-between">
                <span className="text-slate-900 font-semibold">New Total</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {subscription ? ((subscription.token_credits - subscription.token_credits_used + 200000) / 1000).toFixed(0) : 200}K
                </span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">One-time Cost</span>
                <span className="text-3xl font-bold text-slate-900">$29</span>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              These tokens will be added to your account immediately and do not expire.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTopOffDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => topOffMutation.mutate()}
              disabled={topOffMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {topOffMutation.isPending ? "Processing..." : "Purchase for $29"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}