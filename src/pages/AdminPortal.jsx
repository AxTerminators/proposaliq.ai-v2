import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, 
  Database,
  Users,
  FileText,
  Upload,
  Trash2,
  Eye,
  Building2,
  TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminPortal() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showNewData, setShowNewData] = useState(false);
  const [newData, setNewData] = useState({
    data_type: "far_regulation",
    title: "",
    content: "",
    category: "",
    is_public: true,
    is_proprietary: false
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.role !== 'admin') {
          window.location.href = '/';
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: adminData } = useQuery({
    queryKey: ['admin-data'],
    queryFn: () => base44.entities.AdminData.list('-created_date'),
    initialData: []
  });

  const { data: organizations } = useQuery({
    queryKey: ['all-organizations'],
    queryFn: () => base44.entities.Organization.list('-created_date'),
    initialData: []
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['all-subscriptions'],
    queryFn: () => base44.entities.Subscription.list('-created_date'),
    initialData: []
  });

  const { data: proposals } = useQuery({
    queryKey: ['all-proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date'),
    initialData: []
  });

  const { data: tokenUsage } = useQuery({
    queryKey: ['all-token-usage'],
    queryFn: () => base44.entities.TokenUsage.list('-created_date', 100),
    initialData: []
  });

  const createDataMutation = useMutation({
    mutationFn: (data) => base44.entities.AdminData.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-data'] });
      setShowNewData(false);
      setNewData({
        data_type: "far_regulation",
        title: "",
        content: "",
        category: "",
        is_public: true,
        is_proprietary: false
      });
    }
  });

  const deleteDataMutation = useMutation({
    mutationFn: (id) => base44.entities.AdminData.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-data'] });
    }
  });

  const handleFileUpload = async (files) => {
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        const content = await base44.integrations.Core.InvokeLLM({
          prompt: `Extract and summarize the key information from this document. Provide a structured summary.`,
          file_urls: [file_url]
        });

        await base44.entities.AdminData.create({
          data_type: "training_material",
          title: file.name,
          content: content,
          file_url: file_url,
          category: "uploaded",
          is_public: true
        });
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['admin-data'] });
  };

  const totalTokensUsed = tokenUsage.reduce((sum, usage) => sum + (usage.tokens_used || 0), 0);
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.monthly_price || 0), 0);

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Portal</h1>
          <p className="text-slate-600">Manage platform data and monitor system health</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{organizations.length}</p>
            <p className="text-xs text-slate-500 mt-1">Total registered</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activeSubscriptions}</p>
            <p className="text-xs text-slate-500 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Total Proposals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{proposals.length}</p>
            <p className="text-xs text-slate-500 mt-1">Platform-wide</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">${totalRevenue}</p>
            <p className="text-xs text-slate-500 mt-1">Monthly recurring</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="data" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="data">Training Data</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="usage">Token Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-4">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Platform Training Data</CardTitle>
                  <CardDescription>Manage FAR, DFARS, templates, and training materials</CardDescription>
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                    className="hidden"
                    id="admin-upload"
                  />
                  <label htmlFor="admin-upload">
                    <Button asChild>
                      <span className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Files
                      </span>
                    </Button>
                  </label>
                  <Button onClick={() => setShowNewData(true)}>
                    <Database className="w-4 h-4 mr-2" />
                    Add Data
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {showNewData && (
                <Card className="mb-6 bg-slate-50">
                  <CardContent className="p-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data Type</Label>
                        <Select
                          value={newData.data_type}
                          onValueChange={(value) => setNewData({...newData, data_type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="far_regulation">FAR Regulation</SelectItem>
                            <SelectItem value="dfars">DFARS</SelectItem>
                            <SelectItem value="training_material">Training Material</SelectItem>
                            <SelectItem value="template">Template</SelectItem>
                            <SelectItem value="guideline">Guideline</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Input
                          value={newData.category}
                          onChange={(e) => setNewData({...newData, category: e.target.value})}
                          placeholder="e.g., FAR Part 15"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={newData.title}
                        onChange={(e) => setNewData({...newData, title: e.target.value})}
                        placeholder="Data title..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea
                        value={newData.content}
                        onChange={(e) => setNewData({...newData, content: e.target.value})}
                        rows={6}
                        placeholder="Enter content..."
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newData.is_public}
                          onChange={(e) => setNewData({...newData, is_public: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Public (available to all users)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newData.is_proprietary}
                          onChange={(e) => setNewData({...newData, is_proprietary: e.target.checked})}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Proprietary (PIQ only)</span>
                      </label>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowNewData(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => createDataMutation.mutate(newData)}
                        disabled={!newData.title || !newData.content}
                      >
                        Save Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {adminData.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No training data yet</p>
                ) : (
                  adminData.map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg hover:border-blue-300 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-slate-900">{item.title}</h3>
                            <Badge variant="outline" className="capitalize text-xs">
                              {item.data_type?.replace(/_/g, ' ')}
                            </Badge>
                            {item.is_proprietary && (
                              <Badge className="bg-red-100 text-red-700 text-xs">Proprietary</Badge>
                            )}
                            {item.is_public && (
                              <Badge className="bg-green-100 text-green-700 text-xs">Public</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">{item.content}</p>
                          {item.category && (
                            <p className="text-xs text-slate-500 mt-1">Category: {item.category}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteDataMutation.mutate(item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>All Organizations</CardTitle>
              <CardDescription>View and manage registered organizations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {organizations.map((org) => (
                  <div key={org.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{org.organization_name}</h3>
                        <p className="text-sm text-slate-600 mt-1">{org.contact_email}</p>
                        <div className="flex gap-2 mt-2">
                          {org.certifications?.slice(0, 3).map((cert, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          Created: {new Date(org.created_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Subscription Management</CardTitle>
              <CardDescription>Monitor all subscriptions and billing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="capitalize">{sub.plan_type}</Badge>
                          <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                            {sub.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          {((sub.token_credits - sub.token_credits_used) / 1000).toFixed(0)}K / {(sub.token_credits / 1000).toFixed(0)}K tokens
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          ${sub.monthly_price}/mo
                        </p>
                        <p className="text-xs text-slate-500">
                          {sub.max_users} users
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Token Usage Analytics</CardTitle>
              <CardDescription>
                Total tokens used: {(totalTokensUsed / 1000000).toFixed(2)}M
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tokenUsage.slice(0, 20).map((usage) => (
                  <div key={usage.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="capitalize text-xs">
                            {usage.feature_type?.replace(/_/g, ' ')}
                          </Badge>
                          <Badge className="text-xs">{usage.llm_provider}</Badge>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1">
                          {usage.prompt?.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-slate-900">
                          {(usage.tokens_used / 1000).toFixed(1)}K
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(usage.created_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}