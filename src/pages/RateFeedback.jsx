import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Star,
  CheckCircle2,
  Loader2,
  MessageSquare,
  ThumbsUp,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RateFeedback() {
  const [feedback, setFeedback] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        // Get feedback ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const feedbackId = urlParams.get('id');
        const presetRating = parseInt(urlParams.get('rating')) || 0;

        if (!feedbackId) {
          setError("No feedback ID provided");
          setLoading(false);
          return;
        }

        // Load the feedback item
        const allFeedback = await base44.entities.Feedback.list();
        const foundFeedback = allFeedback.find(f => f.id === feedbackId);

        if (!foundFeedback) {
          setError("Feedback not found");
          setLoading(false);
          return;
        }

        // Check if already rated
        if (foundFeedback.user_satisfaction_rating) {
          setError("This feedback has already been rated");
          setLoading(false);
          return;
        }

        setFeedback(foundFeedback);
        if (presetRating > 0) {
          setRating(presetRating);
        }
      } catch (err) {
        console.error("Error loading feedback:", err);
        setError("Error loading feedback");
      } finally {
        setLoading(false);
      }
    };

    loadFeedback();
  }, []);

  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      if (!feedback || rating === 0) {
        throw new Error("Please select a rating");
      }

      await base44.entities.Feedback.update(feedback.id, {
        user_satisfaction_rating: rating,
        user_satisfaction_comment: comment || "",
        rating_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      setSubmitSuccess(true);
    },
    onError: (error) => {
      alert("Error submitting rating. Please try again.");
      console.error("Rating submission error:", error);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitRatingMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600">Loading feedback...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <Card className="max-w-md w-full border-none shadow-xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Unable to Load Feedback</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Button onClick={() => window.location.href = '/'}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <Card className="max-w-md w-full border-none shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h2>
            <p className="text-slate-600 mb-6">
              Your feedback rating has been submitted successfully. We appreciate you taking the time to help us improve!
            </p>
            <div className="flex justify-center mb-6">
              {Array(rating).fill(0).map((_, i) => (
                <Star key={i} className="w-8 h-8 text-yellow-500 fill-yellow-500" />
              ))}
            </div>
            {comment && (
              <div className="bg-slate-50 p-4 rounded-lg mb-6 text-left">
                <p className="text-xs text-slate-600 mb-1">Your comment:</p>
                <p className="text-sm text-slate-700">{comment}</p>
              </div>
            )}
            <Button onClick={() => window.location.href = '/'} className="bg-blue-600 hover:bg-blue-700">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <ThumbsUp className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Rate Our Response</h1>
          <p className="text-slate-600">
            How satisfied are you with our resolution?
          </p>
        </div>

        {/* Feedback Details */}
        <Card className="border-none shadow-xl mb-6">
          <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-green-100 text-green-700">Resolved</Badge>
              <Badge variant="outline" className="capitalize">
                {feedback.issue_type.replace('_', ' ')}
              </Badge>
            </div>
            <CardTitle>{feedback.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-slate-600">Your Feedback:</Label>
                <p className="text-sm text-slate-700 mt-1">{feedback.description}</p>
              </div>
              {feedback.admin_notes && (
                <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                  <Label className="text-xs text-green-800 font-semibold">Resolution Notes:</Label>
                  <p className="text-sm text-green-900 mt-1">{feedback.admin_notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rating Form */}
        <Card className="border-none shadow-xl">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Star Rating */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-center block">
                  How would you rate our response?
                </Label>
                <div className="flex justify-center gap-2 py-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star 
                        className={`w-12 h-12 ${
                          (hoverRating || rating) >= star 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="text-center text-sm text-slate-600">
                  {rating === 0 && "Click a star to rate"}
                  {rating === 1 && "😞 Very Poor"}
                  {rating === 2 && "😕 Poor"}
                  {rating === 3 && "😐 Fair"}
                  {rating === 4 && "😊 Good"}
                  {rating === 5 && "🎉 Excellent"}
                </div>
              </div>

              {/* Optional Comment */}
              <div className="space-y-2">
                <Label htmlFor="comment">
                  Additional Comments (Optional)
                </Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us more about your experience..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={rating === 0 || isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Submit Rating
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <Alert className="mt-6">
          <AlertDescription className="text-sm text-slate-600">
            Your rating helps us improve our support quality. Thank you for taking the time to provide feedback!
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}