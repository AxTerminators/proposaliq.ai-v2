import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const { file_url, record_type = 'general_pp' } = await req.json();
        
        if (!file_url) {
            return Response.json({ 
                error: 'file_url is required',
                success: false 
            }, { status: 400 });
        }

        // Fetch the file content
        const fileResponse = await fetch(file_url);
        if (!fileResponse.ok) {
            return Response.json({ 
                error: 'Failed to fetch file from provided URL',
                success: false 
            }, { status: 400 });
        }

        const fileBlob = await fileResponse.blob();
        const fileBuffer = await fileBlob.arrayBuffer();
        const uint8Array = new Uint8Array(fileBuffer);

        // Determine file type from URL or content
        const fileName = file_url.split('/').pop() || '';
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

        let extractedText = '';
        let parsingMethod = '';

        // Parse based on file type
        if (fileExtension === 'pdf') {
            // For PDF, we'll use AI to extract from the file directly via file_urls
            parsingMethod = 'pdf_ai_extraction';
            extractedText = 'PDF content will be processed by AI';
        } else if (fileExtension === 'docx' || fileExtension === 'doc') {
            // For DOCX, use mammoth library for robust parsing
            parsingMethod = 'docx_mammoth_extraction';
            try {
                // Import mammoth for DOCX parsing
                const mammoth = await import('npm:mammoth@1.6.0');
                const result = await mammoth.extractRawText({ 
                    arrayBuffer: fileBuffer 
                });
                extractedText = result.value;
            } catch (docxError) {
                console.error('DOCX parsing error:', docxError);
                return Response.json({ 
                    error: 'Failed to parse DOCX file. Please ensure it is a valid Word document.',
                    success: false,
                    details: docxError.message
                }, { status: 400 });
            }
        } else if (fileExtension === 'txt') {
            // For TXT, simple text decode
            parsingMethod = 'text_extraction';
            const decoder = new TextDecoder('utf-8');
            extractedText = decoder.decode(uint8Array);
        } else {
            return Response.json({ 
                error: `Unsupported file type: ${fileExtension}. Supported formats: PDF, DOCX, TXT`,
                success: false 
            }, { status: 400 });
        }

        // Define JSON schema for extraction based on record type
        const extractionSchema = {
            type: "object",
            properties: {
                // Basic fields for all record types
                title: { type: "string", description: "Project name or CPARS title" },
                customer_agency: { type: "string", description: "Government agency or client name" },
                pop_start_date: { type: "string", description: "Period of Performance start date (YYYY-MM-DD format)" },
                pop_end_date: { type: "string", description: "Period of Performance end date (YYYY-MM-DD format)" },
                contract_value: { type: "number", description: "Contract value in USD as a number" },
                contract_value_display: { type: "string", description: "Human-readable contract value" },
                place_of_performance: { type: "string", description: "Location where work was performed" },
                work_scope_tags: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Keywords describing the work performed"
                },
                project_description: { type: "string", description: "Detailed description of the project" },
                key_accomplishments: { type: "string", description: "Key achievements and outcomes" },
                challenges_solutions: { type: "string", description: "Challenges faced and solutions implemented" },
                client_satisfaction_summary: { type: "string", description: "Client feedback or satisfaction indicators" },
                
                // CPARS-specific fields (extracted if record_type is 'cpars')
                sub_agency_bureau: { type: "string", description: "Sub-agency or bureau name" },
                contract_number: { type: "string", description: "Official contract number" },
                task_order_number: { type: "string", description: "Task or delivery order number" },
                role: { 
                    type: "string", 
                    enum: ["prime", "subcontractor", "teaming_partner"],
                    description: "Organization's role on contract"
                },
                contract_type: { 
                    type: "string",
                    enum: ["FFP", "T&M", "CPFF", "CPAF", "IDIQ", "BPA", "Cost_Plus", "Other"],
                    description: "Type of contract"
                },
                naics_codes: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "NAICS codes"
                },
                psc_codes: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Product/Service codes"
                },
                small_business_program: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Small business designations"
                },
                overall_rating: { 
                    type: "string",
                    enum: ["Exceptional", "Very Good", "Satisfactory", "Marginal", "Unsatisfactory", "Not Applicable", "Not Rated"],
                    description: "Overall CPARS rating"
                },
                performance_ratings: {
                    type: "object",
                    properties: {
                        quality: { type: "string", enum: ["Exceptional", "Very Good", "Satisfactory", "Marginal", "Unsatisfactory", "Not Applicable"] },
                        schedule: { type: "string", enum: ["Exceptional", "Very Good", "Satisfactory", "Marginal", "Unsatisfactory", "Not Applicable"] },
                        cost_control: { type: "string", enum: ["Exceptional", "Very Good", "Satisfactory", "Marginal", "Unsatisfactory", "Not Applicable"] },
                        management: { type: "string", enum: ["Exceptional", "Very Good", "Satisfactory", "Marginal", "Unsatisfactory", "Not Applicable"] },
                        regulatory_compliance: { type: "string", enum: ["Exceptional", "Very Good", "Satisfactory", "Marginal", "Unsatisfactory", "Not Applicable"] },
                        small_business_utilization: { type: "string", enum: ["Exceptional", "Very Good", "Satisfactory", "Marginal", "Unsatisfactory", "Not Applicable"] }
                    }
                },
                government_narratives: {
                    type: "object",
                    properties: {
                        quality: { type: "string" },
                        schedule: { type: "string" },
                        cost_control: { type: "string" },
                        management: { type: "string" },
                        regulatory_compliance: { type: "string" },
                        small_business_utilization: { type: "string" },
                        overall: { type: "string" }
                    }
                },
                contractor_comments_rebuttal: { type: "string", description: "Contractor's response or rebuttal" },
                
                // AI-generated summaries
                ai_extracted_key_outcomes: { type: "string", description: "Bulleted list of key outcomes extracted by AI" },
                ai_generated_summary: { type: "string", description: "Overall performance summary generated by AI" },
                
                // Confidence scoring
                extraction_confidence: { 
                    type: "number", 
                    description: "Overall confidence score from 0-100 for the extraction quality"
                },
                fields_extracted: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of field names successfully extracted"
                }
            }
        };

        // Build AI prompt based on record type
        let prompt = '';
        if (record_type === 'cpars') {
            prompt = `You are an expert at extracting structured data from CPARS (Contractor Performance Assessment Reporting System) documents.

Analyze the provided document and extract ALL available information into the specified JSON schema. 

Key extraction guidelines:
- Extract all performance ratings (Exceptional, Very Good, Satisfactory, Marginal, Unsatisfactory)
- Capture government narratives for each performance factor
- Extract contract metadata (numbers, dates, values, codes)
- Identify the contractor's role (prime or subcontractor)
- Pull out key accomplishments and outcomes
- Note any contractor comments or rebuttals
- Generate a concise summary of overall performance
- Create a bulleted list of key outcomes

For dates, use YYYY-MM-DD format.
For contract values, extract both the numeric value and a human-readable display format.
Assign a confidence score (0-100) based on how clearly the data was present in the document.
List all fields you successfully extracted.

If a field is not present in the document, omit it from the response (do not include null values).`;
        } else {
            prompt = `You are an expert at extracting structured data from past performance references and project summaries.

Analyze the provided document and extract ALL available information into the specified JSON schema.

Key extraction guidelines:
- Extract project name/title
- Identify customer/client/agency
- Determine period of performance dates
- Extract contract value and scope
- Pull out project description and work performed
- Identify key accomplishments and outcomes
- Note any challenges and solutions
- Capture client satisfaction indicators or feedback
- Generate a concise summary of the project
- Create a bulleted list of key outcomes

For dates, use YYYY-MM-DD format.
For contract values, extract both the numeric value and a human-readable display format.
Assign a confidence score (0-100) based on how clearly the data was present in the document.
List all fields you successfully extracted.

If a field is not present in the document, omit it from the response (do not include null values).`;
        }

        // Use AI to extract structured data
        let extractedData;
        try {
            if (parsingMethod === 'pdf_ai_extraction') {
                // For PDF, pass file URL directly to AI
                extractedData = await base44.integrations.Core.InvokeLLM({
                    prompt: prompt,
                    response_json_schema: extractionSchema,
                    file_urls: [file_url]
                });
            } else {
                // For DOCX/TXT, pass extracted text
                extractedData = await base44.integrations.Core.InvokeLLM({
                    prompt: `${prompt}\n\nDocument content:\n\n${extractedText}`,
                    response_json_schema: extractionSchema
                });
            }
        } catch (aiError) {
            console.error('AI extraction error:', aiError);
            return Response.json({ 
                error: 'AI extraction failed. Please try again or enter data manually.',
                success: false,
                details: aiError.message
            }, { status: 500 });
        }

        // Check for red flags (Marginal or Unsatisfactory ratings)
        let hasRedFlags = false;
        if (record_type === 'cpars' && extractedData.overall_rating) {
            if (['Marginal', 'Unsatisfactory'].includes(extractedData.overall_rating)) {
                hasRedFlags = true;
            }
        }
        if (extractedData.performance_ratings) {
            const ratings = Object.values(extractedData.performance_ratings);
            if (ratings.some(rating => ['Marginal', 'Unsatisfactory'].includes(rating))) {
                hasRedFlags = true;
            }
        }

        // Build extraction metadata
        const extractionMetadata = {
            extracted_at: new Date().toISOString(),
            confidence_score: extractedData.extraction_confidence || 0,
            extraction_method: parsingMethod,
            fields_extracted: extractedData.fields_extracted || [],
            manual_overrides: []
        };

        // Remove metadata fields from extracted data
        delete extractedData.extraction_confidence;
        delete extractedData.fields_extracted;

        // Return successful extraction
        return Response.json({
            success: true,
            data: {
                ...extractedData,
                record_type: record_type,
                has_red_flags: hasRedFlags,
                ai_extraction_metadata: extractionMetadata,
                document_file_url: file_url,
                document_file_name: fileName
            },
            message: 'Document parsed successfully. Please review and edit the extracted data as needed.'
        });

    } catch (error) {
        console.error('Unexpected error in parsePastPerformanceDocument:', error);
        return Response.json({ 
            error: 'An unexpected error occurred during document parsing',
            success: false,
            details: error.message
        }, { status: 500 });
    }
});