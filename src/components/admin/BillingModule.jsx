
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Search, 
  CreditCard,
  TrendingUp,
  Users,
  AlertCircle
} from "lucide-react";
import { hasPermission, logAdminAction } from "./PermissionChecker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BillingModule({ currentUser }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);
  const [creditsToAdd, setCreditsToAdd] = useState(200000);

  const { data: subscriptions } = useQuery({
    queryKey: ['all-subscriptions'],
    queryFn: () => base44.entities.Subscription.list('-created_date'),
    initialData: []
  });

  const { data: organizations } = useQuery({
    queryKey: ['all-orgs-billing'],
    queryFn: () => base44.entities.Organization.list('-created_date'),
    initialData: []
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ subId, updates }) => {
      await base44.entities.Subscription.update(subId, updates);
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
      await logAdminAction('subscription_modified', variables.updates, variables.subId);
      setShowEditDialog(false);
      setShowCreditsDialog(false);
      alert("Subscription updated successfully");
    }
  });

  const handleEditSubscription = (sub) => {
    setSelectedSubscription({...sub});
    setShowEditDialog(true);
  };

  const handleAddCredits = (sub) => {
    setSelectedSubscription({...sub});
    setShowCreditsDialog(true);
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const org = organizations.find(o => o.id === sub.organization_id);
    return org?.organization_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Check permissions
  const canEditBilling = hasPermission(currentUser, "manage_billing");
  const canViewBilling = hasPermission(currentUser, "view_billing") || canEditBilling;

  // Calculate revenue metrics
  const totalMRR = subscriptions.reduce((sum, sub) => sum + (sub.monthly_price || 0), 0);
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;
  const avgTokenUsage = subscriptions.reduce((sum, sub) => 
    sum + ((sub.token_credits_used || 0) / (sub.token_credits || 1)) * 100, 0
  ) / (subscriptions.length || 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Billing & Subscriptions</h2>
          <p className="text-slate-600">Manage customer plans, payments, and token credits</p>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Monthly Recurring Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">${totalMRR.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Total MRR</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activeSubscriptions}</p>
            <p className="text-xs text-slate-500 mt-1">of {subscriptions.length} total</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Avg Token Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{avgTokenUsage.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">Across all plans</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search by organization name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {filteredSubscriptions.map((sub) => {
              const org = organizations.find(o => o.id === sub.organization_id);
              const tokenPercentage = ((sub.token_credits - sub.token_credits_used) / sub.token_credits) * 100;
              
              return (
                <div key={sub.id} className="p-4 border rounded-lg hover:border-blue-300 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{org?.organization_name || 'Unknown Org'}</h3>
                        <Badge className={`capitalize ${
                          sub.status === 'active' ? 'bg-green-100 text-green-700' :
                          sub.status === 'suspended' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {sub.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {sub.plan_type} Plan
                        </Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600">Monthly Price</p>
                          <p className="font-semibold">${sub.monthly_price || 0}/month</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Token Credits</p>
                          <p className="font-semibold">
                            {((sub.token_credits - sub.token_credits_used) / 1000).toFixed(0)}K / {(sub.token_credits / 1000).toFixed(0)}K
                          </p>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                            <div 
                              className={`h-1.5 rounded-full ${
                                tokenPercentage > 50 ? 'bg-green-500' :
                                tokenPercentage > 20 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${tokenPercentage}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-600">Max Users</p>
                          <p className="font-semibold">{sub.max_users} users</p>
                        </div>
                      </div>
                    </div>
                    
                    {canEditBilling && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddCredits(sub)}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Add Credits
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSubscription(sub)}
                        >
                          Edit Plan
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {tokenPercentage < 20 && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                      <AlertCircle className="w-4 h-4" />
                      Low token credits - User may need to upgrade or purchase more
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredSubscriptions.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <DollarSign className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>No subscriptions found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Subscription Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Modify plan type, status, or pricing
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Plan Type</Label>
                <Select
                  value={selectedSubscription.plan_type}
                  onValueChange={(value) => setSelectedSubscription({...selectedSubscription, plan_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="power">Power</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={selectedSubscription.status}
                  onValueChange={(value) => setSelectedSubscription({...selectedSubscription, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Monthly Price ($)</Label>
                <Input
                  type="number"
                  value={selectedSubscription.monthly_price}
                  onChange={(e) => setSelectedSubscription({...selectedSubscription, monthly_price: parseFloat(e.target.value)})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Token Credits</Label>
                <Input
                  type="number"
                  value={selectedSubscription.token_credits}
                  onChange={(e) => setSelectedSubscription({...selectedSubscription, token_credits: parseInt(e.target.value)})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Max Users</Label>
                <Input
                  type="number"
                  value={selectedSubscription.max_users}
                  onChange={(e) => setSelectedSubscription({...selectedSubscription, max_users: parseInt(e.target.value)})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateSubscriptionMutation.mutate({
                  subId: selectedSubscription.id,
                  updates: {
                    plan_type: selectedSubscription.plan_type,
                    status: selectedSubscription.status,
                    monthly_price: selectedSubscription.monthly_price,
                    token_credits: selectedSubscription.token_credits,
                    max_users: selectedSubscription.max_users
                  }
                });
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Credits Dialog */}
      <Dialog open={showCreditsDialog} onOpenChange={setShowCreditsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Token Credits</DialogTitle>
            <DialogDescription>
              Add additional tokens to this subscription
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-700">Current Credits</span>
                  <span className="font-semibold">
                    {((selectedSubscription.token_credits - selectedSubscription.token_credits_used) / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">Total Allocation</span>
                  <span className="font-semibold">{(selectedSubscription.token_credits / 1000).toFixed(0)}K</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Credits to Add</Label>
                <Select
                  value={creditsToAdd.toString()}
                  onValueChange={(value) => setCreditsToAdd(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="200000">200,000 tokens</SelectItem>
                    <SelectItem value="500000">500,000 tokens</SelectItem>
                    <SelectItem value="1000000">1,000,000 tokens</SelectItem>
                    <SelectItem value="5000000">5,000,000 tokens</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-semibold">New Total</span>
                  <span className="text-2xl font-bold text-green-600">
                    {((selectedSubscription.token_credits + creditsToAdd) / 1000).toFixed(0)}K
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditsDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateSubscriptionMutation.mutate({
                  subId: selectedSubscription.id,
                  updates: {
                    token_credits: selectedSubscription.token_credits + creditsToAdd
                  }
                });
              }}
            >
              Add Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
