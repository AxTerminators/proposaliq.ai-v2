import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThumbsUp, ThumbsDown, MessageSquare, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * AI Content Feedback Component
 * Allows users to rate AI-generated content with thumbs up/down and optional comments
 */
export default function AIContentFeedback({ section, onFeedbackSubmitted }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Check if feedback already exists
  const existingFeedback = section?.ai_generation_metadata?.user_feedback;

  const submitFeedbackMutation = useMutation({
    mutationFn: async ({ rating, comment }) => {
      const user = await base44.auth.me();
      
      // Update the section with feedback embedded in metadata
      const updatedMetadata = {
        ...(section.ai_generation_metadata || {}),
        user_feedback: {
          rating,
          comment,
          user_email: user.email,
          user_name: user.full_name,
          submitted_at: new Date().toISOString()
        }
      };

      return base44.entities.ProposalSection.update(section.id, {
        ai_generation_metadata: updatedMetadata
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Thanks for your feedback!');
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }

      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
      }, 1500);
    },
    onError: (error) => {
      toast.error('Failed to submit feedback');
      console.error('Feedback submission error:', error);
    }
  });

  const handleSubmit = () => {
    if (rating === null) {
      toast.error('Please select thumbs up or down');
      return;
    }

    submitFeedbackMutation.mutate({ rating, comment });
  };

  // If feedback already submitted, show read-only view
  if (existingFeedback) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            Feedback Submitted
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {existingFeedback.rating === 'positive' ? (
                <ThumbsUp className="w-5 h-5 text-green-600" />
              ) : (
                <ThumbsDown className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">Your Feedback</span>
            </div>
            {existingFeedback.comment && (
              <p className="text-sm text-slate-700">{existingFeedback.comment}</p>
            )}
            <p className="text-xs text-slate-500">
              Submitted {new Date(existingFeedback.submitted_at).toLocaleString()}
            </p>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="w-4 h-4" />
          Rate AI Content
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        {submitted ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-900">Feedback Submitted!</p>
            <p className="text-sm text-slate-600 mt-1">Thank you for helping us improve</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="font-medium mb-3">How was this AI-generated content?</p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant={rating === 'positive' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setRating('positive')}
                  className={cn(
                    "flex-1",
                    rating === 'positive' && "bg-green-600 hover:bg-green-700"
                  )}
                >
                  <ThumbsUp className="w-5 h-5 mr-2" />
                  Good
                </Button>
                <Button
                  variant={rating === 'negative' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setRating('negative')}
                  className={cn(
                    "flex-1",
                    rating === 'negative' && "bg-red-600 hover:bg-red-700"
                  )}
                >
                  <ThumbsDown className="w-5 h-5 mr-2" />
                  Needs Work
                </Button>
              </div>
            </div>

            {rating && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Additional Comments (Optional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What worked well or what could be improved?"
                  rows={3}
                  className="text-sm"
                />
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitFeedbackMutation.isPending || rating === null}
              className="w-full"
            >
              {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}