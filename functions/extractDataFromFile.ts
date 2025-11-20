import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Extract structured data from uploaded files using AI
 * 
 * Supports dynamic schema generation based on natural language field descriptions
 * Handles PDF, DOCX, DOC, and image files
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, extraction_fields_description, field_name } = await req.json();

    if (!file_url || !extraction_fields_description) {
      return Response.json({ 
        error: 'Missing required parameters: file_url and extraction_fields_description' 
      }, { status: 400 });
    }

    // Parse the extraction fields description into a structured schema
    const fields = extraction_fields_description
      .split(',')
      .map(f => f.trim())
      .filter(Boolean);

    // Build JSON schema dynamically
    const schema = {
      type: "object",
      properties: {}
    };

    fields.forEach(fieldDesc => {
      const cleanName = fieldDesc.toLowerCase().replace(/\s+/g, '_');
      
      // Detect field type based on keywords
      if (fieldDesc.toLowerCase().includes('date') || 
          fieldDesc.toLowerCase().includes('deadline')) {
        schema.properties[cleanName] = {
          type: "string",
          description: fieldDesc
        };
      } else if (fieldDesc.toLowerCase().includes('email')) {
        schema.properties[cleanName] = {
          type: "string",
          description: fieldDesc
        };
      } else if (fieldDesc.toLowerCase().includes('amount') || 
                 fieldDesc.toLowerCase().includes('value') ||
                 fieldDesc.toLowerCase().includes('cost')) {
        schema.properties[cleanName] = {
          type: "number",
          description: fieldDesc
        };
      } else if (fieldDesc.toLowerCase().includes('requirements') ||
                 fieldDesc.toLowerCase().includes('summaries') ||
                 fieldDesc.toLowerCase().includes('instructions')) {
        schema.properties[cleanName] = {
          type: "string",
          description: `${fieldDesc} (may be lengthy text)`
        };
      } else {
        schema.properties[cleanName] = {
          type: "string",
          description: fieldDesc
        };
      }
    });

    // Call AI extraction with the dynamic schema
    const extractionResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a document data extraction expert. Extract the following information from the provided document with high accuracy:

${fields.map((f, i) => `${i + 1}. ${f}`).join('\n')}

IMPORTANT INSTRUCTIONS:
- Extract data EXACTLY as it appears in the document
- If a field is not found, return null for that field
- For dates, use ISO format (YYYY-MM-DD) when possible
- For email addresses, extract complete email
- For monetary values, extract just the number without currency symbols
- For lengthy text fields (requirements, summaries, instructions), extract the full text

Return the data in the specified JSON format.`,
      file_urls: [file_url],
      response_json_schema: schema
    });

    // Log successful extraction
    console.log(`✅ Extracted data for field "${field_name}":`, extractionResult);

    return Response.json({
      success: true,
      extracted_data: extractionResult,
      schema_used: schema,
      fields_count: fields.length
    });

  } catch (error) {
    console.error('❌ Error extracting data from file:', error);
    return Response.json({
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});