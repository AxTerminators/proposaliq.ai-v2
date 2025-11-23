import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Security Headers Validator
 * Checks and returns recommended security headers for the application
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Recommended security headers
    const securityHeaders = {
      'Content-Security-Policy': {
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;",
        description: 'Prevents XSS and injection attacks',
        severity: 'critical'
      },
      'X-Frame-Options': {
        value: 'DENY',
        description: 'Prevents clickjacking attacks',
        severity: 'high'
      },
      'X-Content-Type-Options': {
        value: 'nosniff',
        description: 'Prevents MIME type sniffing',
        severity: 'high'
      },
      'Strict-Transport-Security': {
        value: 'max-age=31536000; includeSubDomains',
        description: 'Forces HTTPS connections',
        severity: 'critical'
      },
      'Referrer-Policy': {
        value: 'strict-origin-when-cross-origin',
        description: 'Controls referrer information',
        severity: 'medium'
      },
      'Permissions-Policy': {
        value: 'geolocation=(), microphone=(), camera=()',
        description: 'Restricts browser features',
        severity: 'medium'
      },
      'X-XSS-Protection': {
        value: '1; mode=block',
        description: 'Legacy XSS protection (for older browsers)',
        severity: 'low'
      }
    };

    return Response.json({
      success: true,
      headers: securityHeaders,
      implementation_note: 'These headers should be configured at the platform/infrastructure level',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Security headers error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});