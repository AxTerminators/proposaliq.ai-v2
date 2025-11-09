import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Library, Plus, Sparkles, TrendingUp } from "lucide-react";
import ContentLibraryBrowser from "../contentLibrary/ContentLibraryBrowser";
import { toast } from "sonner";

export default function ContentLibraryIntegration({ 
  organization, 
  sectionType,
  onInsertContent,
  currentContent = ''
}) {
  const [showBrowser, setShowBrowser] = useState(false);

  const handleInsert = (item) => {
    let contentToInsert = '';
    
    // Extract the appropriate content based on item type
    if (item.boilerplate_content) {
      contentToInsert = item.boilerplate_content;
    } else if (item.project_description) {
      contentToInsert = item.project_description;
    } else if (item.description) {
      contentToInsert = item.description;
    } else {
      toast.error('This item has no insertable content');
      return;
    }

    if (onInsertContent) {
      onInsertContent(contentToInsert);
      toast.success('Content inserted from library');
    }
    
    setShowBrowser(false);
  };

  return (
    <div className="space-y-3">
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Library className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  Content Library
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </h3>
                <p className="text-sm text-slate-600">
                  Reuse proven content from your library
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => setShowBrowser(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Library className="w-4 h-4 mr-2" />
              Browse Library
            </Button>
          </div>
        </CardContent>
      </Card>

      <ContentLibraryBrowser
        isOpen={showBrowser}
        onClose={() => setShowBrowser(false)}
        organization={organization}
        onSelect={handleInsert}
        contentTypeFilter={null}
        showPreview={true}
      />
    </div>
  );
}