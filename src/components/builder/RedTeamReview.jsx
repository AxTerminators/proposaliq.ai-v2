import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Users, 
  Star,
  MessageSquare,
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Clock,
  Plus,
  Edit,
  Trash2,
  Loader2,
  TrendingUp,
  Target,
  FileText,
  Calendar,
  Mail,
  Award,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Send,
  Eye,
  BarChart3
} from "lucide-react";

export default function RedTeamReview({ proposalId, proposalData, organizationId }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedRound, setSelectedRound] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showIssuesDialog, setShowIssuesDialog] = useState(false);

  const [roundForm, setRoundForm] = useState({
    round_name: "red_team",
    custom_round_name: "",
    description: "",
    start_date: "",
    due_date: "",
    assigned_reviewers: []
  });

  const [reviewForm, setReviewForm] = useState({
    overall_score: 3,
    criteria_scores: {
      technical_accuracy: 3,
      completeness: 3,
      compliance: 3,
      writing_quality: 3,
      persuasiveness: 3,
      clarity: 3
    },
    strengths: [],
    weaknesses: [],
    critical_issues: [],
    recommendations: [],
    review_notes: ""
  });

  const [newStrength, setNewStrength] = useState("");
  const [newWeakness, setNewWeakness] = useState("");
  const [newIssue, setNewIssue] = useState("");
  const [newRecommendation, setNewRecommendation] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: reviewRounds, isLoading: roundsLoading } = useQuery({
    queryKey: ['review-rounds', proposalId],
    queryFn: async () => {
      if (!proposalId || !organizationId) return [];
      return base44.entities.ReviewRound.filter({
        proposal_id: proposalId,
        organization_id: organizationId
      }, '-round_number');
    },
    initialData: [],
    enabled: !!proposalId && !!organizationId
  });

  const { data: sections } = useQuery({
    queryKey: ['proposal-sections-review', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      return base44.entities.ProposalSection.filter({ proposal_id: proposalId }, 'order');
    },
    initialData: [],
    enabled: !!proposalId
  });

  const { data: allComments } = useQuery({
    queryKey: ['review-comments', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      return base44.entities.ProposalComment.filter({ 
        proposal_id: proposalId,
        is_resolved: false
      }, '-created_date');
    },
    initialData: [],
    enabled: !!proposalId
  });

  const createRoundMutation = useMutation({
    mutationFn: async (data) => {
      const round = await base44.entities.ReviewRound.create({
        ...data,
        proposal_id: proposalId,
        organization_id: organizationId,
        round_number: reviewRounds.length + 1,
        status: 'scheduled'
      });

      // Send notifications to assigned reviewers
      for (const reviewer of data.assigned_reviewers) {
        await base44.entities.Notification.create({
          user_email: reviewer.user_email,
          notification_type: "approval_request",
          title: "Review Assignment",
          message: `You've been assigned to review "${proposalData.proposal_name}" - ${data.round_name.replace(/_/g, ' ')}`,
          related_proposal_id: proposalId,
          related_entity_id: round.id,
          related_entity_type: "review_round",
          from_user_email: user.email,
          from_user_name: user.full_name || user.email
        });
      }

      return round;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-rounds'] });
      setShowCreateDialog(false);
      resetRoundForm();
    }
  });

  const submitReviewMutation = useMutation({
    mutationFn: async ({ roundId, sectionId, data }) => {
      const review = await base44.entities.SectionReview.create({
        review_round_id: roundId,
        proposal_section_id: sectionId,
        section_name: selectedSection.section_name,
        reviewer_email: user.email,
        reviewer_name: user.full_name || user.email,
        ...data,
        review_status: "submitted",
        submitted_date: new Date().toISOString()
      });

      // Create comments for critical issues
      for (const issue of data.critical_issues) {
        await base44.entities.ProposalComment.create({
          proposal_id: proposalId,
          section_id: selectedSection.section_id,
          author_email: user.email,
          author_name: user.full_name || user.email,
          content: issue,
          comment_type: "issue"
        });
      }

      // Update round statistics
      const round = reviewRounds.find(r => r.id === roundId);
      if (round) {
        await base44.entities.ReviewRound.update(roundId, {
          total_comments: (round.total_comments || 0) + data.critical_issues.length,
          critical_issues: (round.critical_issues || 0) + data.critical_issues.length
        });
      }

      return review;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-rounds'] });
      queryClient.invalidateQueries({ queryKey: ['section-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review-comments'] });
      setShowReviewDialog(false);
      resetReviewForm();
      alert("✓ Review submitted successfully!");
    }
  });

  const resetRoundForm = () => {
    setRoundForm({
      round_name: "red_team",
      custom_round_name: "",
      description: "",
      start_date: "",
      due_date: "",
      assigned_reviewers: []
    });
  };

  const resetReviewForm = () => {
    setReviewForm({
      overall_score: 3,
      criteria_scores: {
        technical_accuracy: 3,
        completeness: 3,
        compliance: 3,
        writing_quality: 3,
        persuasiveness: 3,
        clarity: 3
      },
      strengths: [],
      weaknesses: [],
      critical_issues: [],
      recommendations: [],
      review_notes: ""
    });
    setNewStrength("");
    setNewWeakness("");
    setNewIssue("");
    setNewRecommendation("");
  };

  const handleCreateRound = () => {
    if (!roundForm.due_date) {
      alert("Please set a due date for the review");
      return;
    }

    createRoundMutation.mutate(roundForm);
  };

  const handleStartReview = (round, section) => {
    setSelectedRound(round);
    setSelectedSection(section);
    setShowReviewDialog(true);
  };

  const handleSubmitReview = () => {
    // Calculate overall score as average of criteria
    const criteriaScores = Object.values(reviewForm.criteria_scores);
    const avgScore = criteriaScores.reduce((a, b) => a + b, 0) / criteriaScores.length;

    submitReviewMutation.mutate({
      roundId: selectedRound.id,
      sectionId: selectedSection.id,
      data: {
        ...reviewForm,
        overall_score: Math.round(avgScore * 10) / 10
      }
    });
  };

  const getRoundColor = (roundName) => {
    switch (roundName) {
      case 'pink_team': return 'bg-pink-100 text-pink-700 border-pink-300';
      case 'red_team': return 'bg-red-100 text-red-700 border-red-300';
      case 'gold_team': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'final_review': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-slate-100 text-slate-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const renderStarRating = (score, onChange) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange?.(value)}
            className={`transition-colors ${onChange ? 'cursor-pointer hover:scale-110' : ''}`}
          >
            <Star
              className={`w-6 h-6 ${
                value <= score
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm font-semibold text-slate-700">{score.toFixed(1)}</span>
      </div>
    );
  };

  const overallStats = {
    totalRounds: reviewRounds.length,
    activeRounds: reviewRounds.filter(r => r.status === 'in_progress').length,
    completedRounds: reviewRounds.filter(r => r.status === 'completed').length,
    totalIssues: allComments.length,
    criticalIssues: allComments.filter(c => c.comment_type === 'issue').length
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Shield className="w-7 h-7 text-red-600" />
                Red Team Review
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Conduct structured reviews to improve proposal quality
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Review Round
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border-2">
              <p className="text-2xl font-bold text-slate-900">{overallStats.totalRounds}</p>
              <p className="text-xs text-slate-600">Total Rounds</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border-2 border-blue-200">
              <p className="text-2xl font-bold text-blue-600">{overallStats.activeRounds}</p>
              <p className="text-xs text-slate-600">Active</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border-2 border-green-200">
              <p className="text-2xl font-bold text-green-600">{overallStats.completedRounds}</p>
              <p className="text-xs text-slate-600">Completed</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border-2 border-orange-200">
              <p className="text-2xl font-bold text-orange-600">{overallStats.totalIssues}</p>
              <p className="text-xs text-slate-600">Open Issues</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border-2 border-red-200">
              <p className="text-2xl font-bold text-red-600">{overallStats.criticalIssues}</p>
              <p className="text-xs text-slate-600">Critical</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Rounds List */}
      {reviewRounds.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="py-12 text-center">
            <Shield className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 mb-2">No review rounds yet</p>
            <p className="text-sm text-slate-500 mb-4">
              Create a review round to start collecting feedback from your team
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Review Round
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviewRounds.map((round) => (
            <Card key={round.id} className="border-none shadow-lg">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={`${getRoundColor(round.round_name)} border px-3 py-1`}>
                        {round.custom_round_name || round.round_name.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(round.status)}>
                        {round.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        Round #{round.round_number}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{round.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {new Date(round.due_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {round.assigned_reviewers?.length || 0} Reviewers
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {round.total_comments || 0} Comments
                      </span>
                      {round.overall_score && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {round.overall_score.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRound(round);
                        setShowIssuesDialog(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Sections to Review
                    </h4>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sections.map((section) => (
                        <Card key={section.id} className="border hover:border-blue-300 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="text-sm font-semibold flex-1">{section.section_name}</p>
                              <Badge variant="outline" className="text-xs">
                                {section.word_count || 0} words
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => handleStartReview(round, section)}
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Review Section
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {round.assigned_reviewers && round.assigned_reviewers.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Assigned Reviewers
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {round.assigned_reviewers.map((reviewer, idx) => (
                          <Badge key={idx} variant="secondary" className="px-3 py-1">
                            <User className="w-3 h-3 mr-1" />
                            {reviewer.user_name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Round Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Review Round</DialogTitle>
            <DialogDescription>
              Set up a new review round to collect feedback from your team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Review Type</label>
              <Select
                value={roundForm.round_name}
                onValueChange={(value) => setRoundForm({ ...roundForm, round_name: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pink_team">Pink Team (Early Review)</SelectItem>
                  <SelectItem value="red_team">Red Team (Comprehensive)</SelectItem>
                  <SelectItem value="gold_team">Gold Team (Final Polish)</SelectItem>
                  <SelectItem value="final_review">Final Review</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {roundForm.round_name === 'custom' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Custom Name</label>
                <Input
                  placeholder="e.g., Executive Review"
                  value={roundForm.custom_round_name}
                  onChange={(e) => setRoundForm({ ...roundForm, custom_round_name: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold">Description</label>
              <Textarea
                placeholder="What should reviewers focus on?"
                value={roundForm.description}
                onChange={(e) => setRoundForm({ ...roundForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Start Date</label>
                <Input
                  type="date"
                  value={roundForm.start_date}
                  onChange={(e) => setRoundForm({ ...roundForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Due Date *</label>
                <Input
                  type="date"
                  value={roundForm.due_date}
                  onChange={(e) => setRoundForm({ ...roundForm, due_date: e.target.value })}
                />
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                After creating the round, reviewers can access sections and provide scores, comments, and recommendations.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRound}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Create Review Round
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Section Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Review: {selectedSection?.section_name}</DialogTitle>
            <DialogDescription>
              Provide scores, identify strengths/weaknesses, and make recommendations
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[600px] pr-4">
            <Tabs defaultValue="scoring" className="space-y-4">
              <TabsList>
                <TabsTrigger value="scoring">Scoring</TabsTrigger>
                <TabsTrigger value="feedback">Feedback</TabsTrigger>
                <TabsTrigger value="content">Section Content</TabsTrigger>
              </TabsList>

              <TabsContent value="scoring" className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Score Each Criterion (1-5 stars)</h4>
                  
                  {Object.entries({
                    technical_accuracy: "Technical Accuracy",
                    completeness: "Completeness",
                    compliance: "Compliance",
                    writing_quality: "Writing Quality",
                    persuasiveness: "Persuasiveness",
                    clarity: "Clarity"
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <span className="font-medium">{label}</span>
                      {renderStarRating(
                        reviewForm.criteria_scores[key],
                        (value) => setReviewForm({
                          ...reviewForm,
                          criteria_scores: { ...reviewForm.criteria_scores, [key]: value }
                        })
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="feedback" className="space-y-6">
                {/* Strengths */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-green-600" />
                    Strengths
                  </h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="What's good about this section?"
                      value={newStrength}
                      onChange={(e) => setNewStrength(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newStrength.trim()) {
                          setReviewForm({
                            ...reviewForm,
                            strengths: [...reviewForm.strengths, newStrength.trim()]
                          });
                          setNewStrength("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newStrength.trim()) {
                          setReviewForm({
                            ...reviewForm,
                            strengths: [...reviewForm.strengths, newStrength.trim()]
                          });
                          setNewStrength("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {reviewForm.strengths.map((strength, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <ThumbsUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm flex-1">{strength}</span>
                      <button
                        onClick={() => setReviewForm({
                          ...reviewForm,
                          strengths: reviewForm.strengths.filter((_, i) => i !== idx)
                        })}
                      >
                        <XCircle className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Weaknesses */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <ThumbsDown className="w-5 h-5 text-amber-600" />
                    Weaknesses
                  </h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="What needs improvement?"
                      value={newWeakness}
                      onChange={(e) => setNewWeakness(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newWeakness.trim()) {
                          setReviewForm({
                            ...reviewForm,
                            weaknesses: [...reviewForm.weaknesses, newWeakness.trim()]
                          });
                          setNewWeakness("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newWeakness.trim()) {
                          setReviewForm({
                            ...reviewForm,
                            weaknesses: [...reviewForm.weaknesses, newWeakness.trim()]
                          });
                          setNewWeakness("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {reviewForm.weaknesses.map((weakness, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <ThumbsDown className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm flex-1">{weakness}</span>
                      <button
                        onClick={() => setReviewForm({
                          ...reviewForm,
                          weaknesses: reviewForm.weaknesses.filter((_, i) => i !== idx)
                        })}
                      >
                        <XCircle className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Critical Issues */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Critical Issues
                  </h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Critical problems that must be fixed"
                      value={newIssue}
                      onChange={(e) => setNewIssue(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newIssue.trim()) {
                          setReviewForm({
                            ...reviewForm,
                            critical_issues: [...reviewForm.critical_issues, newIssue.trim()]
                          });
                          setNewIssue("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newIssue.trim()) {
                          setReviewForm({
                            ...reviewForm,
                            critical_issues: [...reviewForm.critical_issues, newIssue.trim()]
                          });
                          setNewIssue("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {reviewForm.critical_issues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm flex-1">{issue}</span>
                      <button
                        onClick={() => setReviewForm({
                          ...reviewForm,
                          critical_issues: reviewForm.critical_issues.filter((_, i) => i !== idx)
                        })}
                      >
                        <XCircle className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Recommendations */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Recommendations
                  </h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Specific improvement recommendations"
                      value={newRecommendation}
                      onChange={(e) => setNewRecommendation(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newRecommendation.trim()) {
                          setReviewForm({
                            ...reviewForm,
                            recommendations: [...reviewForm.recommendations, newRecommendation.trim()]
                          });
                          setNewRecommendation("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newRecommendation.trim()) {
                          setReviewForm({
                            ...reviewForm,
                            recommendations: [...reviewForm.recommendations, newRecommendation.trim()]
                          });
                          setNewRecommendation("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {reviewForm.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm flex-1">{rec}</span>
                      <button
                        onClick={() => setReviewForm({
                          ...reviewForm,
                          recommendations: reviewForm.recommendations.filter((_, i) => i !== idx)
                        })}
                      >
                        <XCircle className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* General Notes */}
                <div className="space-y-2">
                  <label className="font-semibold text-sm">General Notes</label>
                  <Textarea
                    placeholder="Additional comments or observations..."
                    value={reviewForm.review_notes}
                    onChange={(e) => setReviewForm({ ...reviewForm, review_notes: e.target.value })}
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-900">
                    Review the current section content below while providing your feedback.
                  </AlertDescription>
                </Alert>
                {selectedSection && (
                  <div 
                    className="prose prose-sm max-w-none p-6 bg-white border rounded-lg"
                    dangerouslySetInnerHTML={{ __html: selectedSection.content || "<p>No content yet</p>" }}
                  />
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview} disabled={submitReviewMutation.isLoading}>
              {submitReviewMutation.isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}