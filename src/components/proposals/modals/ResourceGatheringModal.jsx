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
import ResourceUploadSection from "./ResourceUploadSection";
import ResourceSelectionSection from "./ResourceSelectionSection";

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
            {successMessage && (
              <Alert className="bg-green-50 border-green-300">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}
            <ResourceUploadSection
              onUploadComplete={(uploadedResource) => {
                setSuccessMessage("✅ Resource uploaded and ingested successfully!");
                queryClient.invalidateQueries({ queryKey: ["proposal-resources", organizationId] });
                setTimeout(() => setSuccessMessage(""), 5000);
              }}
              organizationId={organizationId}
              proposalId={proposalId}
            />
          </TabsContent>

          {/* Select from Library Tab Content */}
          <TabsContent
            value="select"
            className="flex-1 overflow-y-auto mt-4 space-y-6"
          >
            {successMessage && (
              <Alert className="bg-green-50 border-green-300">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}
            <ResourceSelectionSection
              organizationId={organizationId}
              proposalId={proposalId}
              onLinkComplete={(linkedResources, response) => {
                setSuccessMessage(`✅ Successfully linked ${response.linked_count} resource(s)!`);
                queryClient.invalidateQueries({ queryKey: ["proposals"] });
                queryClient.invalidateQueries({ queryKey: ["proposal-resources", organizationId] });
                queryClient.invalidateQueries({ queryKey: ["past-performance", organizationId] });
                setTimeout(() => setSuccessMessage(""), 5000);
              }}
            />
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