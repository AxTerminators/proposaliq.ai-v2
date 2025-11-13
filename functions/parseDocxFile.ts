import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Custom Backend Function: Parse DOCX Files
 * 
 * This function extends the platform's file parsing capabilities to support DOCX files.
 * It extracts text content from DOCX files and optionally uses AI to structure the data
 * according to a provided JSON schema.
 * 
 * Usage from frontend:
 * const result = await base44.functions.invoke('parseDocxFile', {
 *   file_url: 'https://...',
 *   json_schema: { type: 'object', properties: {...} }, // optional
 *   extract_structured_data: true // optional, default false
 * });
 * 
 * @param {string} file_url - URL to the uploaded DOCX file
 * @param {object} json_schema - Optional JSON schema for structured data extraction
 * @param {boolean} extract_structured_data - Whether to use AI to extract structured data
 * @returns {object} { status, text_content, structured_data?, error? }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { file_url, json_schema, extract_structured_data = false } = await req.json();

    if (!file_url) {
      return Response.json({ 
        error: 'file_url is required' 
      }, { status: 400 });
    }

    // Step 1: Download the DOCX file
    console.log('[parseDocxFile] Downloading DOCX file from:', file_url);
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);

    // Step 2: Parse DOCX using mammoth (converts DOCX to HTML/text)
    // Using mammoth via npm: for Deno compatibility
    const mammoth = await import('npm:mammoth@1.6.0');
    
    console.log('[parseDocxFile] Parsing DOCX content...');
    const result = await mammoth.extractRawText({ buffer: uint8Array });
    const textContent = result.value;

    if (!textContent || textContent.trim().length === 0) {
      return Response.json({
        status: 'error',
        error: 'No text content could be extracted from the DOCX file. The file may be empty or corrupted.'
      });
    }

    console.log('[parseDocxFile] Extracted text length:', textContent.length, 'characters');

    // Step 3: If structured data extraction is requested, use AI
    let structuredData = null;
    if (extract_structured_data && json_schema) {
      console.log('[parseDocxFile] Extracting structured data using AI...');
      
      try {
        // Use service role to call InvokeLLM
        const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Extract structured data from the following document text according to the provided schema. 
          
Be thorough and accurate. If information is not present in the document, omit that field or use null.

Document Text:
${textContent}

Please extract the data according to the schema and return it as a JSON object.`,
          response_json_schema: json_schema
        });

        structuredData = llmResult;
        console.log('[parseDocxFile] Successfully extracted structured data');
      } catch (aiError) {
        console.error('[parseDocxFile] AI extraction failed:', aiError);
        // Return text content even if AI extraction fails
        return Response.json({
          status: 'partial_success',
          text_content: textContent,
          error: `Text extracted successfully, but AI structured extraction failed: ${aiError.message}`
        });
      }
    }

    // Step 4: Return results
    return Response.json({
      status: 'success',
      text_content: textContent,
      text_length: textContent.length,
      ...(structuredData && { structured_data: structuredData })
    });

  } catch (error) {
    console.error('[parseDocxFile] Error:', error);
    return Response.json({
      status: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});