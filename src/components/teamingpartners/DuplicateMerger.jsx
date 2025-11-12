import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Users, CheckCircle2, Loader2, ArrowRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Component for merging duplicate Teaming Partner records
 * Shows side-by-side comparison and allows data consolidation
 */
export default function DuplicateMerger({ isOpen, onClose, duplicateGroup, organization }) {
  const queryClient = useQueryClient();
  const [primaryRecordId, setPrimaryRecordId] = useState(null);
  const [mergeStep, setMergeStep] = useState(1); // 1: select primary, 2: review merge, 3: confirm
  const [mergedData, setMergedData] = useState(null);

  useEffect(() => {
    if (isOpen && duplicateGroup?.length > 0) {
      // Auto-select the most complete record as primary
      const mostComplete = [...duplicateGroup].sort((a, b) => {
        const scoreA = calculateCompletenessScore(a);
        const scoreB = calculateCompletenessScore(b);
        return scoreB - scoreA;
      })[0];
      
      setPrimaryRecordId(mostComplete.id);
      setMergeStep(1);
    }
  }, [isOpen, duplicateGroup]);

  useEffect(() => {
    if (primaryRecordId && duplicateGroup) {
      const primary = duplicateGroup.find(p => p.id === primaryRecordId);
      const secondaries = duplicateGroup.filter(p => p.id !== primaryRecordId);
      
      if (primary) {
        const merged = consolidateData(primary, secondaries);
        setMergedData(merged);
      }
    }
  }, [primaryRecordId, duplicateGroup]);

  const calculateCompletenessScore = (partner) => {
    let score = 0;
    
    // Key fields worth more points
    if (partner.partner_name) score += 5;
    if (partner.uei) score += 10;
    if (partner.cage_code) score += 5;
    if (partner.poc_email) score += 3;
    if (partner.poc_name) score += 2;
    if (partner.website_url) score += 2;
    
    // Array fields
    score += (partner.certifications?.length || 0);
    score += (partner.core_capabilities?.length || 0);
    score += (partner.technologies_used?.length || 0);
    score += (partner.tags?.length || 0);
    
    // Rich content
    if (partner.past_performance_summary) score += 5;
    if (partner.key_personnel_summary) score += 3;
    if (partner.capability_statement_url) score += 5;
    
    return score;
  };

  const consolidateData = (primary, secondaries) => {
    const merged = { ...primary };

    // Merge array fields (unique values only)
    const arrayFields = [
      'certifications', 'secondary_naics', 'core_capabilities', 
      'technologies_used', 'differentiators', 'target_agencies',
      'contract_vehicles', 'geographic_coverage', 'quality_certifications',
      'security_clearances', 'tags', 'socioeconomic_designations'
    ];

    arrayFields.forEach(field => {
      const allValues = [
        ...(primary[field] || []),
        ...secondaries.flatMap(s => s[field] || [])
      ];
      merged[field] = [...new Set(allValues)]; // Remove duplicates
    });

    // Merge key_projects_summary
    const allProjects = [
      ...(primary.key_projects_summary || []),
      ...secondaries.flatMap(s => s.key_projects_summary || [])
    ];
    merged.key_projects_summary = allProjects;

    // Use the longest/most complete text fields
    const textFields = ['past_performance_summary', 'key_personnel_summary', 'notes'];
    textFields.forEach(field => {
      const allTexts = [primary[field], ...secondaries.map(s => s[field])].filter(Boolean);
      merged[field] = allTexts.reduce((longest, current) => 
        (current?.length || 0) > (longest?.length || 0) ? current : longest
      , primary[field] || '');
    });

    // Use highest scores
    merged.strategic_fit_score = Math.max(
      primary.strategic_fit_score || 0,
      ...secondaries.map(s => s.strategic_fit_score || 0)
    );
    merged.collaboration_rating = Math.max(
      primary.collaboration_rating || 0,
      ...secondaries.map(s => s.collaboration_rating || 0)
    );

    // Sum usage stats
    merged.total_collaborations = (primary.total_collaborations || 0) + 
      secondaries.reduce((sum, s) => sum + (s.total_collaborations || 0), 0);

    // Use most recent date
    const allDates = [primary.last_collaboration_date, ...secondaries.map(s => s.last_collaboration_date)]
      .filter(Boolean)
      .map(d => new Date(d));
    if (allDates.length > 0) {
      merged.last_collaboration_date = new Date(Math.max(...allDates)).toISOString();
    }

    // Prefer non-null values for single fields
    const singleFields = ['poc_name', 'poc_title', 'poc_email', 'poc_phone', 'address', 
                          'website_url', 'duns_number', 'primary_naics', 'revenue_range',
                          'employee_count', 'years_in_business'];
    
    singleFields.forEach(field => {
      if (!merged[field]) {
        const nonNullValue = secondaries.find(s => s[field])?.[field];
        if (nonNullValue) merged[field] = nonNullValue;
      }
    });

    return merged;
  };

  const mergeMutation = useMutation({
    mutationFn: async () => {
      if (!primaryRecordId || !duplicateGroup) {
        throw new Error("Invalid merge configuration");
      }

      const primary = duplicateGroup.find(p => p.id === primaryRecordId);
      const secondaries = duplicateGroup.filter(p => p.id !== primaryRecordId);

      // Step 1: Update primary record with merged data
      await base44.entities.TeamingPartner.update(primaryRecordId, mergedData);

      // Step 2: Find and update all proposals that reference secondary records
      const allProposals = await base44.entities.Proposal.filter({
        organization_id: organization.id
      });

      const proposalsToUpdate = allProposals.filter(proposal => {
        const isPrime = secondaries.some(s => s.id === proposal.prime_contractor_id);
        const isTeaming = secondaries.some(s => 
          proposal.teaming_partner_ids?.includes(s.id)
        );
        return isPrime || isTeaming;
      });

      // Update proposal references
      for (const proposal of proposalsToUpdate) {
        const updates = {};

        // Update prime contractor reference
        if (secondaries.some(s => s.id === proposal.prime_contractor_id)) {
          updates.prime_contractor_id = primaryRecordId;
          updates.prime_contractor_name = mergedData.partner_name;
        }

        // Update teaming partner references
        if (proposal.teaming_partner_ids) {
          const updatedTeamingIds = proposal.teaming_partner_ids.map(id =>
            secondaries.some(s => s.id === id) ? primaryRecordId : id
          );
          // Remove duplicates
          updates.teaming_partner_ids = [...new Set(updatedTeamingIds)];
        }

        if (Object.keys(updates).length > 0) {
          await base44.entities.Proposal.update(proposal.id, updates);
        }
      }

      // Step 3: Delete secondary records
      for (const secondary of secondaries) {
        await base44.entities.TeamingPartner.delete(secondary.id);
      }

      return {
        primary: mergedData,
        deletedCount: secondaries.length,
        proposalsUpdated: proposalsToUpdate.length
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['teaming-partners'] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      
      toast.success(
        `✅ Merge Complete!`,
        {
          description: `Consolidated ${result.deletedCount} duplicate(s) and updated ${result.proposalsUpdated} proposal(s)`,
          duration: 5000
        }
      );
      
      onClose();
    },
    onError: (error) => {
      toast.error("Merge failed: " + error.message);
    }
  });

  const handleMerge = async () => {
    if (mergeStep === 1) {
      setMergeStep(2);
    } else if (mergeStep === 2) {
      setMergeStep(3);
    } else if (mergeStep === 3) {
      await mergeMutation.mutateAsync();
    }
  };

  if (!duplicateGroup || duplicateGroup.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Users className="w-6 h-6 text-blue-600" />
            Merge Duplicate Partners
          </DialogTitle>
          <DialogDescription>
            Consolidate {duplicateGroup.length} duplicate records into one master profile
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3].map(step => (
            <div key={step} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-semibold",
                mergeStep >= step 
                  ? "bg-blue-600 text-white" 
                  : "bg-slate-200 text-slate-500"
              )}>
                {step}
              </div>
              {step < 3 && (
                <ArrowRight className={cn(
                  "w-4 h-4",
                  mergeStep > step ? "text-blue-600" : "text-slate-300"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Primary Record */}
        {mergeStep === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Step 1:</strong> Select which record to keep as the master profile. 
                The most complete record is recommended.
              </p>
            </div>

            <RadioGroup value={primaryRecordId} onValueChange={setPrimaryRecordId}>
              <div className="space-y-3">
                {duplicateGroup.map((partner) => {
                  const completeness = calculateCompletenessScore(partner);
                  const isRecommended = partner.id === duplicateGroup.sort((a, b) => 
                    calculateCompletenessScore(b) - calculateCompletenessScore(a)
                  )[0].id;

                  return (
                    <Card 
                      key={partner.id}
                      className={cn(
                        "border-2 cursor-pointer transition-all",
                        primaryRecordId === partner.id 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-slate-200 hover:border-blue-300"
                      )}
                      onClick={() => setPrimaryRecordId(partner.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value={partner.id} id={partner.id} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Label htmlFor={partner.id} className="font-semibold text-lg cursor-pointer">
                                {partner.partner_name}
                              </Label>
                              {isRecommended && (
                                <Badge className="bg-green-500 text-white">
                                  ⭐ Recommended
                                </Badge>
                              )}
                              <Badge variant="outline">
                                {completeness}% complete
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {partner.uei && (
                                <p className="text-slate-600">UEI: <span className="font-mono">{partner.uei}</span></p>
                              )}
                              {partner.cage_code && (
                                <p className="text-slate-600">CAGE: <span className="font-mono">{partner.cage_code}</span></p>
                              )}
                              {partner.poc_email && (
                                <p className="text-slate-600">POC: {partner.poc_email}</p>
                              )}
                              {partner.certifications?.length > 0 && (
                                <p className="text-slate-600">{partner.certifications.length} certification(s)</p>
                              )}
                              {partner.core_capabilities?.length > 0 && (
                                <p className="text-slate-600">{partner.core_capabilities.length} capabilities</p>
                              )}
                              <p className="text-slate-600">Created: {new Date(partner.created_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Step 2: Review Merged Data */}
        {mergeStep === 2 && mergedData && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Step 2:</strong> Review the consolidated data. All unique information has been combined.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Merged Profile Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Company Name</Label>
                    <p className="font-semibold">{mergedData.partner_name}</p>
                  </div>
                  {mergedData.uei && (
                    <div>
                      <Label className="text-xs text-slate-500">UEI</Label>
                      <p className="font-mono">{mergedData.uei}</p>
                    </div>
                  )}
                </div>

                {mergedData.certifications?.length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-500 mb-2 block">
                      Certifications ({mergedData.certifications.length})
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {mergedData.certifications.map((cert, idx) => (
                        <Badge key={idx} className="bg-blue-600 text-white">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {mergedData.core_capabilities?.length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-500 mb-2 block">
                      Core Capabilities ({mergedData.core_capabilities.length})
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {mergedData.core_capabilities.map((cap, idx) => (
                        <Badge key={idx} variant="outline">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {mergedData.tags?.length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-500 mb-2 block">
                      Tags ({mergedData.tags.length})
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {mergedData.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {mergeStep === 3 && (
          <div className="space-y-4">
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 mb-2">
                    ⚠️ Final Confirmation Required
                  </p>
                  <p className="text-sm text-red-800 mb-3">
                    This action will:
                  </p>
                  <ul className="space-y-2 text-sm text-red-800">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Keep <strong>{mergedData?.partner_name}</strong> as the master record</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Trash2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Permanently delete {duplicateGroup.length - 1} duplicate record(s)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Update all proposal references to point to the master record</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Consolidate all unique data into the master record</span>
                    </li>
                  </ul>
                  <p className="text-sm text-red-800 mt-3 font-semibold">
                    This action cannot be undone!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {mergeStep > 1 && (
            <Button
              variant="outline"
              onClick={() => setMergeStep(mergeStep - 1)}
              disabled={mergeMutation.isPending}
            >
              Back
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mergeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={!primaryRecordId || mergeMutation.isPending}
            className={cn(
              mergeStep === 3 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {mergeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Merging...
              </>
            ) : mergeStep === 3 ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirm Merge
              </>
            ) : (
              <>
                {mergeStep === 1 ? 'Review Merge' : 'Proceed to Confirm'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}