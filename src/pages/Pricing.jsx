
import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown, Building2, Shield } from "lucide-react";

export default function PricingPage() {
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await base44.auth.isAuthenticated();
        if (authenticated) {
          const user = await base44.auth.me();
          setIsSuperAdmin(user?.admin_role === 'super_admin');
        }
      } catch (error) {
        console.error("Failed to check authentication status:", error);
        // Don't redirect - this is a public page
        setIsSuperAdmin(false);
      }
    };
    checkAuth();
  }, []);

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started",
      icon: Sparkles,
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      features: [
        "1 user",
        "5 proposals per month",
        "Basic AI assistance",
        "200K token credits/month",
        "Email support"
      ]
    },
    {
      name: "Pro",
      price: "$49",
      period: "per month",
      description: "For growing teams",
      icon: Zap,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      popular: true,
      features: [
        "Up to 5 users",
        "Unlimited proposals",
        "Advanced AI features",
        "1M token credits/month",
        "Priority support",
        "Team collaboration",
        "Export templates"
      ]
    },
    {
      name: "Power",
      price: "$149",
      period: "per month",
      description: "For high-volume teams",
      icon: Crown,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      features: [
        "Up to 20 users",
        "Unlimited proposals",
        "Premium AI models",
        "5M token credits/month",
        "Premium support",
        "Advanced analytics",
        "Custom branding",
        "API access"
      ]
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      description: "For large organizations",
      icon: Building2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      features: [
        "Unlimited users",
        "Unlimited proposals",
        "Dedicated AI resources",
        "Custom token allocation",
        "24/7 dedicated support",
        "Custom integrations",
        "On-premise options",
        "SLA guarantees"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Super Admin Banner */}
      {isSuperAdmin && (
        <div className="bg-red-600 text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5" />
            <div>
              <p className="font-semibold">Super Admin Preview Mode</p>
              <p className="text-sm text-red-100">Viewing public pricing page</p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="bg-white text-red-600 hover:bg-red-50"
            onClick={() => navigate(createPageUrl("AdminPortal") + "?tab=admin-pages")}
          >
            Back to Admin
          </Button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Choose the plan that's right for your team
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            All plans include AI-powered proposal generation
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {plans.map((plan, idx) => (
            <Card 
              key={idx}
              className={`relative border-none shadow-xl hover:shadow-2xl transition-all ${
                plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-4 py-1">Most Popular</Badge>
                </div>
              )}
              <CardHeader className={`${plan.bgColor} border-b`}>
                <div className="flex items-center justify-between mb-2">
                  <plan.icon className={`w-8 h-8 ${plan.color}`} />
                  {plan.popular && <Sparkles className="w-5 h-5 text-blue-600" />}
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  {plan.period !== "contact us" && (
                    <span className="text-slate-500 ml-2">/{plan.period}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2">
                      <Check className={`w-5 h-5 ${plan.color} flex-shrink-0 mt-0.5`} />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-slate-800 hover:bg-slate-900'
                  }`}
                  onClick={() => navigate(createPageUrl("Onboarding"))}
                >
                  {plan.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Comparison Note */}
        <div className="text-center">
          <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Not sure which plan is right for you?
              </h3>
              <p className="text-slate-600 mb-6">
                Start with our Free plan and upgrade anytime as your needs grow. No credit card required.
              </p>
              <div className="flex justify-center gap-4">
                <Button 
                  size="lg"
                  onClick={() => navigate(createPageUrl("Onboarding"))}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Start Free Trial
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => window.location.href = "mailto:support@proposaliq.ai"}
                >
                  Contact Sales
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ or Additional Info Section (Placeholder) */}
        <div className="mt-16 text-center text-sm text-slate-500">
          <p>All plans include a 14-day money-back guarantee. Cancel anytime.</p>
          <p className="mt-2">Questions? Email us at support@proposaliq.ai</p>
        </div>
      </div>
    </div>
  );
}
