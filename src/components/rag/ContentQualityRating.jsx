import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Sparkles, ThumbsUp, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * ContentQualityRating Component
 * 
 * Collects user feedback on AI-generated content quality.
 * This data is critical for:
 * - Improving RAG recommendations
 * - Identifying which references work best
 * - Measuring AI writing assistant effectiveness
 * - Building quality analytics dashboards
 */
export default function ContentQualityRating({
  isOpen,
  onClose,
  proposalId,
  sectionId,
  sectionType,
  ragMetadata = null, // {used_rag, reference_count, reference_ids, estimated_tokens, llm_provider}
  generatedContent = "",
  promptUsed = "",
  generationTime = 0,
  onFeedbackSubmitted
}) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const user = await base44.auth.me();
      const org = await base44.entities.Organization.filter(
        { created_by: user.email },
        '-created_date',
        1
      );

      const feedbackData = {
        organization_id: org[0]?.id,
        proposal_id: proposalId,
        section_id: sectionId,
        section_type: sectionType,
        user_email: user.email,
        user_name: user.full_name,
        quality_rating: rating,
        used_rag: ragMetadata?.used_rag || false,
        reference_count: ragMetadata?.reference_count || 0,
        reference_proposal_ids: ragMetadata?.reference_ids || [],
        estimated_tokens_used: ragMetadata?.estimated_tokens || 0,
        llm_provider: ragMetadata?.llm_provider || 'unknown',
        generation_time_seconds: generationTime,
        feedback_comment: comment.trim() || null,
        content_was_inserted: true,
        prompt_used: promptUsed,
        actual_word_count: generatedContent ? generatedContent.split(/\s+/).length : 0
      };

      await base44.entities.ContentQualityFeedback.create(feedbackData);

      console.log('[ContentQualityRating] ✅ Feedback submitted:', { rating, used_rag: ragMetadata?.used_rag });

      toast.success("Thank you for your feedback! 🎉", {
        description: "Your input helps improve AI quality"
      });

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(rating);
      }

      onClose();
    } catch (error) {
      console.error('[ContentQualityRating] Error submitting feedback:', error);
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    console.log('[ContentQualityRating] User skipped feedback');
    onClose();
  };

  const ratingLabels = {
    1: "Poor - Needs major revision",
    2: "Fair - Needs significant editing",
    3: "Good - Minor edits needed",
    4: "Very Good - Minimal edits",
    5: "Excellent - Ready to use"
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-blue-600" />
            Rate AI-Generated Content
          </DialogTitle>
          <DialogDescription>
            Your feedback helps us improve the AI writing assistant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* RAG Info Badge */}
          {ragMetadata?.used_rag && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">
                  Generated using {ragMetadata.reference_count} reference proposal{ragMetadata.reference_count !== 1 ? 's' : ''}
                </p>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                ~{ragMetadata.estimated_tokens?.toLocaleString() || 0} tokens of context
              </p>
            </div>
          )}

          {/* Star Rating */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">How would you rate this content?</Label>
            <div className="flex items-center justify-center gap-2 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-all transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={cn(
                      "w-10 h-10 transition-all",
                      (hoveredRating >= star || rating >= star)
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-slate-200 text-slate-300 hover:fill-slate-300 hover:text-slate-400"
                    )}
                  />
                </button>
              ))}
            </div>
            {(hoveredRating > 0 || rating > 0) && (
              <p className="text-sm text-center text-slate-600 font-medium">
                {ratingLabels[hoveredRating || rating]}
              </p>
            )}
          </div>

          {/* Optional Comment */}
          <div className="space-y-2">
            <Label htmlFor="feedback_comment" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Additional Comments (Optional)
            </Label>
            <Textarea
              id="feedback_comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you like? What could be improved?"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Stats Display */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 rounded-lg p-2">
              <p className="text-slate-500">Word Count</p>
              <p className="font-semibold text-slate-900">
                {generatedContent ? generatedContent.split(/\s+/).length : 0} words
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <p className="text-slate-500">Generation Time</p>
              <p className="font-semibold text-slate-900">
                {generationTime > 0 ? `${generationTime.toFixed(1)}s` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={submitting}
            className="text-slate-600"
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}