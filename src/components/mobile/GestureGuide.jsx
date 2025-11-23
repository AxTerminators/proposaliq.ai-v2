import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Hand, ArrowLeft, ArrowRight, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * GestureGuide - Tutorial overlay showing available mobile gestures
 * Shows on first mobile visit to help users discover swipe interactions
 */
export default function GestureGuide({ onClose, autoShow = true }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!autoShow) return;
    
    const hasSeenGuide = localStorage.getItem('mobile_gesture_guide_seen');
    if (!hasSeenGuide) {
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, [autoShow]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('mobile_gesture_guide_seen', 'true');
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <Card className="max-w-md w-full border-2 border-blue-300 shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Hand className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">Mobile Gestures</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="min-h-[44px] min-w-[44px]"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowDown className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Pull to Refresh</h3>
                <p className="text-sm text-slate-600">Pull down on any list to refresh data</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowLeft className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Swipe Left for Actions</h3>
                <p className="text-sm text-slate-600">Swipe left on cards to reveal quick actions</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Swipe to Navigate</h3>
                <p className="text-sm text-slate-600">Swipe right from left edge to go back</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Hand className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Swipe Between Columns</h3>
                <p className="text-sm text-slate-600">Swipe left/right to navigate Kanban columns</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleClose}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 min-h-[48px]"
          >
            Got It!
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}