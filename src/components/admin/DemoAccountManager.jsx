import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  Building2,
  Users,
  Briefcase,
  ExternalLink,
  Zap
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function DemoAccountManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  
  const [demoFormData, setDemoFormData] = useState({
    owner_email: '',
    organization_name: '',
    demo_view_mode: 'corporate'
  });

  // Fetch all demo organizations
  const { data: demoOrgs = [], isLoading } = useQuery({
    queryKey: ['demo-organizations'],
    queryFn: async () => {
      return base44.entities.Organization.filter({
        organization_type: 'demo'
      }, '-created_date');
    },
    initialData: [],
  });

  // Create demo organization mutation
  const createDemoMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createDemoOrganizationAndSeedData', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['demo-organizations'] });
      setShowCreateDialog(false);
      setDemoFormData({
        owner_email: '',
        organization_name: '',
        demo_view_mode: 'corporate'
      });
      
      alert(`✅ ${data.message}\n\n📊 Data Created:\n` +
        `• ${data.data_created.proposals} Proposals\n` +
        `• ${data.data_created.past_performance} Past Performance\n` +
        `• ${data.data_created.key_personnel} Key Personnel\n` +
        `• ${data.data_created.teaming_partners} Teaming Partners\n` +
        `• ${data.data_created.clients} Clients\n` +
        `• ${data.data_created.resources} Resources\n` +
        `• ${data.data_created.boards} Kanban Boards\n\n` +
        `🎯 Demo account ready to use!`
      );
    },
    onError: (error) => {
      alert('Error creating demo account: ' + error.message);
    }
  });

  // Delete demo organization mutation
  const deleteDemoMutation = useMutation({
    mutationFn: async (orgId) => {
      // Delete all related data first
      await base44.entities.Proposal.bulkDelete({ organization_id: orgId });
      await base44.entities.PastPerformance.bulkDelete({ organization_id: orgId });
      await base44.entities.KeyPersonnel.bulkDelete({ organization_id: orgId });
      await base44.entities.TeamingPartner.bulkDelete({ organization_id: orgId });
      await base44.entities.Client.bulkDelete({ organization_id: orgId });
      await base44.entities.ProposalResource.bulkDelete({ organization_id: orgId });
      await base44.entities.Folder.bulkDelete({ organization_id: orgId });
      await base44.entities.KanbanConfig.bulkDelete({ organization_id: orgId });
      await base44.entities.Subscription.bulkDelete({ organization_id: orgId });
      
      // Finally delete the organization
      return base44.entities.Organization.delete(orgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo-organizations'] });
      alert('✅ Demo account deleted successfully');
    },
    onError: (error) => {
      alert('Error deleting demo account: ' + error.message);
    }
  });

  const handleCreateDemo = async () => {
    if (!demoFormData.owner_email.trim() || !demoFormData.organization_name.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setCreatingDemo(true);
    try {
      await createDemoMutation.mutateAsync(demoFormData);
    } finally {
      setCreatingDemo(false);
    }
  };

  const handleQuickCreate = (salespersonName) => {
    setDemoFormData({
      owner_email: currentUser.email,
      organization_name: `Demo Account - ${salespersonName}`,
      demo_view_mode: 'corporate'
    });
    setShowCreateDialog(true);
  };

  const getViewModeIcon = (mode) => {
    return mode === 'consultancy' ? <Briefcase className="w-4 h-4" /> : <Building2 className="w-4 h-4" />;
  };

  const getViewModeColor = (mode) => {
    return mode === 'consultancy' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Demo Accounts</h2>
          <p className="text-slate-600">Create and manage demo accounts for sales and testing</p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Demo Account
        </Button>
      </div>

      {/* Quick Create Templates */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Zap className="w-5 h-5" />
            Quick Create Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 border-2 hover:border-purple-400 hover:bg-purple-50"
              onClick={() => handleQuickCreate('Sales Demo')}
            >
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="font-semibold">Sales Demo</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 border-2 hover:border-blue-400 hover:bg-blue-50"
              onClick={() => handleQuickCreate('Training Demo')}
            >
              <Users className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">Training Demo</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 border-2 hover:border-green-400 hover:bg-green-50"
              onClick={() => handleQuickCreate('Testing Demo')}
            >
              <RefreshCw className="w-5 h-5 text-green-600" />
              <span className="font-semibold">Testing Demo</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Demo Organizations List */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : demoOrgs.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Demo Accounts Yet</h3>
            <p className="text-slate-600 mb-6">
              Create demo accounts for sales demonstrations and testing
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Demo Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {demoOrgs.map((org) => (
            <Card key={org.id} className="border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{org.organization_name}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-purple-600 text-white">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Demo Account
                      </Badge>
                      <Badge className={getViewModeColor(org.demo_view_mode)}>
                        {getViewModeIcon(org.demo_view_mode)}
                        <span className="ml-1 capitalize">{org.demo_view_mode} View</span>
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Delete demo account "${org.organization_name}"?\n\nThis will delete all associated data and cannot be undone.`)) {
                        deleteDemoMutation.mutate(org.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-slate-500">Owner</p>
                    <p className="font-medium text-slate-900">{org.contact_email}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Created</p>
                    <p className="font-medium text-slate-900">
                      {new Date(org.created_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={async () => {
                      // Switch to this demo account
                      await base44.auth.updateMe({
                        active_client_id: org.id
                      });
                      window.location.reload();
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Switch To This Demo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setCreatingDemo(true);
                      try {
                        await createDemoMutation.mutateAsync({
                          owner_email: org.contact_email,
                          organization_name: `${org.organization_name} (Refreshed)`,
                          demo_view_mode: org.demo_view_mode
                        });
                      } finally {
                        setCreatingDemo(false);
                      }
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Demo Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Create Demo Account
            </DialogTitle>
            <DialogDescription>
              Set up a fully-featured demo account with pre-populated mock data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="demo-name">Demo Organization Name *</Label>
              <Input
                id="demo-name"
                value={demoFormData.organization_name}
                onChange={(e) => setDemoFormData({...demoFormData, organization_name: e.target.value})}
                placeholder="e.g., Demo Account - John Sales"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-email">Owner Email *</Label>
              <Input
                id="owner-email"
                type="email"
                value={demoFormData.owner_email}
                onChange={(e) => setDemoFormData({...demoFormData, owner_email: e.target.value})}
                placeholder="salesperson@company.com"
              />
              <p className="text-xs text-slate-500">
                This user will be the admin/owner of the demo account
              </p>
            </div>

            <div className="space-y-2">
              <Label>Initial View Mode</Label>
              <Select
                value={demoFormData.demo_view_mode}
                onValueChange={(value) => setDemoFormData({...demoFormData, demo_view_mode: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span>Corporate View</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="consultancy">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      <span>Consultancy View</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                User can switch between views later from the demo account
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-900">
                  <p className="font-semibold mb-1">What will be created:</p>
                  <ul className="text-xs space-y-1">
                    <li>✓ Demo organization with generous token limits</li>
                    <li>✓ 6+ mock proposals in various stages</li>
                    <li>✓ Complete content library with folders</li>
                    <li>✓ Sample past performance, personnel, partners</li>
                    <li>✓ Mock clients (for consultancy view)</li>
                    <li>✓ Tasks, discussions, and supporting data</li>
                    <li>✓ All features enabled for testing</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateDemo}
              disabled={creatingDemo || !demoFormData.owner_email.trim() || !demoFormData.organization_name.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {creatingDemo ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Creating Demo...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Demo Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}