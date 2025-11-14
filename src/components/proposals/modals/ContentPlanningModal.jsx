import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, Calendar, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ContentPlanningModal({ isOpen, onClose, proposalId, onCompletion }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [sectionAssignments, setSectionAssignments] = useState({});

  useEffect(() => {
    if (isOpen && proposalId) {
      loadData();
    }
  }, [isOpen, proposalId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load sections
      const secs = await base44.entities.ProposalSection.filter({
        proposal_id: proposalId
      }, 'order');
      setSections(secs);

      // Load organization team members
      const user = await base44.auth.me();
      const orgs = await base44.entities.Organization.filter(
        { created_by: user.email },
        '-created_date',
        1
      );

      if (orgs.length > 0) {
        // For now, just use the current user
        // In a full implementation, you'd query team members
        setTeamMembers([{
          email: user.email,
          name: user.full_name
        }]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignWriter = (sectionId, writerEmail) => {
    setSectionAssignments(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], writer: writerEmail }
    }));
  };

  const handleSetDeadline = (sectionId, deadline) => {
    setSectionAssignments(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], deadline }
    }));
  };

  const handleSave = async () => {
    // **UPDATED: Validate that at least some assignments were made**
    const assignedCount = Object.keys(sectionAssignments).length;
    
    if (assignedCount === 0) {
      alert("Please assign at least one section to a writer before saving.");
      return;
    }

    try {
      setSaving(true);
      
      // In the future, save assignments to a SectionAssignment entity
      // For now, just show confirmation
      
      console.log('[ContentPlanningModal] ✅ Content planning completed with', assignedCount, 'assignments');
      
      alert(`✅ Assigned ${assignedCount} sections to writers`);
      
      // **NEW: Call onCompletion to mark checklist item as complete**
      if (onCompletion) {
        onCompletion();
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error saving assignments. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Content Planning: Assign Sections & Deadlines</DialogTitle>
          <DialogDescription>
            Assign sections to team members and set writing deadlines
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {sections.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No sections found. Generate an outline first.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((section, idx) => (
                  <div key={section.id} className="p-4 border rounded-lg bg-white space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Badge className="bg-cyan-600 text-white mb-2">Section {idx + 1}</Badge>
                        <p className="font-medium text-slate-900">{section.section_name}</p>
                        <p className="text-xs text-slate-500 capitalize mt-1">
                          {section.section_type?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor={`writer-${section.id}`} className="flex items-center gap-2">
                          <UserPlus className="w-3 h-3" />
                          Assign Writer
                        </Label>
                        <Select
                          value={sectionAssignments[section.id]?.writer || ""}
                          onValueChange={(value) => handleAssignWriter(section.id, value)}
                        >
                          <SelectTrigger id={`writer-${section.id}`}>
                            <SelectValue placeholder="Select writer" />
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers.map(member => (
                              <SelectItem key={member.email} value={member.email}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`deadline-${section.id}`} className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          Deadline
                        </Label>
                        <Input
                          id={`deadline-${section.id}`}
                          type="date"
                          value={sectionAssignments[section.id]?.deadline || ""}
                          onChange={(e) => handleSetDeadline(section.id, e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-slate-600">
              {Object.keys(sectionAssignments).length} of {sections.length} sections assigned
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || loading}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Assignments
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}