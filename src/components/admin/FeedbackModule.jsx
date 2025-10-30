
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  User,
  Building2,
  Calendar,
  Eye,
  UserCheck,
  Star
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import moment from "moment";

export default function FeedbackModule() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [publicResponse, setPublicResponse] = useState("");

  const { data: feedbackList, isLoading } = useQuery({
    queryKey: ['feedback-admin'],
    queryFn: async () => {
      return base44.entities.Feedback.list('-created_date');
    },
    initialData: [],
  });

  const { data: allUsers } = useQuery({
    queryKey: ['all-users-feedback'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  // Get admin/team members for assignment
  const teamMembers = allUsers.filter(u => u.admin_role || u.role === 'admin');

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes, assignedTo, publicResponse }) => {
      const updateData = {
        status,
        admin_notes: notes
      };
      
      if (publicResponse !== undefined) {
        updateData.public_response = publicResponse;
        updateData.consultant_response_date = new Date().toISOString();
      }
      
      if (assignedTo) {
        const assignedUser = teamMembers.find(u => u.email === assignedTo);
        updateData.assigned_to_email = assignedTo;
        updateData.assigned_to_name = assignedUser?.full_name || assignedTo;
        updateData.assigned_date = new Date().toISOString();
        const currentUser = await base44.auth.me();
        updateData.assigned_by = currentUser.email;
      }
      
      if (status === 'resolved' || status === 'closed') {
        const user = await base44.auth.me();
        updateData.resolved_date = new Date().toISOString();
        updateData.resolved_by = user.email;
        
        // Send resolution notification to user with rating request
        const feedback = feedbackList.find(f => f.id === id);
        if (feedback) {
          try {
            await base44.integrations.Core.SendEmail({
              from_name: "ProposalIQ.ai Support",
              to: feedback.reporter_email,
              subject: `Your feedback has been resolved: ${feedback.title}`,
              body: `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Your Feedback Has Been Resolved</h1>
    </div>
    
    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
      <p style="font-size: 16px; margin-bottom: 20px;">Hi ${feedback.reporter_name},</p>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        Great news! We've resolved your feedback about: <strong>${feedback.title}</strong>
      </p>
      
      ${publicResponse ? `
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #166534;"><strong>Our Response:</strong></p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #166534;">${publicResponse}</p>
        </div>
      ` : ''}
      
      ${notes ? `
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #166534;"><strong>Resolution Notes:</strong></p>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #166534;">${notes}</p>
        </div>
      ` : ''}
      
      <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="margin: 0 0 15px 0; font-size: 16px; color: #92400e;">
          <strong>📊 How did we do?</strong>
        </p>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #92400e;">
          We'd love to hear your feedback! Please rate how helpful our response was:
        </p>
        <div style="text-align: center;">
          <a href="https://app.proposaliq.ai/RateFeedback?id=${id}&rating=5" style="display: inline-block; margin: 5px; padding: 10px 20px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            ⭐⭐⭐⭐⭐ Excellent
          </a>
          <a href="https://app.proposaliq.ai/RateFeedback?id=${id}&rating=4" style="display: inline-block; margin: 5px; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            ⭐⭐⭐⭐ Good
          </a>
          <a href="https://app.proposaliq.ai/RateFeedback?id=${id}&rating=3" style="display: inline-block; margin: 5px; padding: 10px 20px; background: #eab308; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            ⭐⭐⭐ Fair
          </a>
          <a href="https://app.proposaliq.ai/RateFeedback?id=${id}&rating=2" style="display: inline-block; margin: 5px; padding: 10px 20px; background: #f97316; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            ⭐⭐ Poor
          </a>
          <a href="https://app.proposaliq.ai/RateFeedback?id=${id}&rating=1" style="display: inline-block; margin: 5px; padding: 10px 20px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            ⭐ Very Poor
          </a>
        </div>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        Thank you for helping us improve!<br>
        <strong>The ProposalIQ.ai Team</strong>
      </p>
    </div>
  </div>
</body>
</html>
              `
            });
          } catch (emailError) {
            console.error("Error sending resolution email:", emailError);
          }
        }
      }
      
      return base44.entities.Feedback.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-admin'] });
      setShowDetailsDialog(false);
      setPublicResponse("");
    },
  });

  const handleViewDetails = (feedback) => {
    setSelectedFeedback(feedback);
    setPublicResponse(feedback.public_response || "");
    setShowDetailsDialog(true);
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedFeedback) return;
    
    const notes = prompt(`Update status to "${status}". Add admin notes (optional):`);
    
    await updateStatusMutation.mutateAsync({
      id: selectedFeedback.id,
      status,
      notes: notes || selectedFeedback.admin_notes || "",
      publicResponse: publicResponse || selectedFeedback.public_response
    });
  };

  const handleAssign = async (assignedTo) => {
    if (!selectedFeedback) return;
    
    await updateStatusMutation.mutateAsync({
      id: selectedFeedback.id,
      status: selectedFeedback.status,
      notes: selectedFeedback.admin_notes || "",
      assignedTo
    });
  };

  const filteredFeedback = feedbackList.filter(item => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reporter_email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesType = typeFilter === "all" || item.issue_type === typeFilter;
    const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
    const matchesAssigned = assignedFilter === "all" || 
      (assignedFilter === "unassigned" && !item.assigned_to_email) ||
      (assignedFilter === "assigned" && item.assigned_to_email);
    
    return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesAssigned;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-700";
      case "in_progress": return "bg-amber-100 text-amber-700";
      case "resolved": return "bg-green-100 text-green-700";
      case "closed": return "bg-slate-100 text-slate-700";
      case "wont_fix": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "bug": return "bg-red-100 text-red-700";
      case "feature_request": return "bg-blue-100 text-blue-700";
      case "question": return "bg-purple-100 text-purple-700";
      case "improvement": return "bg-green-100 text-green-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-700";
      case "high": return "bg-orange-100 text-orange-700";
      case "medium": return "bg-amber-100 text-amber-700";
      case "low": return "bg-blue-100 text-blue-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const stats = {
    total: feedbackList.length,
    new: feedbackList.filter(f => f.status === 'new').length,
    inProgress: feedbackList.filter(f => f.status === 'in_progress').length,
    resolved: feedbackList.filter(f => f.status === 'resolved' || f.status === 'closed').length,
    unassigned: feedbackList.filter(f => !f.assigned_to_email).length,
    avgRating: feedbackList.filter(f => f.user_satisfaction_rating).length > 0
      ? (feedbackList.reduce((sum, f) => sum + (f.user_satisfaction_rating || 0), 0) / 
         feedbackList.filter(f => f.user_satisfaction_rating).length).toFixed(1)
      : 'N/A'
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <MessageSquare className="w-8 h-8 text-blue-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-slate-600">Total Feedback</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="w-8 h-8 text-amber-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.new}</p>
                <p className="text-xs text-slate-600">New</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Filter className="w-8 h-8 text-purple-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-slate-600">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-xs text-slate-600">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Star className="w-8 h-8 text-yellow-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.avgRating}</p>
                <p className="text-xs text-slate-600">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search feedback..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="wont_fix">Won't Fix</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="feature_request">Feature</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="improvement">Improvement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Items ({filteredFeedback.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading feedback...</div>
          ) : filteredFeedback.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No feedback found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFeedback.map((feedback) => (
                <div
                  key={feedback.id}
                  className="p-4 border rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleViewDetails(feedback)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900">{feedback.title}</h4>
                        <Badge className={getStatusColor(feedback.status)}>
                          {feedback.status.replace('_', ' ')}
                        </Badge>
                        {feedback.user_satisfaction_rating && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {Array(feedback.user_satisfaction_rating).fill('⭐').join('')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{feedback.description}</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getTypeColor(feedback.issue_type)}>
                      {feedback.issue_type.replace('_', ' ')}
                    </Badge>
                    <Badge className={getPriorityColor(feedback.priority)}>
                      {feedback.priority}
                    </Badge>
                    {feedback.assigned_to_email && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        <UserCheck className="w-3 h-3 mr-1" />
                        {feedback.assigned_to_name}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <User className="w-3 h-3" />
                      {feedback.reporter_name}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {moment(feedback.created_date).fromNow()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedFeedback && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedFeedback.title}
                <Badge className={getStatusColor(selectedFeedback.status)}>
                  {selectedFeedback.status.replace('_', ' ')}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <Badge className={getTypeColor(selectedFeedback.issue_type)}>
                    {selectedFeedback.issue_type.replace('_', ' ')}
                  </Badge>
                  <Badge className={getPriorityColor(selectedFeedback.priority)}>
                    {selectedFeedback.priority}
                  </Badge>
                  <span className="text-xs">ID: {selectedFeedback.id.substring(0, 8)}</span>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Assignment Section */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <Label className="font-semibold mb-2 block">Assign To Team Member</Label>
                <Select
                  value={selectedFeedback.assigned_to_email || ""}
                  onValueChange={handleAssign}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.email}>
                        {member.full_name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedFeedback.assigned_to_email && (
                  <p className="text-xs text-purple-700 mt-2">
                    Assigned to {selectedFeedback.assigned_to_name} on {moment(selectedFeedback.assigned_date).format('MMM D, YYYY')}
                  </p>
                )}
              </div>

              {/* Public Response Section */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <Label className="font-semibold mb-2 block">Public Response to Client</Label>
                <p className="text-xs text-slate-600 mb-3">
                  This response will be visible to the client and included in resolution emails.
                </p>
                <Textarea
                  value={publicResponse}
                  onChange={(e) => setPublicResponse(e.target.value)}
                  rows={4}
                  placeholder="Write a response that will be shared with the client..."
                  className="mb-2"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    updateStatusMutation.mutate({
                      id: selectedFeedback.id,
                      status: selectedFeedback.status,
                      notes: selectedFeedback.admin_notes || "",
                      publicResponse: publicResponse
                    });
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  Save Response
                </Button>
              </div>

              {/* User Satisfaction Rating */}
              {selectedFeedback.user_satisfaction_rating && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <Label className="font-semibold mb-2 block">User Satisfaction Rating</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {Array(selectedFeedback.user_satisfaction_rating).fill('⭐').join('')}
                    </span>
                    <span className="text-sm text-slate-600">
                      ({selectedFeedback.user_satisfaction_rating}/5)
                    </span>
                  </div>
                  {selectedFeedback.user_satisfaction_comment && (
                    <div className="mt-3 p-3 bg-white rounded border">
                      <p className="text-sm text-slate-700">{selectedFeedback.user_satisfaction_comment}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    Rated on {moment(selectedFeedback.rating_date).format('MMM D, YYYY')}
                  </p>
                </div>
              )}

              {/* Reporter Info */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-slate-600" />
                  <span className="font-semibold">{selectedFeedback.reporter_name}</span>
                  <span className="text-slate-500">({selectedFeedback.reporter_email})</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Building2 className="w-4 h-4" />
                  Organization ID: {selectedFeedback.organization_id}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4" />
                  {moment(selectedFeedback.created_date).format('MMMM D, YYYY [at] h:mm A')}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="font-semibold">Description</Label>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedFeedback.description}</p>
              </div>

              {/* Bug-specific fields */}
              {selectedFeedback.issue_type === 'bug' && (
                <>
                  {selectedFeedback.steps_to_reproduce && (
                    <div className="space-y-2">
                      <Label className="font-semibold">Steps to Reproduce</Label>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedFeedback.steps_to_reproduce}</p>
                    </div>
                  )}
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedFeedback.expected_behavior && (
                      <div className="space-y-2">
                        <Label className="font-semibold">Expected Behavior</Label>
                        <p className="text-sm text-slate-700">{selectedFeedback.expected_behavior}</p>
                      </div>
                    )}
                    
                    {selectedFeedback.actual_behavior && (
                      <div className="space-y-2">
                        <Label className="font-semibold">Actual Behavior</Label>
                        <p className="text-sm text-slate-700">{selectedFeedback.actual_behavior}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Screenshot */}
              {selectedFeedback.screenshot_url && (
                <div className="space-y-2">
                  <Label className="font-semibold">Screenshot</Label>
                  <a 
                    href={selectedFeedback.screenshot_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img 
                      src={selectedFeedback.screenshot_url} 
                      alt="Feedback screenshot" 
                      className="max-h-64 rounded border cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  </a>
                </div>
              )}

              {/* System Info */}
              <div className="p-4 bg-blue-50 rounded-lg space-y-2 text-xs">
                <p className="font-semibold text-blue-900">System Information</p>
                {selectedFeedback.page_url && (
                  <div>
                    <span className="font-medium">Page URL:</span>
                    <a 
                      href={selectedFeedback.page_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-2"
                    >
                      {selectedFeedback.page_url}
                      <ExternalLink className="w-3 h-3 inline ml-1" />
                    </a>
                  </div>
                )}
                {selectedFeedback.browser_info && (
                  <div>
                    <span className="font-medium">Browser:</span>
                    <span className="text-slate-600 ml-2">{selectedFeedback.browser_info}</span>
                  </div>
                )}
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label className="font-semibold">Admin Notes</Label>
                <Textarea
                  value={selectedFeedback.admin_notes || ""}
                  onChange={(e) => setSelectedFeedback({...selectedFeedback, admin_notes: e.target.value})}
                  placeholder="Add internal notes..."
                  rows={3}
                />
              </div>

              {/* Resolution Info */}
              {(selectedFeedback.status === 'resolved' || selectedFeedback.status === 'closed') && selectedFeedback.resolved_date && (
                <div className="p-4 bg-green-50 rounded-lg text-sm">
                  <p className="font-semibold text-green-900 mb-1">Resolved</p>
                  <p className="text-green-800">
                    By {selectedFeedback.resolved_by} on {moment(selectedFeedback.resolved_date).format('MMMM D, YYYY')}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Close
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleUpdateStatus('in_progress')}
                disabled={updateStatusMutation.isPending}
              >
                Mark In Progress
              </Button>
              <Button 
                onClick={() => handleUpdateStatus('resolved')}
                disabled={updateStatusMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                Mark Resolved
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
