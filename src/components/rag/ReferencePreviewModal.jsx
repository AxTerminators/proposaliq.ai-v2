import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  FileText, 
  Award, 
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Calendar,
  DollarSign,
  Building2,
  BarChart3,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

/**
 * ReferencePreviewModal Component
 * 
 * Provides a detailed preview of a reference proposal before linking it.
 * Shows sections, statistics, win themes, and content quality indicators.
 * 
 * Helps users make informed decisions about which references to use.
 */
export default function ReferencePreviewModal({
  isOpen,
  onClose,
  proposalId,
  onSelect
}) {
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState(null);
  const [sections, setSections] = useState([]);
  const [winThemes, setWinThemes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isOpen && proposalId) {
      loadProposalData();
    }
  }, [isOpen, proposalId]);

  const loadProposalData = async () => {
    try {
      setLoading(true);

      // Fetch proposal
      const prop = await base44.entities.Proposal.get(proposalId);
      setProposal(prop);

      // Fetch sections
      const secs = await base44.entities.ProposalSection.filter(
        { proposal_id: proposalId },
        'order'
      );
      setSections(secs);

      // Fetch win themes
      try {
        const themes = await base44.entities.WinTheme.filter({
          proposal_id: proposalId
        });
        setWinThemes(themes);
      } catch (e) {
        console.log('No win themes found');
      }

      // Fetch documents
      try {
        const docs = await base44.entities.SolicitationDocument.filter({
          proposal_id: proposalId
        });
        setDocuments(docs);
      } catch (e) {
        console.log('No documents found');
      }

      // Calculate statistics
      const totalWords = secs.reduce((sum, s) => sum + (s.word_count || 0), 0);
      const completedSections = secs.filter(s => s.status === 'approved' || s.status === 'reviewed').length;
      const aiGeneratedSections = secs.filter(s => s.status === 'ai_generated').length;

      setStats({
        total_sections: secs.length,
        total_words: totalWords,
        completed_sections: completedSections,
        ai_generated_sections: aiGeneratedSections,
        avg_words_per_section: secs.length > 0 ? Math.round(totalWords / secs.length) : 0,
        completion_percentage: secs.length > 0 ? Math.round((completedSections / secs.length) * 100) : 0
      });

    } catch (error) {
      console.error('[ReferencePreviewModal] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReference = () => {
    if (onSelect) {
      onSelect(proposalId);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reference Proposal Preview</DialogTitle>
          <DialogDescription>
            Review this proposal's content before adding it as a reference
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Proposal Header */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {proposal.proposal_name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {proposal.status === 'won' && (
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Won
                  </Badge>
                )}
                {proposal.status === 'submitted' && (
                  <Badge className="bg-blue-600 text-white">Submitted</Badge>
                )}
                {proposal.status === 'lost' && (
                  <Badge variant="outline">Lost</Badge>
                )}
                {proposal.agency_name && (
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Building2 className="w-4 h-4" />
                    {proposal.agency_name}
                  </div>
                )}
                {proposal.contract_value && (
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <DollarSign className="w-4 h-4" />
                    ${(proposal.contract_value / 1000000).toFixed(1)}M
                  </div>
                )}
                {proposal.due_date && (
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    {moment(proposal.due_date).format('MMM D, YYYY')}
                  </div>
                )}
              </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{stats.total_sections}</p>
                    <p className="text-xs text-blue-900 mt-1">Sections</p>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {stats.total_words.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-900 mt-1">Total Words</p>
                  </CardContent>
                </Card>
                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-purple-600">{stats.completion_percentage}%</p>
                    <p className="text-xs text-purple-900 mt-1">Complete</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-amber-600">{stats.avg_words_per_section}</p>
                    <p className="text-xs text-amber-900 mt-1">Avg Words/Section</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabbed Content */}
            <Tabs defaultValue="sections" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sections">
                  <FileText className="w-4 h-4 mr-2" />
                  Sections ({sections.length})
                </TabsTrigger>
                <TabsTrigger value="themes">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Win Themes ({winThemes.length})
                </TabsTrigger>
                <TabsTrigger value="stats">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analysis
                </TabsTrigger>
              </TabsList>

              {/* Sections Tab */}
              <TabsContent value="sections" className="space-y-2">
                {sections.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    No sections found in this proposal
                  </p>
                ) : (
                  sections.map((section, idx) => (
                    <Card key={section.id} className="border">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {idx + 1}
                              </Badge>
                              <p className="font-medium text-sm text-slate-900">
                                {section.section_name}
                              </p>
                            </div>
                            <p className="text-xs text-slate-500 capitalize mt-1">
                              {section.section_type?.replace('_', ' ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-600">
                              {section.word_count?.toLocaleString() || 0} words
                            </p>
                            <Badge 
                              className={cn(
                                "text-xs mt-1",
                                section.status === 'approved' && "bg-green-100 text-green-800",
                                section.status === 'reviewed' && "bg-blue-100 text-blue-800",
                                section.status === 'ai_generated' && "bg-purple-100 text-purple-800"
                              )}
                            >
                              {section.status}
                            </Badge>
                          </div>
                        </div>
                        {section.content && (
                          <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                            {section.content.substring(0, 150)}...
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Win Themes Tab */}
              <TabsContent value="themes" className="space-y-3">
                {winThemes.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    No win themes documented
                  </p>
                ) : (
                  winThemes.map((theme, idx) => (
                    <Card key={theme.id} className="border-amber-200 bg-amber-50">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-amber-900">{theme.theme_title}</h4>
                            <p className="text-sm text-amber-800 mt-1">{theme.theme_statement}</p>
                            {theme.theme_type && (
                              <Badge variant="outline" className="mt-2 text-xs capitalize">
                                {theme.theme_type.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Analysis Tab */}
              <TabsContent value="stats" className="space-y-4">
                {/* Quality Indicators */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-semibold text-slate-900">Content Quality Indicators</h4>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Content Completeness</span>
                        <Badge className={cn(
                          stats.completion_percentage >= 80 ? "bg-green-600" :
                          stats.completion_percentage >= 50 ? "bg-amber-600" :
                          "bg-slate-600",
                          "text-white"
                        )}>
                          {stats.completion_percentage}%
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Total Word Count</span>
                        <span className="font-semibold text-slate-900">
                          {stats.total_words.toLocaleString()} words
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">AI-Generated Sections</span>
                        <span className="font-semibold text-slate-900">
                          {stats.ai_generated_sections} of {stats.total_sections}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Attached Documents</span>
                        <span className="font-semibold text-slate-900">
                          {documents.length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section Types Breakdown */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-900 mb-3">Section Types</h4>
                    <div className="space-y-2">
                      {Object.entries(
                        sections.reduce((acc, s) => {
                          const type = s.section_type || 'custom';
                          acc[type] = (acc[type] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 capitalize">
                            {type.replace('_', ' ')}
                          </span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Evaluation Results (if available) */}
                {proposal.evaluation_results && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-blue-900 mb-3">Strategic Evaluation</h4>
                      {(() => {
                        try {
                          const eval_data = JSON.parse(proposal.evaluation_results);
                          return (
                            <div className="space-y-2 text-sm">
                              {eval_data.assessment_score && (
                                <div className="flex items-center justify-between">
                                  <span className="text-blue-800">Assessment Score</span>
                                  <Badge className="bg-blue-600 text-white">
                                    {eval_data.assessment_score}/100
                                  </Badge>
                                </div>
                              )}
                              {eval_data.win_probability && (
                                <div className="flex items-center justify-between">
                                  <span className="text-blue-800">Win Probability</span>
                                  <Badge className="bg-green-600 text-white">
                                    {eval_data.win_probability}%
                                  </Badge>
                                </div>
                              )}
                              {eval_data.recommendation && (
                                <div className="flex items-center justify-between">
                                  <span className="text-blue-800">Recommendation</span>
                                  <Badge className="bg-blue-800 text-white">
                                    {eval_data.recommendation}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          );
                        } catch (e) {
                          return <p className="text-xs text-blue-700">Evaluation data available</p>;
                        }
                      })()}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {/* Action Footer */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-green-900 mb-1">
                    Ready to use this as reference?
                  </p>
                  <p className="text-sm text-green-800">
                    This proposal has <strong>{stats?.total_words.toLocaleString()} words</strong> across <strong>{stats?.total_sections} sections</strong>
                    {winThemes.length > 0 && ` and ${winThemes.length} win themes`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddReference} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Add Reference
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}