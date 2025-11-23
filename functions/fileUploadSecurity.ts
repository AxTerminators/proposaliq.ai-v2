import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * File Upload Security Validator
 * Validates file uploads for security threats
 */

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', // Archives can contain malware
  '.sh', '.bash', '.ps1', '.app', '.deb', '.rpm'
];

function validateFileName(fileName) {
  const errors = [];
  
  // Check for path traversal
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    errors.push('File name contains path traversal characters');
  }
  
  // Check for dangerous extensions
  const lowerFileName = fileName.toLowerCase();
  for (const ext of DANGEROUS_EXTENSIONS) {
    if (lowerFileName.endsWith(ext)) {
      errors.push(`Dangerous file extension: ${ext}`);
    }
  }
  
  // Check for hidden files
  if (fileName.startsWith('.')) {
    errors.push('Hidden files are not allowed');
  }
  
  // Check for special characters
  if (/[<>:"|?*]/.test(fileName)) {
    errors.push('File name contains invalid characters');
  }
  
  return errors;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { fileName, fileSize, mimeType } = body;

    if (!fileName || !fileSize || !mimeType) {
      return Response.json(
        { error: 'Missing required fields: fileName, fileSize, mimeType' },
        { status: 400 }
      );
    }

    const validationErrors = [];
    
    // Validate file name
    const fileNameErrors = validateFileName(fileName);
    validationErrors.push(...fileNameErrors);
    
    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      validationErrors.push(`File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }
    
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      validationErrors.push(`MIME type '${mimeType}' is not allowed`);
    }
    
    // Log security check
    await base44.asServiceRole.entities.SystemLog.create({
      organization_id: user.organization_id,
      log_type: 'security',
      entity_type: 'file_upload',
      actor_email: user.email,
      actor_name: user.full_name,
      action_type: 'file_upload_validation',
      action_description: `File upload security check for: ${fileName}`,
      metadata: {
        fileName,
        fileSize,
        mimeType,
        validationErrors,
        passed: validationErrors.length === 0
      },
      success: validationErrors.length === 0,
      severity: validationErrors.length > 0 ? 'warning' : 'info'
    });

    if (validationErrors.length > 0) {
      return Response.json({
        success: false,
        valid: false,
        errors: validationErrors,
        fileName,
        recommendations: [
          'Use standard file formats (PDF, DOCX, XLSX, etc.)',
          'Keep file size under 50MB',
          'Avoid special characters in file names',
          'Do not upload executable files'
        ]
      });
    }

    return Response.json({
      success: true,
      valid: true,
      fileName,
      fileSize,
      mimeType,
      message: 'File passed security validation'
    });
  } catch (error) {
    console.error('File upload security error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});