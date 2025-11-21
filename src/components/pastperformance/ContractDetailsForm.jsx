import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ContractDetailsForm Component
 * Structured metadata form for Section 2 - conditionally shows CPARS-specific fields
 * 
 * Props:
 * - recordType: 'general_pp' or 'cpars'
 * - formData: object containing all form values
 * - onChange: callback with updated form data
 * - aiExtractedFields: array of field names that were AI-extracted
 * - errors: object with validation errors
 */
export default function ContractDetailsForm({ recordType, formData, onChange, aiExtractedFields = [], errors = {} }) {
    // Helper to check if field was AI-extracted
    const isAIExtracted = (fieldName) => aiExtractedFields.includes(fieldName);

    // Handle input change
    const handleChange = (field, value) => {
        onChange({ ...formData, [field]: value });
    };

    // Handle multi-value fields (tags, arrays)
    const handleArrayChange = (field, value) => {
        const array = value.split(',').map(v => v.trim()).filter(Boolean);
        onChange({ ...formData, [field]: array });
    };

    const isCPARS = recordType === 'cpars';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Contract Snapshot</CardTitle>
                <CardDescription>
                    Structured metadata for RAG system and proposal matching
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* General Fields - Always Visible */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                        Basic Information
                    </h3>
                    
                    {/* Project Title */}
                    <div>
                        <Label htmlFor="title" className="flex items-center gap-2">
                            Project Name/Title <span className="text-red-500">*</span>
                            {isAIExtracted('title') && (
                                <Badge variant="secondary" className="text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI
                                </Badge>
                            )}
                        </Label>
                        <Input
                            id="title"
                            value={formData.title || ''}
                            onChange={(e) => handleChange('title', e.target.value)}
                            placeholder="Enter project name or title"
                            className={errors.title ? 'border-red-500' : ''}
                        />
                        {errors.title && (
                            <p className="text-xs text-red-500 mt-1">{errors.title}</p>
                        )}
                    </div>

                    {/* Customer/Agency */}
                    <div>
                        <Label htmlFor="customer_agency" className="flex items-center gap-2">
                            Customer/Agency <span className="text-red-500">*</span>
                            {isAIExtracted('customer_agency') && (
                                <Badge variant="secondary" className="text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI
                                </Badge>
                            )}
                        </Label>
                        <Input
                            id="customer_agency"
                            value={formData.customer_agency || ''}
                            onChange={(e) => handleChange('customer_agency', e.target.value)}
                            placeholder="Government agency or commercial client"
                            className={errors.customer_agency ? 'border-red-500' : ''}
                        />
                        {errors.customer_agency && (
                            <p className="text-xs text-red-500 mt-1">{errors.customer_agency}</p>
                        )}
                    </div>

                    {/* Period of Performance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="pop_start_date" className="flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                Start Date <span className="text-red-500">*</span>
                                {isAIExtracted('pop_start_date') && (
                                    <Badge variant="secondary" className="text-xs ml-auto">
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        AI
                                    </Badge>
                                )}
                            </Label>
                            <Input
                                id="pop_start_date"
                                type="date"
                                value={formData.pop_start_date || ''}
                                onChange={(e) => handleChange('pop_start_date', e.target.value)}
                                className={errors.pop_start_date ? 'border-red-500' : ''}
                            />
                        </div>
                        <div>
                            <Label htmlFor="pop_end_date" className="flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                End Date <span className="text-red-500">*</span>
                                {isAIExtracted('pop_end_date') && (
                                    <Badge variant="secondary" className="text-xs ml-auto">
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        AI
                                    </Badge>
                                )}
                            </Label>
                            <Input
                                id="pop_end_date"
                                type="date"
                                value={formData.pop_end_date || ''}
                                onChange={(e) => handleChange('pop_end_date', e.target.value)}
                                className={errors.pop_end_date ? 'border-red-500' : ''}
                            />
                        </div>
                    </div>

                    {/* Contract Value */}
                    <div>
                        <Label htmlFor="contract_value" className="flex items-center gap-2">
                            <DollarSign className="w-3 h-3" />
                            Contract Value (USD)
                            {isAIExtracted('contract_value') && (
                                <Badge variant="secondary" className="text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI
                                </Badge>
                            )}
                        </Label>
                        <Input
                            id="contract_value"
                            type="number"
                            value={formData.contract_value || ''}
                            onChange={(e) => handleChange('contract_value', parseFloat(e.target.value))}
                            placeholder="e.g., 5000000"
                        />
                    </div>

                    {/* Work Scope Tags */}
                    <div>
                        <Label htmlFor="work_scope_tags" className="flex items-center gap-2">
                            Work Scope Tags <span className="text-red-500">*</span>
                            {isAIExtracted('work_scope_tags') && (
                                <Badge variant="secondary" className="text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI
                                </Badge>
                            )}
                        </Label>
                        <Input
                            id="work_scope_tags"
                            value={Array.isArray(formData.work_scope_tags) ? formData.work_scope_tags.join(', ') : ''}
                            onChange={(e) => handleArrayChange('work_scope_tags', e.target.value)}
                            placeholder="e.g., IT Services, Cybersecurity, Cloud Migration"
                            className={errors.work_scope_tags ? 'border-red-500' : ''}
                        />
                        <p className="text-xs text-slate-500 mt-1">Separate multiple tags with commas</p>
                    </div>

                    {/* Project Description */}
                    <div>
                        <Label htmlFor="project_description">
                            Brief Project Description
                        </Label>
                        <Textarea
                            id="project_description"
                            value={formData.project_description || ''}
                            onChange={(e) => handleChange('project_description', e.target.value)}
                            placeholder="Describe the project and work performed"
                            rows={3}
                        />
                    </div>
                </div>

                {/* CPARS-Specific Fields - Conditionally Visible */}
                {isCPARS && (
                    <div className="space-y-4 border-t pt-6">
                        <h3 className="text-sm font-semibold text-slate-700 border-b pb-2">
                            CPARS-Specific Details
                        </h3>

                        {/* Contract Number */}
                        <div>
                            <Label htmlFor="contract_number" className="flex items-center gap-2">
                                Contract Number <span className="text-red-500">*</span>
                                {isAIExtracted('contract_number') && (
                                    <Badge variant="secondary" className="text-xs">
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        AI
                                    </Badge>
                                )}
                            </Label>
                            <Input
                                id="contract_number"
                                value={formData.contract_number || ''}
                                onChange={(e) => handleChange('contract_number', e.target.value)}
                                placeholder="Official contract number"
                                className={errors.contract_number ? 'border-red-500' : ''}
                            />
                        </div>

                        {/* Task Order Number */}
                        <div>
                            <Label htmlFor="task_order_number">
                                Task/Order Number
                            </Label>
                            <Input
                                id="task_order_number"
                                value={formData.task_order_number || ''}
                                onChange={(e) => handleChange('task_order_number', e.target.value)}
                                placeholder="Task or delivery order number"
                            />
                        </div>

                        {/* Role and Contract Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="role">
                                    Role <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.role || ''}
                                    onValueChange={(value) => handleChange('role', value)}
                                >
                                    <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="prime">Prime Contractor</SelectItem>
                                        <SelectItem value="subcontractor">Subcontractor</SelectItem>
                                        <SelectItem value="teaming_partner">Teaming Partner</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="contract_type">
                                    Contract Type <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.contract_type || ''}
                                    onValueChange={(value) => handleChange('contract_type', value)}
                                >
                                    <SelectTrigger className={errors.contract_type ? 'border-red-500' : ''}>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FFP">FFP - Firm Fixed Price</SelectItem>
                                        <SelectItem value="T&M">T&M - Time & Materials</SelectItem>
                                        <SelectItem value="CPFF">CPFF - Cost Plus Fixed Fee</SelectItem>
                                        <SelectItem value="CPAF">CPAF - Cost Plus Award Fee</SelectItem>
                                        <SelectItem value="IDIQ">IDIQ</SelectItem>
                                        <SelectItem value="BPA">BPA - Blanket Purchase Agreement</SelectItem>
                                        <SelectItem value="Cost_Plus">Cost Plus</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Sub-agency and Place of Performance */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="sub_agency_bureau">
                                    Sub-agency/Bureau
                                </Label>
                                <Input
                                    id="sub_agency_bureau"
                                    value={formData.sub_agency_bureau || ''}
                                    onChange={(e) => handleChange('sub_agency_bureau', e.target.value)}
                                    placeholder="e.g., USACE Louisville District"
                                />
                            </div>
                            <div>
                                <Label htmlFor="place_of_performance">
                                    Place of Performance
                                </Label>
                                <Input
                                    id="place_of_performance"
                                    value={formData.place_of_performance || ''}
                                    onChange={(e) => handleChange('place_of_performance', e.target.value)}
                                    placeholder="City/State or CONUS/OCONUS"
                                />
                            </div>
                        </div>

                        {/* NAICS and PSC Codes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="naics_codes">
                                    NAICS Codes
                                </Label>
                                <Input
                                    id="naics_codes"
                                    value={Array.isArray(formData.naics_codes) ? formData.naics_codes.join(', ') : ''}
                                    onChange={(e) => handleArrayChange('naics_codes', e.target.value)}
                                    placeholder="e.g., 541512, 541519"
                                />
                                <p className="text-xs text-slate-500 mt-1">Comma-separated</p>
                            </div>
                            <div>
                                <Label htmlFor="psc_codes">
                                    PSC Codes
                                </Label>
                                <Input
                                    id="psc_codes"
                                    value={Array.isArray(formData.psc_codes) ? formData.psc_codes.join(', ') : ''}
                                    onChange={(e) => handleArrayChange('psc_codes', e.target.value)}
                                    placeholder="e.g., D302, R408"
                                />
                                <p className="text-xs text-slate-500 mt-1">Comma-separated</p>
                            </div>
                        </div>

                        {/* Small Business Programs */}
                        <div>
                            <Label htmlFor="small_business_program">
                                Small Business Programs
                            </Label>
                            <Input
                                id="small_business_program"
                                value={Array.isArray(formData.small_business_program) ? formData.small_business_program.join(', ') : ''}
                                onChange={(e) => handleArrayChange('small_business_program', e.target.value)}
                                placeholder="e.g., 8(a), HUBZone, WOSB, SDVOSB"
                            />
                            <p className="text-xs text-slate-500 mt-1">Comma-separated</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}