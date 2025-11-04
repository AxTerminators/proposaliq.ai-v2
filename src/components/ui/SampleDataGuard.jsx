import React, { useState } from "react";
import UniversalAlert from "./UniversalAlert";
import { Button } from "@/components/ui/button";
import { Database, Rocket, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SampleDataGuard({ isOpen, onClose, onProceed }) {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearSampleData = async () => {
    setIsClearing(true);
    try {
      await base44.functions.invoke('clearSampleData', {});
      
      await base44.auth.updateMe({
        using_sample_data: false,
        sample_data_cleared: true
      });

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
    <UniversalAlert
      isOpen={isOpen}
      onClose={onClose}
      type="warning"
      title="Ready to Add Real Data?"
      description="You currently have sample data in your account. To add real proposals, you must first clear all sample data."
      confirmText={null}
      showIcon={false}
    >
      <div className="space-y-4 mt-4">
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

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReturnToTraining}
            disabled={isClearing}
            className="flex-1"
          >
            <Database className="w-5 h-5 mr-2" />
            Keep Sample Data
          </Button>
          <Button
            onClick={handleClearSampleData}
            disabled={isClearing}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {isClearing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Clearing...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5 mr-2" />
                Clear & Add Real Proposal
              </>
            )}
          </Button>
        </div>
      </div>
    </UniversalAlert>
  );
}