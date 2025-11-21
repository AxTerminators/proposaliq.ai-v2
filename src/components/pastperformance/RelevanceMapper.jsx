import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Target, Lightbulb, Info } from 'lucide-react';

/**
 * RelevanceMapper Component
 * Allows users to mark records for proposal use and set priority/relevance
 * 
 * Props:
 * - formData: current form data
 * - onChange: callback with updated form data
 * - proposalContext: optional - if adding from a specific proposal context
 */
export default function RelevanceMapper({ formData, onChange, proposalContext = null }) {
    const handleToggleCandidate = (checked) => {
        onChange({
            ...formData,
            is_candidate_for_proposal: checked,
            relevance_to_proposal: checked ? formData.relevance_to_proposal : '',
            priority_for_proposal: checked ? (formData.priority_for_proposal || 'secondary') : null
        });
    };

    const handleRelevanceChange = (value) => {
        onChange({ ...formData, relevance_to_proposal: value });
    };

    const handlePriorityChange = (value) => {
        onChange({ ...formData, priority_for_proposal: value });
    };

    const handleNameUseToggle = (checked) => {
        onChange({ ...formData, allow_customer_name_use: checked });
    };

    const handleAvoidForAIToggle = (checked) => {
        onChange({ ...formData, avoid_for_ai_default: checked });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Proposal Relevance & AI Governance
                </CardTitle>
                <CardDescription>
                    Configure how this record should be used in proposals and by AI writing assistants
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Proposal Context Indicator */}
                {proposalContext && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Adding to:</strong> {proposalContext.proposal_name}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Mark as Candidate for Proposal */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="space-y-1">
                        <Label className="text-base font-semibold">
                            Use in Proposal Generation
                        </Label>
                        <p className="text-sm text-slate-600">
                            Mark this record as available for AI to reference when writing proposals
                        </p>
                    </div>
                    <Switch
                        checked={formData.is_candidate_for_proposal || false}
                        onCheckedChange={handleToggleCandidate}
                    />
                </div>

                {/* Conditional Fields - Only if marked as candidate */}
                {formData.is_candidate_for_proposal && (
                    <div className="space-y-4 pl-4 border-l-2 border-blue-300">
                        {/* Priority Level */}
                        <div>
                            <Label htmlFor="priority" className="text-sm font-semibold mb-2 block">
                                Priority Level <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.priority_for_proposal || 'secondary'}
                                onValueChange={handlePriorityChange}
                            >
                                <SelectTrigger id="priority">
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="primary">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-green-500">Primary</Badge>
                                            <span className="text-xs">Featured prominently, best match</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="secondary">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-blue-500">Secondary</Badge>
                                            <span className="text-xs">Supporting reference</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="background">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-slate-500">Background</Badge>
                                            <span className="text-xs">Additional context only</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500 mt-1">
                                Higher priority = AI will reference this more prominently
                            </p>
                        </div>

                        {/* Relevance Explanation */}
                        <div>
                            <Label htmlFor="relevance" className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4" />
                                Why is this relevant to the proposal?
                            </Label>
                            <Textarea
                                id="relevance"
                                value={formData.relevance_to_proposal || ''}
                                onChange={(e) => handleRelevanceChange(e.target.value)}
                                placeholder="Explain how this project relates to the current RFP requirements, similar scope, same agency, similar challenges, etc."
                                rows={4}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                This helps AI understand the context and improves match quality
                            </p>
                        </div>

                        {/* Customer Name Usage Permission */}
                        <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                            <div className="space-y-1">
                                <Label className="font-semibold">
                                    Allow Customer Name in Proposals
                                </Label>
                                <p className="text-xs text-slate-600">
                                    If disabled, AI will anonymize or omit customer name
                                </p>
                            </div>
                            <Switch
                                checked={formData.allow_customer_name_use ?? true}
                                onCheckedChange={handleNameUseToggle}
                            />
                        </div>

                        {/* Red Flag Override for AI */}
                        {formData.has_red_flags && (
                            <div className="flex items-center justify-between p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                                <div className="space-y-1">
                                    <Label className="font-semibold text-yellow-900">
                                        ⚠️ Exclude from AI by Default
                                    </Label>
                                    <p className="text-xs text-yellow-800">
                                        This record has low ratings. Enable to prevent AI from using it unless explicitly selected.
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.avoid_for_ai_default || false}
                                    onCheckedChange={handleAvoidForAIToggle}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Info Box */}
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                        <strong>AI Governance:</strong> These settings control how the AI writing assistant uses this record.
                        You can always manually override these preferences when generating specific proposals.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}