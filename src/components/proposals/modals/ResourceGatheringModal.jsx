import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X, Upload, Library } from "lucide-react";

/**
 * ResourceGatheringModal - Phase 1: Core Structure
 * 
 * A modal for uploading new resources and linking existing content for proposals.
 * Integrates with RAG system for AI-powered content generation.
 * 
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback when modal is closed
 * @param {string} proposalId - ID of the current proposal
 * @param {string} organizationId - ID of the organization
 */
export default function ResourceGatheringModal({
  isOpen,
  onClose,
  proposalId,
  organizationId,
}) {
  // State for active tab
  const [activeTab, setActiveTab] = useState("upload");

  /**
   * Handle modal close - reset state and call parent callback
   */
  const handleClose = () => {
    setActiveTab("upload");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Library className="w-6 h-6 text-blue-600" />
            Resource Gathering Center
          </DialogTitle>
          <DialogDescription>
            Upload new resources or link existing content from your library to enhance this proposal
          </DialogDescription>
        </DialogHeader>

        {/* Main Tabs Container */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload New Resources
            </TabsTrigger>
            <TabsTrigger value="select" className="flex items-center gap-2">
              <Library className="w-4 h-4" />
              Select from Library & Past Work
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab Content */}
          <TabsContent
            value="upload"
            className="flex-1 overflow-y-auto mt-4 space-y-6"
          >
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center bg-slate-50">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-700 mb-2">
                Upload New Resources
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-slate-400">
                Supports PDF, DOCX, images, and other document formats
              </p>
            </div>

            {/* Placeholder for Phase 2: File upload component and metadata fields */}
            <div className="text-sm text-slate-500 italic">
              Phase 2: File upload component, metadata fields, and AI processing options will be added here
            </div>
          </TabsContent>

          {/* Select from Library Tab Content */}
          <TabsContent
            value="select"
            className="flex-1 overflow-y-auto mt-4 space-y-6"
          >
            <div className="border border-slate-200 rounded-lg p-8 text-center bg-slate-50">
              <Library className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-700 mb-2">
                Select from Library & Past Work
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Search and filter through existing resources, past performance, and more
              </p>
            </div>

            {/* Placeholder for Phase 3: Search, filters, and results list */}
            <div className="text-sm text-slate-500 italic">
              Phase 3: Search bar, filters, and selectable resource list will be added here
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Save & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}