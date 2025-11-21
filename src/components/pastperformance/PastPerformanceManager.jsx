import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

// Import modular components
import FileUploadAndExtraction from './FileUploadAndExtraction';
import ExtractionPreview from './ExtractionPreview';
import ManualEntryToggle from './ManualEntryToggle';
import RecordTypeSelector from './RecordTypeSelector';
import ContractDetailsForm from './ContractDetailsForm';
import PerformanceRatingsEditor from './PerformanceRatingsEditor';
import NarrativeInput from './NarrativeInput';
import RelevanceMapper from './RelevanceMapper';
import DuplicateWarning from './DuplicateWarning';

/**
 * PastPerformanceManager Component
 * Main orchestrator for past performance data entry with AI extraction
 * 
 * Props:
 * - proposalId: optional proposal ID to link record
 * - onSave: callback when record is saved
 * - onCancel: callback when user cancels
 * - existingRecord: optional existing record for editing
 */
export default function PastPerformanceManager({ 
    proposalId, 
    onSave, 
    onCancel, 
    existingRecord = null 
}) {
    const queryClient = useQueryClient();

    // Workflow state
    const [workflowStep, setWorkflowStep] = useState('select_type'); // select_type → upload_or_manual → preview → form
    const [entryMode, setEntryMode] = useState('upload'); // 'upload' or 'manual'
    const [recordType, setRecordType] = useState(existingRecord?.record_type || 'general_pp');

    // Form data state
    const [formData, setFormData] = useState(existingRecord || {
        record_type: 'general_pp',
        title: '',
        customer_agency: '',
        pop_start_date: '',
        pop_end_date: '',
        work_scope_tags: [],
        project_description: '',
        key_accomplishments: '',
        performance_ratings: {},
        overall_rating: '',
        government_narratives: {},
        ai_extraction_metadata: null,
        document_file_url: null,
        document_file_name: null
    });

    // AI extraction tracking
    const [extractedData, setExtractedData] = useState(null);
    const [aiExtractedFields, setAiExtractedFields] = useState([]);
    const [editTrackingRecords, setEditTrackingRecords] = useState([]);

    // Validation state
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    
    // Duplicate detection state
    const [duplicates, setDuplicates] = useState([]);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);

    // Get current user and organization
    const { data: user } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => base44.auth.me()
    });

    const { data: organization } = useQuery({
        queryKey: ['currentOrg'],
        queryFn: async () => {
            const orgs = await base44.entities.Organization.filter({ is_primary: true });
            return orgs[0];
        }
    });

    // Handle extraction completion
    const handleExtractionComplete = (data) => {
        setExtractedData(data);
        setAiExtractedFields(data.ai_extraction_metadata?.fields_extracted || []);
        setWorkflowStep('preview');
    };

    // Accept extracted data and move to form
    const handleAcceptExtraction = () => {
        setFormData({
            ...formData,
            ...extractedData,
            record_type: recordType
        });
        setWorkflowStep('form');
    };

    // Reject extraction and go to manual entry
    const handleRejectExtraction = () => {
        setEntryMode('manual');
        setExtractedData(null);
        setAiExtractedFields([]);
        setWorkflowStep('form');
    };

    // Switch to manual entry from upload mode
    const handleSwitchToManual = () => {
        setEntryMode('manual');
        setExtractedData(null);
        setAiExtractedFields([]);
        setWorkflowStep('form');
    };

    // Track user edits to AI-generated content
    const handleEditTracked = (editRecord) => {
        setEditTrackingRecords([...editTrackingRecords, {
            ...editRecord,
            edited_by: user?.email
        }]);
    };

    // Validate form data
    const validateForm = () => {
        const newErrors = {};

        // Required fields for all record types
        if (!formData.title?.trim()) {
            newErrors.title = 'Project title is required';
        }
        if (!formData.customer_agency?.trim()) {
            newErrors.customer_agency = 'Customer/Agency is required';
        }
        if (!formData.pop_start_date) {
            newErrors.pop_start_date = 'Start date is required';
        }
        if (!formData.pop_end_date) {
            newErrors.pop_end_date = 'End date is required';
        }
        if (!formData.work_scope_tags || formData.work_scope_tags.length === 0) {
            newErrors.work_scope_tags = 'At least one work scope tag is required';
        }

        // CPARS-specific required fields
        if (recordType === 'cpars') {
            if (!formData.contract_number?.trim()) {
                newErrors.contract_number = 'Contract number is required for CPARS';
            }
            if (!formData.role) {
                newErrors.role = 'Role is required for CPARS';
            }
            if (!formData.contract_type) {
                newErrors.contract_type = 'Contract type is required for CPARS';
            }
            if (!formData.overall_rating) {
                newErrors.overall_rating = 'Overall rating is required for CPARS';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Check for duplicates
    const checkDuplicates = async () => {
        if (!organization?.id) return;
        
        setCheckingDuplicates(true);
        try {
            const result = await base44.functions.invoke('detectDuplicatePastPerformance', {
                organization_id: organization.id,
                title: formData.title,
                contract_number: formData.contract_number,
                customer_agency: formData.customer_agency,
                pop_start_date: formData.pop_start_date,
                pop_end_date: formData.pop_end_date,
                exclude_id: existingRecord?.id
            });
            
            if (result.data.duplicates && result.data.duplicates.length > 0) {
                setDuplicates(result.data.duplicates);
                setShowDuplicateWarning(true);
                return true; // Has duplicates
            }
            return false; // No duplicates
        } catch (error) {
            console.error('Error checking duplicates:', error);
            return false; // Proceed on error
        } finally {
            setCheckingDuplicates(false);
        }
    };

    // Save record
    const handleSave = async (skipDuplicateCheck = false) => {
        if (!validateForm()) {
            toast.error('Please fix validation errors before saving');
            return;
        }

        // Check for duplicates unless explicitly skipped
        if (!skipDuplicateCheck && !existingRecord) {
            const hasDuplicates = await checkDuplicates();
            if (hasDuplicates) {
                return; // Show duplicate warning, don't save yet
            }
        }

        setSaving(true);

        try {
            // Update AI extraction metadata with user edit tracking
            const finalData = {
                ...formData,
                organization_id: organization?.id,
                proposal_id: proposalId,
                record_type: recordType,
                ai_extraction_metadata: formData.ai_extraction_metadata ? {
                    ...formData.ai_extraction_metadata,
                    manual_overrides: editTrackingRecords
                } : null,
                // Calculate red flags based on ratings
                has_red_flags: recordType === 'cpars' && (
                    ['Marginal', 'Unsatisfactory'].includes(formData.overall_rating) ||
                    Object.values(formData.performance_ratings || {}).some(r => 
                        ['Marginal', 'Unsatisfactory'].includes(r)
                    )
                )
            };

            let savedRecord;
            if (existingRecord?.id) {
                // Update existing record
                savedRecord = await base44.entities.PastPerformanceRecord.update(
                    existingRecord.id,
                    finalData
                );
            } else {
                // Create new record
                savedRecord = await base44.entities.PastPerformanceRecord.create(finalData);
            }

            // Trigger RAG ingestion in background (non-blocking)
            base44.functions.invoke('ingestPastPerformanceToRAG', { 
                record_id: savedRecord.id 
            }).catch(err => console.error('RAG ingestion failed (non-blocking):', err));

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['pastPerformanceRecords'] });

            toast.success(existingRecord ? 'Record updated successfully' : 'Record saved successfully');

            if (onSave) {
                onSave(savedRecord);
            }
        } catch (error) {
            console.error('Error saving record:', error);
            toast.error('Failed to save record: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // Render based on workflow step
    if (workflowStep === 'select_type') {
        return (
            <div className="space-y-4">
                <RecordTypeSelector
                    value={recordType}
                    onChange={(value) => {
                        setRecordType(value);
                        setFormData({ ...formData, record_type: value });
                    }}
                />
                <div className="flex justify-end gap-3">
                    {onCancel && (
                        <Button variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button onClick={() => setWorkflowStep('upload_or_manual')}>
                        Continue
                    </Button>
                </div>
            </div>
        );
    }

    if (workflowStep === 'upload_or_manual' && entryMode === 'upload') {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWorkflowStep('select_type')}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Record Type
                </Button>

                <FileUploadAndExtraction
                    recordType={recordType}
                    onExtractionComplete={handleExtractionComplete}
                    onManualEntry={handleSwitchToManual}
                />
            </div>
        );
    }

    if (workflowStep === 'preview' && extractedData) {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWorkflowStep('upload_or_manual')}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Upload
                </Button>

                <ExtractionPreview
                    extractedData={extractedData}
                    onAccept={handleAcceptExtraction}
                    onReject={handleRejectExtraction}
                />
            </div>
        );
    }

    if (workflowStep === 'form') {
        return (
            <div className="space-y-6">
                {/* Duplicate Warning */}
                {showDuplicateWarning && duplicates.length > 0 && (
                    <DuplicateWarning
                        duplicates={duplicates}
                        onProceed={() => {
                            setShowDuplicateWarning(false);
                            handleSave(true); // Skip duplicate check
                        }}
                        onCancel={() => {
                            setShowDuplicateWarning(false);
                            setDuplicates([]);
                        }}
                    />
                )}

                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            if (entryMode === 'upload') {
                                setWorkflowStep('preview');
                            } else {
                                setWorkflowStep('upload_or_manual');
                            }
                        }}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>

                    <ManualEntryToggle
                        currentMode={entryMode}
                        onToggleToUpload={() => {
                            setEntryMode('upload');
                            setWorkflowStep('upload_or_manual');
                        }}
                        onToggleToManual={() => {
                            setEntryMode('manual');
                            setAiExtractedFields([]);
                        }}
                    />
                </div>

                {/* Section 1: Record Type (read-only at this stage) */}
                <Card className="p-4 bg-slate-50">
                    <p className="text-sm text-slate-600">
                        <strong>Record Type:</strong> {recordType === 'cpars' ? 'CPARS Evaluation' : 'General Past Performance'}
                    </p>
                </Card>

                {/* Section 2: Contract Details */}
                <ContractDetailsForm
                    recordType={recordType}
                    formData={formData}
                    onChange={setFormData}
                    aiExtractedFields={aiExtractedFields}
                    errors={errors}
                />

                {/* Section 3: Performance Ratings (CPARS only) */}
                {recordType === 'cpars' && (
                    <PerformanceRatingsEditor
                        performanceRatings={formData.performance_ratings || {}}
                        overallRating={formData.overall_rating}
                        onChange={(ratings) => setFormData({ ...formData, performance_ratings: ratings })}
                        onOverallChange={(rating) => setFormData({ ...formData, overall_rating: rating })}
                    />
                )}

                {/* Section 4: Narratives */}
                <Card className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold">Project Narratives</h3>

                    <NarrativeInput
                        label="Key Accomplishments"
                        value={formData.key_accomplishments || ''}
                        onChange={(value) => setFormData({ ...formData, key_accomplishments: value })}
                        placeholder="Describe major achievements, outcomes, and deliverables"
                        rows={5}
                        isAIGenerated={aiExtractedFields.includes('ai_extracted_key_outcomes')}
                        fieldName="key_accomplishments"
                        onEditTracked={handleEditTracked}
                    />

                    <NarrativeInput
                        label="Challenges & Solutions"
                        value={formData.challenges_solutions || ''}
                        onChange={(value) => setFormData({ ...formData, challenges_solutions: value })}
                        placeholder="Describe any challenges faced and how they were resolved"
                        rows={4}
                        fieldName="challenges_solutions"
                        onEditTracked={handleEditTracked}
                    />

                    <NarrativeInput
                        label="Client Satisfaction Summary"
                        value={formData.client_satisfaction_summary || ''}
                        onChange={(value) => setFormData({ ...formData, client_satisfaction_summary: value })}
                        placeholder="Client feedback, testimonials, or satisfaction indicators"
                        rows={3}
                        fieldName="client_satisfaction_summary"
                        onEditTracked={handleEditTracked}
                    />
                </Card>

                {/* Section 5: Relevance Mapping & AI Governance */}
                <RelevanceMapper
                    formData={formData}
                    onChange={setFormData}
                    proposalContext={proposalId ? { proposal_name: 'Current Proposal' } : null}
                />

                {/* Validation Errors */}
                {Object.keys(errors).length > 0 && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            <strong>Please fix the following errors:</strong>
                            <ul className="list-disc list-inside mt-2">
                                {Object.values(errors).map((error, idx) => (
                                    <li key={idx}>{error}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    {onCancel && (
                        <Button variant="outline" onClick={onCancel} disabled={saving}>
                            Cancel
                        </Button>
                    )}
                    <Button 
                        onClick={() => handleSave(false)} 
                        disabled={saving || checkingDuplicates}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {saving || checkingDuplicates ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {checkingDuplicates ? 'Checking...' : 'Saving...'}
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                {existingRecord ? 'Update Record' : 'Save Record'}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}