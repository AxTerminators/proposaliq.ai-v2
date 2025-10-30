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
  Eye
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
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: feedbackList, isLoading } = useQuery({
    queryKey: ['feedback-admin'],
    queryFn: async () => {
      return base44.entities.Feedback.list('-created_date');
    },
    initialData: [],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }) => {
      const updateData = {
        status,
        admin_notes: notes
      };
      
      if (status === 'resolved' || status === 'closed') {
        const user = await base44.auth.me();
        updateData.resolved_date = new Date().toISOString();
        updateData.resolved_by = user.email;
      }
      
      return base44.entities.Feedback.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-admin'] });
      setShowDetailsDialog(false);
    },
  });

  const handleViewDetails = (feedback) => {
    setSelectedFeedback(feedback);
    setShowDetailsDialog(true);
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedFeedback) return;
    
    const notes = prompt(`Update status to "${status}". Add admin notes (optional):`);
    
    await updateStatusMutation.mutateAsync({
      id: selectedFeedback.id,
      status,
      notes: notes || selectedFeedback.admin_notes || ""
    });
  };

  const filteredFeedback = feedbackList.filter(item => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reporter_email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesType = typeFilter === "all" || item.issue_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
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
    resolved: feedbackList.filter(f => f.status === 'resolved' || f.status === 'closed').length
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid md:grid-cols-4 gap-4">
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
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900">{feedback.title}</h4>
                        <Badge className={getStatusColor(feedback.status)}>
                          {feedback.status.replace('_', ' ')}
                        </Badge>
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