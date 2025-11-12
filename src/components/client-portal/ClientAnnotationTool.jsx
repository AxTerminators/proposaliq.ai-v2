import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StickyNote,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Send,
  CheckCircle2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

/**
 * Client Annotation Tool
 * Allows clients to highlight text, add comments, questions, and issues
 */
export default function ClientAnnotationTool({ proposal, section, clientOrg, annotations = [] }) {
  const queryClient = useQueryClient();
  const [showNewAnnotation, setShowNewAnnotation] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState({
    annotation_type: 'comment',
    content: '',
    priority: 'medium'
  });

  const createAnnotationMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ProposalAnnotation.create({
        proposal_id: proposal.id,
        section_id: section.id,
        client_id: clientOrg.id,
        author_name: clientOrg.contact_name,
        author_email: clientOrg.contact_email,
        ...data,
        visible_to_consultant: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-annotations'] });
      setShowNewAnnotation(false);
      setNewAnnotation({
        annotation_type: 'comment',
        content: '',
        priority: 'medium'
      });
    },
  });

  const handleSubmit = () => {
    if (!newAnnotation.content.trim()) return;
    createAnnotationMutation.mutate(newAnnotation);
  };

  const annotationTypes = [
    { value: 'comment', label: 'Comment', icon: MessageSquare, color: 'blue' },
    { value: 'question', label: 'Question', icon: HelpCircle, color: 'purple' },
    { value: 'suggestion', label: 'Suggestion', icon: StickyNote, color: 'green' },
    { value: 'issue', label: 'Issue', icon: AlertCircle, color: 'red' },
  ];

  const getTypeConfig = (type) => {
    return annotationTypes.find(t => t.value === type) || annotationTypes[0];
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Existing Annotations */}
      {annotations.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-900 text-sm">Your Notes</h4>
          {annotations.map(annotation => {
            const typeConfig = getTypeConfig(annotation.annotation_type);
            const Icon = typeConfig.icon;

            return (
              <Card key={annotation.id} className={cn(
                "border-l-4",
                typeConfig.color === 'blue' && "border-l-blue-500 bg-blue-50",
                typeConfig.color === 'purple' && "border-l-purple-500 bg-purple-50",
                typeConfig.color === 'green' && "border-l-green-500 bg-green-50",
                typeConfig.color === 'red' && "border-l-red-500 bg-red-50"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={cn(
                      "w-5 h-5 mt-1",
                      `text-${typeConfig.color}-600`
                    )} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {typeConfig.label}
                        </Badge>
                        {annotation.priority && annotation.priority !== 'medium' && (
                          <Badge className={cn(
                            annotation.priority === 'high' ? 'bg-red-100 text-red-700' :
                            annotation.priority === 'critical' ? 'bg-red-600 text-white' :
                            'bg-slate-100 text-slate-700'
                          )}>
                            {annotation.priority}
                          </Badge>
                        )}
                        {annotation.is_resolved && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {annotation.content}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {moment(annotation.created_date).format('MMM D, YYYY h:mm A')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Annotation Form */}
      {showNewAnnotation ? (
        <Card className="border-2 border-blue-300 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Add Your Note</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewAnnotation(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Type
                </label>
                <Select
                  value={newAnnotation.annotation_type}
                  onValueChange={(value) => setNewAnnotation({
                    ...newAnnotation,
                    annotation_type: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {annotationTypes.map(type => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Priority
                </label>
                <Select
                  value={newAnnotation.priority}
                  onValueChange={(value) => setNewAnnotation({
                    ...newAnnotation,
                    priority: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Your Comment
              </label>
              <Textarea
                value={newAnnotation.content}
                onChange={(e) => setNewAnnotation({
                  ...newAnnotation,
                  content: e.target.value
                })}
                placeholder="Share your thoughts, questions, or suggestions..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowNewAnnotation(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!newAnnotation.content.trim() || createAnnotationMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createAnnotationMutation.isPending ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          onClick={() => setShowNewAnnotation(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <StickyNote className="w-4 h-4 mr-2" />
          Add Note to This Section
        </Button>
      )}
    </div>
  );
}