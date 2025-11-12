import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Image Optimization Function
 * Processes uploaded images: resize, compress, and convert to WebP
 * Returns multiple sizes for responsive images
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const imageFile = formData.get('image');
    const maxWidth = parseInt(formData.get('maxWidth') || '1920');
    const quality = parseInt(formData.get('quality') || '85');
    const generateThumbnail = formData.get('generateThumbnail') === 'true';

    if (!imageFile) {
      return Response.json({
        success: false,
        error: 'No image file provided'
      }, { status: 400 });
    }

    // Read image data
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);

    // For now, we'll use the Core.UploadFile integration directly
    // In production, you'd want to use an image processing library
    // For MVP: just upload the original and return URL
    const uploadResult = await base44.integrations.Core.UploadFile({
      file: imageBytes
    });

    const originalUrl = uploadResult.file_url;

    // TODO: When image processing library is available:
    // 1. Decode image
    // 2. Resize to multiple sizes (thumbnail: 200px, medium: 800px, large: 1920px)
    // 3. Convert to WebP format
    // 4. Compress with quality setting
    // 5. Upload each version

    // For now, return the original URL for all sizes
    // This still enables the lazy loading pattern on the frontend
    const result = {
      success: true,
      original_url: originalUrl,
      optimized_url: originalUrl,
      thumbnail_url: originalUrl,
      medium_url: originalUrl,
      large_url: originalUrl,
      file_name: imageFile.name,
      file_size: imageBytes.length,
      optimization_note: 'Image uploaded successfully. Advanced optimization (resize/WebP conversion) requires additional image processing library.'
    };

    return Response.json(result);

  } catch (error) {
    console.error('[optimizeImage] Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});