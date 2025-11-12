import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, X } from "lucide-react";
import { toast } from "sonner";

export default function Step3PrimaryStakeholder({ formData, setFormData, onNext, onBack }) {
  const [expertiseInput, setExpertiseInput] = React.useState('');

  const addExpertise = () => {
    if (!expertiseInput.trim()) return;
    setFormData({
      ...formData,
      primary_stakeholder: {
        ...formData.primary_stakeholder,
        technical_expertise_areas: [
          ...(formData.primary_stakeholder?.technical_expertise_areas || []),
          expertiseInput.trim()
        ]
      }
    });
    setExpertiseInput('');
  };

  const removeExpertise = (index) => {
    setFormData({
      ...formData,
      primary_stakeholder: {
        ...formData.primary_stakeholder,
        technical_expertise_areas: formData.primary_stakeholder.technical_expertise_areas.filter((_, i) => i !== index)
      }
    });
  };

  const handleNext = () => {
    if (!formData.primary_stakeholder?.member_name || !formData.primary_stakeholder?.member_email) {
      toast.error('Primary stakeholder name and email are required');
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <User className="w-6 h-6 text-green-600" />
          Primary Client Stakeholder
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Key contact person for this client relationship
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Full Name *</Label>
          <Input
            value={formData.primary_stakeholder?.member_name || ''}
            onChange={(e) => setFormData({
              ...formData,
              primary_stakeholder: {
                ...formData.primary_stakeholder,
                member_name: e.target.value
              }
            })}
            placeholder="Jane Doe"
            className={!formData.primary_stakeholder?.member_name && "border-red-300"}
          />
        </div>

        <div>
          <Label>Email *</Label>
          <Input
            type="email"
            value={formData.primary_stakeholder?.member_email || ''}
            onChange={(e) => setFormData({
              ...formData,
              primary_stakeholder: {
                ...formData.primary_stakeholder,
                member_email: e.target.value
              }
            })}
            placeholder="jane.doe@acme.com"
            className={!formData.primary_stakeholder?.member_email && "border-red-300"}
          />
        </div>

        <div>
          <Label>Job Title</Label>
          <Input
            value={formData.primary_stakeholder?.member_title || ''}
            onChange={(e) => setFormData({
              ...formData,
              primary_stakeholder: {
                ...formData.primary_stakeholder,
                member_title: e.target.value
              }
            })}
            placeholder="VP of Operations"
          />
        </div>

        <div>
          <Label>Department</Label>
          <Input
            value={formData.primary_stakeholder?.department || ''}
            onChange={(e) => setFormData({
              ...formData,
              primary_stakeholder: {
                ...formData.primary_stakeholder,
                department: e.target.value
              }
            })}
            placeholder="Operations"
          />
        </div>

        <div>
          <Label>Team Role</Label>
          <Select
            value={formData.primary_stakeholder?.team_role || 'owner'}
            onValueChange={(value) => setFormData({
              ...formData,
              primary_stakeholder: {
                ...formData.primary_stakeholder,
                team_role: value
              }
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner (Full Control)</SelectItem>
              <SelectItem value="approver">Approver</SelectItem>
              <SelectItem value="reviewer">Reviewer</SelectItem>
              <SelectItem value="observer">Observer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Decision Authority Level</Label>
          <Select
            value={formData.primary_stakeholder?.decision_authority_level || 'high'}
            onValueChange={(value) => setFormData({
              ...formData,
              primary_stakeholder: {
                ...formData.primary_stakeholder,
                decision_authority_level: value
              }
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="final">Final Authority</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Influence Level</Label>
          <Select
            value={formData.primary_stakeholder?.influence_level || 'high'}
            onValueChange={(value) => setFormData({
              ...formData,
              primary_stakeholder: {
                ...formData.primary_stakeholder,
                influence_level: value
              }
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="budget_oversight"
              checked={formData.primary_stakeholder?.budget_oversight || false}
              onCheckedChange={(checked) => setFormData({
                ...formData,
                primary_stakeholder: {
                  ...formData.primary_stakeholder,
                  budget_oversight: checked
                }
              })}
            />
            <Label htmlFor="budget_oversight" className="cursor-pointer">
              Has Budget Oversight Responsibilities
            </Label>
          </div>
        </div>

        <div className="col-span-2">
          <Label>Technical Expertise Areas</Label>
          <div className="flex gap-2 mt-2">
            <Input
              value={expertiseInput}
              onChange={(e) => setExpertiseInput(e.target.value)}
              placeholder="Add expertise area..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addExpertise();
                }
              }}
            />
            <Button onClick={addExpertise} type="button">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(formData.primary_stakeholder?.technical_expertise_areas || []).map((area, idx) => (
              <Badge key={idx} variant="secondary" className="pl-3 pr-1">
                {area}
                <button
                  onClick={() => removeExpertise(idx)}
                  className="ml-2 hover:bg-slate-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline">
          ← Back
        </Button>
        <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
          Next: Custom Branding →
        </Button>
      </div>
    </div>
  );
}