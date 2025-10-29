import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  GitCompare, 
  RotateCcw, 
  GitMerge,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  FileText,
  Sparkles,
  History,
  ArrowRight,
  Copy
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function VersionComparison({ 
  sectionId, 
  sectionName, 
  proposalId,
  onRestore,
  currentContent 
}) {
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion1, setSelectedVersion1] = useState(null);
  const [selectedVersion2, setSelectedVersion2] = useState(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeChoice, setMergeChoice] = useState(null);
  const [diffResult, setDiffResult] = useState(null);

  useEffect(() => {
    loadHistory();
  }, [sectionId, proposalId]);

  useEffect(() => {
    if (selectedVersion1 && selectedVersion2) {
      calculateDiff();
    }
  }, [selectedVersion1, selectedVersion2]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const sections = await base44.entities.ProposalSection.filter({
        proposal_id: proposalId,
        section_id: sectionId
      });

      if (sections.length === 0) {
        setHistoryRecords([]);
        setLoading(false);
        return;
      }

      const history = await base44.entities.ProposalSectionHistory.filter({
        proposal_section_id: sections[0].id
      }, '-version_number');

      setHistoryRecords(history);
      
      // Auto-select latest two versions for comparison
      if (history.length >= 2) {
        setSelectedVersion1(history[0].id);
        setSelectedVersion2(history[1].id);
      }
    } catch (error) {
      console.error("Error loading history:", error);
      setHistoryRecords([]);
    }
    setLoading(false);
  };

  const calculateDiff = () => {
    const v1 = historyRecords.find(h => h.id === selectedVersion1);
    const v2 = historyRecords.find(h => h.id === selectedVersion2);
    
    if (!v1 || !v2) return;

    // Simple word-based diff
    const content1 = stripHtml(v1.content);
    const content2 = stripHtml(v2.content);
    
    const words1 = content1.split(/\s+/);
    const words2 = content2.split(/\s+/);
    
    // Calculate differences
    const added = words2.filter(w => !words1.includes(w)).length;
    const removed = words1.filter(w => !words2.includes(w)).length;
    const unchanged = Math.min(words1.length, words2.length) - Math.max(added, removed);
    
    setDiffResult({
      version1: v1,
      version2: v2,
      stats: {
        added,
        removed,
        unchanged,
        totalChanges: added + removed,
        changePercentage: Math.round(((added + removed) / Math.max(words1.length, words2.length)) * 100)
      }
    });
  };

  const stripHtml = (html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleMerge = async () => {
    if (!mergeChoice || !diffResult) return;

    const contentToUse = mergeChoice === 'v1' ? diffResult.version1.content : diffResult.version2.content;
    
    try {
      await onRestore({
        content: contentToUse,
        version_number: mergeChoice === 'v1' ? diffResult.version1.version_number : diffResult.version2.version_number
      });
      
      setShowMergeDialog(false);
      alert("✓ Version merged successfully!");
    } catch (error) {
      console.error("Error merging:", error);
      alert("Error merging versions");
    }
  };

  const handleSwapVersions = () => {
    const temp = selectedVersion1;
    setSelectedVersion1(selectedVersion2);
    setSelectedVersion2(temp);
  };

  const getChangeTypeColor = (changeType) => {
    switch (changeType) {
      case 'ai_generated':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'ai_regenerated':
        return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case 'user_edit':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'restored_from_history':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'initial_creation':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (historyRecords.length === 0) {
    return (
      <Alert>
        <History className="w-4 h-4" />
        <AlertDescription>
          No version history available yet. Changes will be tracked as you edit.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Version Selector */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-blue-600" />
            Compare Versions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Version 1 (Left)</label>
              <Select value={selectedVersion1} onValueChange={setSelectedVersion1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version..." />
                </SelectTrigger>
                <SelectContent>
                  {historyRecords.map((record) => (
                    <SelectItem key={record.id} value={record.id}>
                      v{record.version_number} - {record.changed_by_user_name} - {new Date(record.created_date).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Version 2 (Right)</label>
              <Select value={selectedVersion2} onValueChange={setSelectedVersion2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version..." />
                </SelectTrigger>
                <SelectContent>
                  {historyRecords.map((record) => (
                    <SelectItem key={record.id} value={record.id}>
                      v{record.version_number} - {record.changed_by_user_name} - {new Date(record.created_date).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm" onClick={handleSwapVersions}>
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Swap Versions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diff Statistics */}
      {diffResult && (
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Change Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-green-700">{diffResult.stats.added}</p>
                <p className="text-xs text-green-600 mt-1">Words Added</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-2xl font-bold text-red-700">{diffResult.stats.removed}</p>
                <p className="text-xs text-red-600 mt-1">Words Removed</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-2xl font-bold text-blue-700">{diffResult.stats.totalChanges}</p>
                <p className="text-xs text-blue-600 mt-1">Total Changes</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-2xl font-bold text-purple-700">{diffResult.stats.changePercentage}%</p>
                <p className="text-xs text-purple-600 mt-1">Modified</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button 
                size="sm"
                onClick={() => {
                  setMergeChoice('v1');
                  setShowMergeDialog(true);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Use Version 1
              </Button>
              <Button 
                size="sm"
                onClick={() => {
                  setMergeChoice('v2');
                  setShowMergeDialog(true);
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Use Version 2
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Side-by-Side Comparison */}
      {diffResult && (
        <Card className="border-none shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Side-by-Side Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid md:grid-cols-2 divide-x">
              {/* Version 1 */}
              <div className="p-6 bg-slate-50">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-blue-600 text-white">
                      Version {diffResult.version1.version_number}
                    </Badge>
                    <Badge variant="outline" className={getChangeTypeColor(diffResult.version1.change_type)}>
                      {diffResult.version1.change_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" />
                      {diffResult.version1.changed_by_user_name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {new Date(diffResult.version1.created_date).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      {diffResult.version1.word_count} words
                    </div>
                  </div>
                  {diffResult.version1.change_summary && (
                    <p className="text-xs text-slate-500 mt-2 italic">{diffResult.version1.change_summary}</p>
                  )}
                </div>
                <ScrollArea className="h-96 border rounded-lg bg-white p-4">
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: diffResult.version1.content }}
                  />
                </ScrollArea>
              </div>

              {/* Version 2 */}
              <div className="p-6 bg-slate-50">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-green-600 text-white">
                      Version {diffResult.version2.version_number}
                    </Badge>
                    <Badge variant="outline" className={getChangeTypeColor(diffResult.version2.change_type)}>
                      {diffResult.version2.change_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" />
                      {diffResult.version2.changed_by_user_name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {new Date(diffResult.version2.created_date).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      {diffResult.version2.word_count} words
                    </div>
                  </div>
                  {diffResult.version2.change_summary && (
                    <p className="text-xs text-slate-500 mt-2 italic">{diffResult.version2.change_summary}</p>
                  )}
                </div>
                <ScrollArea className="h-96 border rounded-lg bg-white p-4">
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: diffResult.version2.content }}
                  />
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline View */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            Version Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {historyRecords.map((record, index) => (
              <div key={record.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-blue-600' : 'bg-slate-300'
                  }`}>
                    <span className="text-white font-bold text-sm">v{record.version_number}</span>
                  </div>
                  {index < historyRecords.length - 1 && (
                    <div className="w-0.5 h-12 bg-slate-200 my-1" />
                  )}
                </div>
                
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={getChangeTypeColor(record.change_type)}>
                          {record.change_type.replace(/_/g, ' ')}
                        </Badge>
                        {index === 0 && (
                          <Badge className="bg-green-600 text-white">Current</Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{record.changed_by_user_name}</p>
                      <p className="text-xs text-slate-500">{new Date(record.created_date).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedVersion1(record.id);
                          if (index < historyRecords.length - 1) {
                            setSelectedVersion2(historyRecords[index + 1].id);
                          }
                        }}
                      >
                        <GitCompare className="w-4 h-4 mr-1" />
                        Compare
                      </Button>
                      {index !== 0 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onRestore(record)}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                  {record.change_summary && (
                    <p className="text-sm text-slate-600 mb-2">{record.change_summary}</p>
                  )}
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>{record.word_count} words</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-blue-600" />
              Confirm Version Selection
            </DialogTitle>
            <DialogDescription>
              You are about to replace the current content with the selected version.
            </DialogDescription>
          </DialogHeader>

          {diffResult && mergeChoice && (
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  <strong>Version {mergeChoice === 'v1' ? diffResult.version1.version_number : diffResult.version2.version_number}</strong> will become the current version.
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-slate-50 rounded-lg border">
                <p className="text-sm text-slate-700 mb-2">
                  <strong>Changed by:</strong> {mergeChoice === 'v1' ? diffResult.version1.changed_by_user_name : diffResult.version2.changed_by_user_name}
                </p>
                <p className="text-sm text-slate-700 mb-2">
                  <strong>Date:</strong> {new Date(mergeChoice === 'v1' ? diffResult.version1.created_date : diffResult.version2.created_date).toLocaleString()}
                </p>
                <p className="text-sm text-slate-700">
                  <strong>Word Count:</strong> {mergeChoice === 'v1' ? diffResult.version1.word_count : diffResult.version2.word_count}
                </p>
              </div>

              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-900">
                  This action will create a new version in the history. The current content will not be lost.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMerge} className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm & Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}