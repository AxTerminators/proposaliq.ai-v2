import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import AISourcesViewer from "./AISourcesViewer";
import AIContentFeedback from "./AIContentFeedback";
import AIConfidenceIndicator from "./AIConfidenceIndicator";
import AIComplianceIssues from "./AIComplianceIssues";

/**
 * Section Content Viewer
 * Displays proposal section content with AI metadata, sources, and feedback
 */
export default function SectionContentViewer({ section, onEdit }) {
  if (!section) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="p-8 text-center text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No content generated yet</p>
        </CardContent>
      </Card>
    );
  }

  const isAIGenerated = section.status === 'ai_generated' || section.ai_prompt_used;
  const metadata = section.ai_generation_metadata || {};

  return (
    <Card className={cn(
      "border-2",
      isAIGenerated ? "border-purple-200 bg-gradient-to-br from-white to-purple-50/30" : "border-slate-200"
    )}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-xl capitalize">
                {section.section_name?.replace(/_/g, ' ')}
              </CardTitle>
              {isAIGenerated && (
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Generated
                </Badge>
              )}
              {section.status && (
                <Badge variant="outline" className="capitalize">
                  {section.status}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              {section.word_count && (
                <span>{section.word_count} words</span>
              )}
              {metadata.generated_at && (
                <span>• Generated {new Date(metadata.generated_at).toLocaleString()}</span>
              )}
              {metadata.user_email && (
                <span className="flex items-center gap-1">
                  • <User className="w-3 h-3" /> {metadata.user_email}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            {isAIGenerated && <AIConfidenceIndicator section={section} />}
          </div>
        </div>

        {/* AI Metadata Actions */}
        {isAIGenerated && (
          <div className="flex flex-wrap gap-2 mt-4">
            <AISourcesViewer section={section} />
            <AIContentFeedback section={section} />
          </div>
        )}

        {/* Compliance Issues */}
        {isAIGenerated && metadata.compliance_issues && metadata.compliance_issues.length > 0 && (
          <div className="mt-4">
            <AIComplianceIssues section={section} />
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{section.content || '*No content*'}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}