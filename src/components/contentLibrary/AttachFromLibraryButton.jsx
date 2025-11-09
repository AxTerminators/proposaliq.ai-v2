import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Library, Paperclip } from "lucide-react";
import ContentLibraryBrowser from "./ContentLibraryBrowser";

export default function AttachFromLibraryButton({ 
  organization, 
  onAttach,
  variant = "outline",
  size = "sm"
}) {
  const [showBrowser, setShowBrowser] = useState(false);

  const handleSelect = (item) => {
    if (onAttach) {
      // Format the item for attachment
      const attachment = {
        file_name: item.file_name || item.title || item.project_name || item.full_name || 'Untitled',
        file_url: item.file_url || null,
        content_type: item._contentType,
        content_id: item.id,
        from_library: true
      };
      
      onAttach(attachment);
    }
    setShowBrowser(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowBrowser(true)}
        className="gap-2"
      >
        <Library className="w-4 h-4" />
        Attach from Library
      </Button>

      <ContentLibraryBrowser
        isOpen={showBrowser}
        onClose={() => setShowBrowser(false)}
        organization={organization}
        onSelect={handleSelect}
        showPreview={true}
      />
    </>
  );
}