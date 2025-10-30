import React from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function FloatingFeedbackButton({ proposalId, clientId }) {
  const feedbackUrl = createPageUrl("ClientFeedbackForm") + 
    `?client=${clientId}` + 
    (proposalId ? `&proposal=${proposalId}` : "") +
    `&page_url=${encodeURIComponent(window.location.href)}`;

  return (
    <Link to={feedbackUrl}>
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-110 transition-all duration-300 z-50 group"
        title="Give Feedback"
      >
        <MessageSquare className="w-6 h-6 text-white" />
        <span className="absolute right-16 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Give Feedback
        </span>
      </Button>
    </Link>
  );
}