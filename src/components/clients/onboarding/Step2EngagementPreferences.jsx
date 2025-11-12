import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Handshake, X } from "lucide-react";

export default function Step2EngagementPreferences({ formData, setFormData, onNext, onBack }) {
  const [formatInput, setFormatInput] = React.useState('');

  const addFormat = () => {
    if (!formatInput.trim()) return;
    setFormData({
      ...formData,
      preferred_proposal_formats: [...(formData.preferred_proposal_formats || []), formatInput.trim()]
    });
    setFormatInput('');
  };

  const removeFormat = (index) => {
    setFormData({
      ...formData,
      preferred_proposal_formats: formData.preferred_proposal_formats.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Handshake className="w-6 h-6 text-purple-600" />
          Engagement Preferences
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          How does this client prefer to work and communicate?
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Preferred Proposal Formats</Label>
          <p className="text-xs text-slate-500 mb-2">
            e.g., PDF, PowerPoint, Interactive Web, Video Presentation
          </p>
          <div className="flex gap-2">
            <Input
              value={formatInput}
              onChange={(e) => setFormatInput(e.target.value)}
              placeholder="Add format..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFormat();
                }
              }}
            />
            <Button onClick={addFormat} type="button">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(formData.preferred_proposal_formats || []).map((format, idx) => (
              <Badge key={idx} variant="secondary" className="pl-3 pr-1">
                {format}
                <button
                  onClick={() => removeFormat(idx)}
                  className="ml-2 hover:bg-slate-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label>Typical Review Cycle Duration (Days)</Label>
          <Input
            type="number"
            value={formData.typical_review_cycle_duration || ''}
            onChange={(e) => setFormData({
              ...formData,
              typical_review_cycle_duration: parseInt(e.target.value) || null
            })}
            placeholder="e.g., 14"
          />
          <p className="text-xs text-slate-500 mt-1">
            How long does it typically take for this client to review and provide feedback?
          </p>
        </div>

        <div>
          <Label>Decision-Making Process Notes</Label>
          <Textarea
            value={formData.decision_making_process_notes}
            onChange={(e) => setFormData({...formData, decision_making_process_notes: e.target.value})}
            placeholder="Describe how decisions are made, who's involved, approval hierarchy..."
            rows={5}
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline">
          ← Back
        </Button>
        <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-700">
          Next: Primary Stakeholder →
        </Button>
      </div>
    </div>
  );
}