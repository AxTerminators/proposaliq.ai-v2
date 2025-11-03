import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Database, Rocket, AlertCircle, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SampleDataGuard({ isOpen, onClose, onProceed }) {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearSampleData = async () => {
    setIsClearing(true);
    try {
      await base44.functions.invoke('clearSampleData', {});
      
      // Update user flags
      await base44.auth.updateMe({
        using_sample_data: false,
        sample_data_cleared: true
      });

      // Close dialog and proceed with the action
      onClose();
      if (onProceed) {
        onProceed();
      }
    } catch (error) {
      console.error("Error clearing sample data:", error);
      alert("There was an error clearing sample data. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleReturnToTraining = () => {
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-start gap-4 mb-2">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-2xl">
                Ready to Add Real Data?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base mt-2">
                You currently have sample data in your account. To add real proposals, you must first clear all sample data.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              What will happen when you clear sample data:
            </h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>All sample proposals, tasks, and resources will be removed</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Your organization profile will be preserved</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>You can immediately start adding real proposals</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Templates and resources remain available for your use</span>
              </li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReturnToTraining}
            disabled={isClearing}
            size="lg"
            className="flex-1"
          >
            <Database className="w-5 h-5 mr-2" />
            Keep Sample Data - More Practice
          </Button>
          <Button
            onClick={handleClearSampleData}
            disabled={isClearing}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            size="lg"
          >
            {isClearing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Clearing Sample Data...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5 mr-2" />
                Clear Sample Data & Add Real Proposal
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}