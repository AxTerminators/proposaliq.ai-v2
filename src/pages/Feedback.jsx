
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MessageSquare, 
  Plus, 
  Search,
  Bug,
  Lightbulb,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import moment from "moment";
import UniversalAlert from "../components/ui/UniversalAlert";

// Helper function to get user's active organization
async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = null;
  if (user.active_client_id) {
    orgId = user.active_client_id;
  } else if (user.client_accesses && user.client_accesses.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  } else {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );
    if (orgs.length > 0) {
      orgId = orgs[0].id;
    }
  }
  if (orgId) {
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    if (orgs.length > 0) {
      return orgs[0];
    }
  }
  return null;
}

export default function Feedback() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  
  // Universal Alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "info",
    title: "",
    description: ""
  });
  
  const [feedbackData, setFeedbackData] = useState({
    issue_type: "bug",
    priority: "medium",
    title: "",
    description: "",
    steps_to_reproduce: "",
    expected_behavior: "",
    actual_behavior: ""
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['feedback', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Feedback.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const createFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Feedback.create({
        ...data,
        organization_id: organization.id,
        reporter_email: user.email,
        reporter_name: user.full_name,
        page_url: window.location.href,
        browser_info: navigator.userAgent
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
      setShowDialog(false);
      resetForm();
      setAlertConfig({
        type: "success",
        title: "Feedback Submitted",
        description: "Thank you! Your feedback has been submitted successfully."
      });
      setShowAlert(true);
    },
  });

  const resetForm = () => {
    setFeedbackData({
      issue_type: "bug",
      priority: "medium",
      title: "",
      description: "",
      steps_to_reproduce: "",
      expected_behavior: "",
      actual_behavior: ""
    });
  };

  const handleSubmit = () => {
    if (feedbackData.title.trim() && feedbackData.description.trim()) {
      createFeedbackMutation.mutate(feedbackData);
    }
  };

  const filteredFeedback = feedback.filter(f => 
    f.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    const colors = {
      new: "bg-blue-100 text-blue-800",
      in_progress: "bg-amber-100 text-amber-800",
      resolved: "bg-green-100 text-green-800",
      closed: "bg-slate-100 text-slate-800",
      wont_fix: "bg-red-100 text-red-800"
    };
    return colors[status] || colors.new;
  };

  const getTypeIcon = (type) => {
    const icons = {
      bug: Bug,
      feature_request: Lightbulb,
      question: HelpCircle,
      improvement: AlertCircle,
      other: MessageSquare
    };
    const Icon = icons[type] || MessageSquare;
    return <Icon className="w-4 h-4" />;
  };

  if (!organization || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Feedback & Support</h1>
          <p className="text-slate-600">Report issues and suggest improvements</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-5 h-5 mr-2" />
          Submit Feedback
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search feedback..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredFeedback.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Feedback Yet</h3>
            <p className="text-slate-600 mb-6">
              Have a bug to report or feature to suggest?
            </p>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="w-5 h-5 mr-2" />
              Submit Your First Feedback
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFeedback.map((item) => (
            <Card key={item.id} className="border-none shadow-md hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {getTypeIcon(item.issue_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900 line-clamp-2">{item.title}</h3>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">{item.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{moment(item.created_date).fromNow()}</span>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {item.issue_type?.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="capitalize text-xs">
                        {item.priority}
                      </Badge>
                    </div>
                    {item.public_response && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900">{item.public_response}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { 
        setShowDialog(open); 
        if (!open) resetForm(); 
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Feedback</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type *</label>
              <select
                className="w-full border rounded-md p-2"
                value={feedbackData.issue_type}
                onChange={(e) => setFeedbackData({ ...feedbackData, issue_type: e.target.value })}
              >
                <option value="bug">Bug Report</option>
                <option value="feature_request">Feature Request</option>
                <option value="question">Question</option>
                <option value="improvement">Improvement</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                className="w-full border rounded-md p-2"
                value={feedbackData.priority}
                onChange={(e) => setFeedbackData({ ...feedbackData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <Input
                value={feedbackData.title}
                onChange={(e) => setFeedbackData({ ...feedbackData, title: e.target.value })}
                placeholder="Brief summary of the issue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <Textarea
                value={feedbackData.description}
                onChange={(e) => setFeedbackData({ ...feedbackData, description: e.target.value })}
                placeholder="Detailed description"
                rows={4}
              />
            </div>

            {feedbackData.issue_type === 'bug' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Steps to Reproduce</label>
                  <Textarea
                    value={feedbackData.steps_to_reproduce}
                    onChange={(e) => setFeedbackData({ ...feedbackData, steps_to_reproduce: e.target.value })}
                    placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Expected Behavior</label>
                    <Textarea
                      value={feedbackData.expected_behavior}
                      onChange={(e) => setFeedbackData({ ...feedbackData, expected_behavior: e.target.value })}
                      placeholder="What should happen"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Actual Behavior</label>
                    <Textarea
                      value={feedbackData.actual_behavior}
                      onChange={(e) => setFeedbackData({ ...feedbackData, actual_behavior: e.target.value })}
                      placeholder="What actually happens"
                      rows={2}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!feedbackData.title.trim() || !feedbackData.description.trim() || createFeedbackMutation.isPending}
              >
                {createFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UniversalAlert
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        type={alertConfig.type}
        title={alertConfig.title}
        description={alertConfig.description}
      />
    </div>
  );
}
