import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Sparkles, 
  Save, 
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  CalendarCheck
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

/**
 * ProposalTimelineEditor Component
 * 
 * Manages all timeline aspects of a proposal including:
 * - Main due date (submission deadline)
 * - Internal deadlines (e.g., Draft Complete, Red Team Review)
 * - Key milestones (e.g., Client Kick-off, Solution Presentation)
 * 
 * Features:
 * - All fields remain editable at all times
 * - AI-powered predictive timeline generation
 * - Automatic calendar integration
 * - Visual status indicators
 */
export default function ProposalTimelineEditor({ 
  proposal, 
  onUpdate, 
  organizationUsers = [] 
}) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Form state
  const [dueDate, setDueDate] = useState(proposal.due_date || '');
  const [internalDeadlines, setInternalDeadlines] = useState(
    proposal.internal_deadlines || []
  );
  const [keyMilestones, setKeyMilestones] = useState(
    proposal.key_milestones || []
  );

  // Calculate timeline status
  const calculateTimelineStatus = () => {
    if (!dueDate) return 'not_set';
    if (internalDeadlines.length >= 3 && keyMilestones.length >= 1) {
      return 'complete';
    }
    return 'in_progress';
  };

  // Generate unique ID for new items
  const generateId = () => `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add new internal deadline
  const addInternalDeadline = () => {
    setInternalDeadlines([
      ...internalDeadlines,
      {
        id: generateId(),
        name: '',
        date: '',
        assigned_to_email: '',
        assigned_to_name: '',
        status: 'pending',
        notes: '',
        ai_generated: false
      }
    ]);
  };

  // Update internal deadline
  const updateInternalDeadline = (index, field, value) => {
    const updated = [...internalDeadlines];
    updated[index] = { ...updated[index], [field]: value };
    
    // If updating email, also update name
    if (field === 'assigned_to_email') {
      const user = organizationUsers.find(u => u.email === value);
      if (user) {
        updated[index].assigned_to_name = user.full_name;
      }
    }
    
    setInternalDeadlines(updated);
  };

  // Remove internal deadline
  const removeInternalDeadline = (index) => {
    setInternalDeadlines(internalDeadlines.filter((_, i) => i !== index));
  };

  // Add new milestone
  const addKeyMilestone = () => {
    setKeyMilestones([
      ...keyMilestones,
      {
        id: generateId(),
        name: '',
        date: '',
        status: 'pending',
        notes: '',
        ai_generated: false
      }
    ]);
  };

  // Update milestone
  const updateKeyMilestone = (index, field, value) => {
    const updated = [...keyMilestones];
    updated[index] = { ...updated[index], [field]: value };
    setKeyMilestones(updated);
  };

  // Remove milestone
  const removeKeyMilestone = (index) => {
    setKeyMilestones(keyMilestones.filter((_, i) => i !== index));
  };

  // AI Suggest Timeline
  const handleAISuggestTimeline = async () => {
    if (!dueDate) {
      alert('Please set the due date first before requesting AI suggestions.');
      return;
    }

    setAiLoading(true);
    try {
      const response = await base44.functions.invoke('generatePredictiveTimeline', {
        proposal_id: proposal.id,
        organization_id: proposal.organization_id,
        final_due_date: dueDate,
        proposal_type_category: proposal.proposal_type_category || 'RFP'
      });

      if (response.data && response.data.suggested_timeline) {
        const { internal_deadlines, key_milestones } = response.data.suggested_timeline;
        
        // Merge AI suggestions with existing items (don't overwrite existing)
        const newInternalDeadlines = [
          ...internalDeadlines,
          ...(internal_deadlines || []).map(d => ({ ...d, ai_generated: true }))
        ];
        
        const newKeyMilestones = [
          ...keyMilestones,
          ...(key_milestones || []).map(m => ({ ...m, ai_generated: true }))
        ];
        
        setInternalDeadlines(newInternalDeadlines);
        setKeyMilestones(newKeyMilestones);
      }
    } catch (error) {
      console.error('Error generating AI timeline:', error);
      alert('Failed to generate AI timeline suggestions. Please try again or enter manually.');
    } finally {
      setAiLoading(false);
    }
  };

  // Create/update calendar events for timeline items
  const syncToCalendar = async (updatedProposal) => {
    try {
      const calendarEvents = [];

      // Create events for internal deadlines
      for (const deadline of updatedProposal.internal_deadlines || []) {
        if (deadline.date && deadline.assigned_to_email) {
          // Check if event already exists
          if (deadline.event_id) {
            // Update existing event
            await base44.entities.CalendarEvent.update(deadline.event_id, {
              title: `📋 ${deadline.name}`,
              start_date: deadline.date,
              end_date: deadline.date,
              event_type: 'proposal_deadline',
              proposal_id: proposal.id,
              description: deadline.notes || `Internal deadline for ${proposal.proposal_name}`,
              attendees: [{
                email: deadline.assigned_to_email,
                name: deadline.assigned_to_name,
                rsvp_status: 'pending'
              }]
            });
          } else {
            // Create new event
            const event = await base44.entities.CalendarEvent.create({
              organization_id: proposal.organization_id,
              event_type: 'proposal_deadline',
              title: `📋 ${deadline.name}`,
              start_date: deadline.date,
              end_date: deadline.date,
              proposal_id: proposal.id,
              description: deadline.notes || `Internal deadline for ${proposal.proposal_name}`,
              attendees: [{
                email: deadline.assigned_to_email,
                name: deadline.assigned_to_name,
                rsvp_status: 'pending'
              }],
              reminder_minutes: [1440, 60, 15] // 1 day, 1 hour, 15 min before
            });
            
            // Store event_id back in deadline
            deadline.event_id = event.id;
          }
        }
      }

      // Create events for key milestones
      for (const milestone of updatedProposal.key_milestones || []) {
        if (milestone.date) {
          // Check if event already exists
          if (milestone.event_id) {
            // Update existing event
            await base44.entities.CalendarEvent.update(milestone.event_id, {
              title: `🎯 ${milestone.name}`,
              start_date: milestone.date,
              end_date: milestone.date,
              event_type: 'milestone',
              proposal_id: proposal.id,
              description: milestone.notes || `Key milestone for ${proposal.proposal_name}`
            });
          } else {
            // Create new event
            const event = await base44.entities.CalendarEvent.create({
              organization_id: proposal.organization_id,
              event_type: 'milestone',
              title: `🎯 ${milestone.name}`,
              start_date: milestone.date,
              end_date: milestone.date,
              proposal_id: proposal.id,
              description: milestone.notes || `Key milestone for ${proposal.proposal_name}`,
              reminder_minutes: [1440, 60] // 1 day, 1 hour before
            });
            
            // Store event_id back in milestone
            milestone.event_id = event.id;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      return false;
    }
  };

  // Save timeline
  const handleSave = async () => {
    // Validation
    if (!dueDate) {
      alert('Please set the due date before saving.');
      return;
    }

    setLoading(true);
    setSaveSuccess(false);

    try {
      const timelineStatus = calculateTimelineStatus();
      
      const updatedProposal = {
        due_date: dueDate,
        internal_deadlines: internalDeadlines,
        key_milestones: keyMilestones,
        timeline_status: timelineStatus
      };

      // Save to database
      await base44.entities.Proposal.update(proposal.id, updatedProposal);

      // Sync to calendar
      await syncToCalendar({
        ...proposal,
        ...updatedProposal
      });

      // Log activity
      await base44.entities.ActivityLog.create({
        proposal_id: proposal.id,
        user_email: (await base44.auth.me()).email,
        user_name: (await base44.auth.me()).full_name,
        action_type: 'status_changed',
        action_description: `Updated proposal timeline - ${internalDeadlines.length} internal deadlines, ${keyMilestones.length} milestones`
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Callback to parent
      if (onUpdate) {
        onUpdate({ ...proposal, ...updatedProposal });
      }
    } catch (error) {
      console.error('Error saving timeline:', error);
      alert('Failed to save timeline. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-slate-100 text-slate-700', icon: Clock },
      completed: { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
      overdue: { color: 'bg-red-100 text-red-700', icon: AlertCircle },
      skipped: { color: 'bg-gray-100 text-gray-500', icon: Clock }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={cn('flex items-center gap-1', config.color)}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Proposal Timeline</h3>
          <p className="text-sm text-slate-500">
            Manage submission deadline, internal deadlines, and key milestones
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved!</span>
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Timeline'}
          </Button>
        </div>
      </div>

      {/* Timeline Status Indicator */}
      <Card className={cn(
        'border-2',
        calculateTimelineStatus() === 'complete' ? 'border-green-300 bg-green-50' :
        calculateTimelineStatus() === 'in_progress' ? 'border-amber-300 bg-amber-50' :
        'border-slate-300 bg-slate-50'
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-slate-600" />
              <span className="font-medium text-slate-900">Timeline Status:</span>
              <Badge className={cn(
                calculateTimelineStatus() === 'complete' ? 'bg-green-600 text-white' :
                calculateTimelineStatus() === 'in_progress' ? 'bg-amber-600 text-white' :
                'bg-slate-600 text-white'
              )}>
                {calculateTimelineStatus() === 'complete' ? 'Complete' :
                 calculateTimelineStatus() === 'in_progress' ? 'In Progress' :
                 'Not Set'}
              </Badge>
            </div>
            <div className="text-sm text-slate-600">
              {!dueDate && 'Set due date to begin'}
              {dueDate && internalDeadlines.length < 3 && 'Add at least 3 internal deadlines'}
              {dueDate && internalDeadlines.length >= 3 && keyMilestones.length < 1 && 'Add at least 1 key milestone'}
              {calculateTimelineStatus() === 'complete' && '✓ Timeline fully configured'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggest Timeline Button */}
      <Button
        onClick={handleAISuggestTimeline}
        disabled={aiLoading || !dueDate}
        variant="outline"
        className="w-full border-purple-300 hover:bg-purple-50"
      >
        <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
        {aiLoading ? 'Generating AI Suggestions...' : 'AI Suggest Timeline'}
      </Button>

      {/* Due Date Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Submission Due Date
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="due_date">Due Date (RFP Submission Deadline)</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">
              This is the official deadline from the RFP/solicitation
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Internal Deadlines Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Internal Deadlines ({internalDeadlines.length})
            </CardTitle>
            <Button onClick={addInternalDeadline} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add Deadline
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {internalDeadlines.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No internal deadlines set. Add deadlines to track your team's progress.
            </p>
          ) : (
            internalDeadlines.map((deadline, index) => (
              <div key={deadline.id} className="border rounded-lg p-4 space-y-3 bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">#{index + 1}</span>
                    {deadline.ai_generated && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI Generated
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={() => removeInternalDeadline(index)}
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Deadline Name</Label>
                    <Input
                      value={deadline.name}
                      onChange={(e) => updateInternalDeadline(index, 'name', e.target.value)}
                      placeholder="e.g., Draft Complete"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={deadline.date}
                      onChange={(e) => updateInternalDeadline(index, 'date', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Assigned To</Label>
                    <select
                      value={deadline.assigned_to_email}
                      onChange={(e) => updateInternalDeadline(index, 'assigned_to_email', e.target.value)}
                      className="w-full mt-1 h-10 px-3 py-2 border border-slate-200 rounded-md text-sm"
                    >
                      <option value="">Select team member...</option>
                      {organizationUsers.map(user => (
                        <option key={user.email} value={user.email}>
                          {user.full_name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select
                      value={deadline.status}
                      onChange={(e) => updateInternalDeadline(index, 'status', e.target.value)}
                      className="w-full mt-1 h-10 px-3 py-2 border border-slate-200 rounded-md text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="overdue">Overdue</option>
                      <option value="skipped">Skipped</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={deadline.notes}
                    onChange={(e) => updateInternalDeadline(index, 'notes', e.target.value)}
                    placeholder="Additional instructions or context..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Key Milestones Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Key Milestones ({keyMilestones.length})
            </CardTitle>
            <Button onClick={addKeyMilestone} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add Milestone
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {keyMilestones.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No key milestones set. Add milestones to track major project checkpoints.
            </p>
          ) : (
            keyMilestones.map((milestone, index) => (
              <div key={milestone.id} className="border rounded-lg p-4 space-y-3 bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">#{index + 1}</span>
                    {milestone.ai_generated && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI Generated
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={() => removeKeyMilestone(index)}
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Milestone Name</Label>
                    <Input
                      value={milestone.name}
                      onChange={(e) => updateKeyMilestone(index, 'name', e.target.value)}
                      placeholder="e.g., Client Kick-off"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={milestone.date}
                      onChange={(e) => updateKeyMilestone(index, 'date', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Status</Label>
                  <select
                    value={milestone.status}
                    onChange={(e) => updateKeyMilestone(index, 'status', e.target.value)}
                    className="w-full mt-1 h-10 px-3 py-2 border border-slate-200 rounded-md text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={milestone.notes}
                    onChange={(e) => updateKeyMilestone(index, 'notes', e.target.value)}
                    placeholder="Additional context about this milestone..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 Timeline Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Set your official RFP due date first</li>
          <li>Add at least 3 internal deadlines to track team progress</li>
          <li>Add at least 1 key milestone for major project checkpoints</li>
          <li>Use AI suggestions to get started, then customize as needed</li>
          <li>All timeline items are automatically synced to your calendar</li>
          <li>Team members receive reminders for their assigned deadlines</li>
        </ul>
      </div>
    </div>
  );
}