import React from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

export default function FloatingChatButton({ proposalId, className }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (proposalId) {
      navigate(createPageUrl(`Chat?proposalId=${proposalId}`));
    } else {
      navigate(createPageUrl("Chat"));
    }
  };

  return (
    <Button
      onClick={handleClick}
      className={cn(
        "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-110 transition-all duration-300 z-50 group",
        className
      )}
      title={proposalId ? "Ask AI about this proposal" : "Ask AI Assistant"}
    >
      <div className="relative">
        <MessageCircle className="w-6 h-6 text-white" />
        <Sparkles className="w-3 h-3 text-white absolute -top-1 -right-1 animate-pulse" />
      </div>
      <span className="absolute right-16 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {proposalId ? "Ask AI about this proposal" : "AI Assistant"}
      </span>
    </Button>
  );
}