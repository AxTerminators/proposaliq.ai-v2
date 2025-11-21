import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Detect duplicate resources based on file name, content similarity, and metadata
 * 
 * Input:
 * {
 *   organization_id: string,
 *   file_name: string,
 *   title: string,
 *   resource_type: string,
 *   file_size: number (optional)
 * }
 * 
 * Output:
 * {
 *   has_duplicates: boolean,
 *   duplicates: [{
 *     id: string,
 *     title: string,
 *     file_name: string,
 *     similarity_score: number,
 *     match_reason: string
 *   }]
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id, file_name, title, resource_type, file_size } = await req.json();

    if (!organization_id || !file_name || !title) {
      return Response.json(
        { error: 'organization_id, file_name, and title are required' },
        { status: 400 }
      );
    }

    // Fetch all resources for this organization
    const allResources = await base44.entities.ProposalResource.filter({
      organization_id
    });

    const duplicates = [];

    // Normalize file name for comparison
    const normalizedFileName = file_name.toLowerCase().replace(/[_\s-]+/g, '');
    const normalizedTitle = title.toLowerCase().trim();

    for (const resource of allResources) {
      let similarityScore = 0;
      const matchReasons = [];

      // Check 1: Exact file name match
      const resourceFileName = (resource.file_name || '').toLowerCase().replace(/[_\s-]+/g, '');
      if (resourceFileName === normalizedFileName) {
        similarityScore += 50;
        matchReasons.push('Identical file name');
      } else if (resourceFileName.includes(normalizedFileName) || normalizedFileName.includes(resourceFileName)) {
        similarityScore += 30;
        matchReasons.push('Similar file name');
      }

      // Check 2: Title similarity
      const resourceTitle = (resource.title || '').toLowerCase().trim();
      if (resourceTitle === normalizedTitle) {
        similarityScore += 30;
        matchReasons.push('Identical title');
      } else if (calculateStringSimilarity(resourceTitle, normalizedTitle) > 0.7) {
        similarityScore += 20;
        matchReasons.push('Similar title');
      }

      // Check 3: Resource type match
      if (resource_type && resource.resource_type === resource_type) {
        similarityScore += 10;
      }

      // Check 4: File size match (within 1% tolerance)
      if (file_size && resource.file_size) {
        const sizeDiff = Math.abs(resource.file_size - file_size) / file_size;
        if (sizeDiff < 0.01) {
          similarityScore += 10;
          matchReasons.push('Same file size');
        }
      }

      // If similarity score is above threshold, mark as potential duplicate
      if (similarityScore >= 40) {
        duplicates.push({
          id: resource.id,
          title: resource.title,
          file_name: resource.file_name,
          resource_type: resource.resource_type,
          similarity_score: Math.min(similarityScore, 100),
          match_reason: matchReasons.join(', '),
          created_date: resource.created_date,
          usage_count: resource.usage_count || 0
        });
      }
    }

    // Sort by similarity score (highest first)
    duplicates.sort((a, b) => b.similarity_score - a.similarity_score);

    return Response.json({
      has_duplicates: duplicates.length > 0,
      duplicates: duplicates.slice(0, 5), // Return top 5 matches
      checked_against: allResources.length
    });

  } catch (error) {
    console.error('Error detecting duplicates:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}