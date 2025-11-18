import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Check, 
  Crown, 
  Zap,
  Rocket,
  Users,
  CreditCard,
  TrendingUp,
  Calendar
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PLANS = [
  {
    id: "free",
    name: "Free Plan",
    price: 0,
    credits: 200000,
    users: 1,
    icon: Users,
    color: "bg-slate-100 text-slate-700",
    features: [
      "200K token credits",
      "1 user account",
      "Basic AI features",
      "Community support"
    ]
  },
  {
    id: "pro",
    name: "Pro Plan",
    price: 99,
    credits: 1000000,
    users: 3,
    icon: Zap,
    color: "bg-blue-100 text-blue-700",
    badge: "Popular",
    features: [
      "1M token credits",
      "3 user accounts",
      "Advanced AI features",
      "Priority support",
      "Multi-LLM access",
      "Custom templates"
    ]
  },
  {
    id: "power",
    name: "Power Plan",
    price: 499,
    credits: 5000000,
    users: 10,
    icon: Rocket,
    color: "bg-purple-100 text-purple-700",
    features: [
      "5M token credits",
      "10 user accounts",
      "All AI features",
      "Dedicated support",
      "API access",
      "Custom integrations",
      "Advanced analytics"
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise Plan",
    price: "Custom",
    credits: "Unlimited",
    users: "Unlimited",
    icon: Crown,
    color: "bg-amber-100 text-amber-700",
    badge: "Contact Us",
    features: [
      "Custom token credits",
      "Unlimited users",
      "White-label option",
      "24/7 phone support",
      "Custom AI training",
      "SLA guarantee",
      "Dedicated account manager"
    ]
  }
];

const LLMS = [
  { value: "gemini", label: "Google Gemini 2.5", description: "Best for comprehensive analysis" },
  { value: "claude", label: "Anthropic Claude", description: "Excellent for writing quality" },
  { value: "chatgpt", label: "OpenAI ChatGPT", description: "Great all-around performance" }
];

export default function Subscription() {
  const queryClient = useQueryClient();
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    const loadOrg = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter({ created_by: user.email }, '-created_date', 1);
        if (orgs.length > 0) setOrganization(orgs[0]);
      } catch (error) {
        console.error("Error loading org:", error);
      }
    };
    loadOrg();
  }, []);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.list('-created_date', 1);
      if (subs.length === 0 && organization) {
        const newSub = await base44.entities.Subscription.create({
          organization_id: organization.id,
          plan_type: "free",
          token_credits: 200000,
          max_users: 1,
          monthly_price: 0,
          status: "active",
          preferred_llm: "gemini"
        });
        return newSub;
      }
      return subs[0];
    },
    enabled: !!organization,
    initialData: null
  });

  const { data: usage } = useQuery({
    queryKey: ['token-usage'],
    queryFn: () => base44.entities.TokenUsage.list('-created_date', 100),
    initialData: []
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Subscription.update(subscription.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  });

  if (isLoading || !subscription) {
    return <div className="p-8">Loading...</div>;
  }

  const tokenPercentage = ((subscription.token_credits - subscription.token_credits_used) / subscription.token_credits) * 100;
  const currentPlan = PLANS.find(p => p.id === subscription.plan_type) || PLANS[0];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Subscription & Billing</h1>
        <p className="text-slate-600">Manage your plan, credits, and AI preferences</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {React.createElement(currentPlan.icon, { className: "w-5 h-5" })}
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-slate-900">{currentPlan.name}</p>
                <p className="text-slate-600 mt-1">
                  ${typeof currentPlan.price === 'number' ? currentPlan.price : '—'}/month
                </p>
              </div>
              <Badge className={currentPlan.color}>
                {subscription.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5" />
              Token Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {((subscription.token_credits - subscription.token_credits_used) / 1000).toFixed(0)}K
                </p>
                <p className="text-slate-600 mt-1">
                  of {(subscription.token_credits / 1000).toFixed(0)}K available
                </p>
              </div>
              <Progress value={tokenPercentage} className="h-2" />
              {tokenPercentage < 20 && (
                <p className="text-sm text-red-600">Running low on credits!</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5" />
              Usage Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Requests</span>
                <span className="font-semibold">{usage.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">This Month</span>
                <span className="font-semibold">
                  {((subscription.token_credits_used) / 1000).toFixed(0)}K tokens
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Users</span>
                <span className="font-semibold">
                  {subscription.max_users} max
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>AI Model Preference</CardTitle>
          <CardDescription>Choose your preferred AI model for proposal generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select
              value={subscription.preferred_llm}
              onValueChange={(value) => updateMutation.mutate({ preferred_llm: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LLMS.map(llm => (
                  <SelectItem key={llm.value} value={llm.value}>
                    <div>
                      <p className="font-medium">{llm.label}</p>
                      <p className="text-xs text-slate-500">{llm.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subscription.plan_type === 'free' && (
              <p className="text-sm text-amber-600">
                ⚠️ Multi-LLM support requires Pro plan or higher
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Available Plans</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <Card 
              key={plan.id}
              className={`border-2 transition-all ${
                subscription.plan_type === plan.id 
                  ? 'border-blue-500 shadow-xl' 
                  : 'border-slate-200 hover:border-blue-300 hover:shadow-lg'
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <plan.icon className="w-8 h-8 text-blue-600" />
                  {plan.badge && (
                    <Badge className="bg-blue-100 text-blue-700">{plan.badge}</Badge>
                  )}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">
                    {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                  </span>
                  {typeof plan.price === 'number' && (
                    <span className="text-slate-600">/month</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full"
                  variant={subscription.plan_type === plan.id ? "outline" : "default"}
                  disabled={subscription.plan_type === plan.id}
                >
                  {subscription.plan_type === plan.id ? "Current Plan" : 
                   plan.id === "enterprise" ? "Contact Sales" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Recent Token Usage</CardTitle>
          <CardDescription>Detailed breakdown of your AI usage</CardDescription>
        </CardHeader>
        <CardContent>
          {usage.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No usage data yet</p>
          ) : (
            <div className="space-y-2">
              {usage.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-900 capitalize">
                      {item.feature_type?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(item.created_date).toLocaleDateString()} • {item.llm_provider}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-slate-900">
                      {(item.tokens_used / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-slate-500">tokens</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}