import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ExternalLink, CheckCircle2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Component that checks for duplicate Teaming Partners based on UEI and company name
 * Shows warnings and allows user to navigate to existing records
 */
export default function DuplicateChecker({ 
  organizationId, 
  uei, 
  companyName, 
  currentPartnerId = null, // When editing, exclude current record from duplicates
  onDuplicateFound 
}) {
  const [duplicates, setDuplicates] = useState({
    uei: null,
    name: []
  });
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const checkForDuplicates = async () => {
      if (!organizationId) return;

      // Skip check if both fields are empty
      if (!uei?.trim() && !companyName?.trim()) {
        setDuplicates({ uei: null, name: [] });
        if (onDuplicateFound) {
          onDuplicateFound({ hasUEIDuplicate: false, hasNameDuplicate: false });
        }
        return;
      }

      setChecking(true);

      try {
        // Check UEI duplicates (exact match)
        let ueiDuplicate = null;
        if (uei?.trim()) {
          const ueiMatches = await base44.entities.TeamingPartner.filter({
            organization_id: organizationId,
            uei: uei.trim()
          });
          
          // Exclude current record if editing
          const filteredUEI = ueiMatches.filter(p => p.id !== currentPartnerId);
          ueiDuplicate = filteredUEI.length > 0 ? filteredUEI[0] : null;
        }

        // Check name duplicates (fuzzy matching)
        let nameDuplicates = [];
        if (companyName?.trim()) {
          const allPartners = await base44.entities.TeamingPartner.filter({
            organization_id: organizationId
          });

          // Exclude current record if editing
          const partnersToCheck = allPartners.filter(p => p.id !== currentPartnerId);

          // Simple fuzzy matching: check for similar names
          nameDuplicates = partnersToCheck.filter(partner => {
            if (!partner.partner_name) return false;
            
            const inputName = companyName.toLowerCase().trim();
            const existingName = partner.partner_name.toLowerCase().trim();
            
            // Exact match
            if (inputName === existingName) return true;
            
            // Check if one contains the other
            if (inputName.includes(existingName) || existingName.includes(inputName)) {
              return true;
            }
            
            // Remove common corporate suffixes for comparison
            const cleanInput = inputName
              .replace(/\b(inc|llc|corp|corporation|ltd|limited|co)\b\.?/g, '')
              .replace(/[,.-]/g, '')
              .trim();
            const cleanExisting = existingName
              .replace(/\b(inc|llc|corp|corporation|ltd|limited|co)\b\.?/g, '')
              .replace(/[,.-]/g, '')
              .trim();
            
            if (cleanInput === cleanExisting) return true;
            
            // Calculate simple similarity (Levenshtein-like)
            const similarity = calculateSimilarity(cleanInput, cleanExisting);
            return similarity > 0.8; // 80% similarity threshold
          });
        }

        setDuplicates({ uei: ueiDuplicate, name: nameDuplicates });

        // Notify parent component
        if (onDuplicateFound) {
          onDuplicateFound({
            hasUEIDuplicate: !!ueiDuplicate,
            hasNameDuplicate: nameDuplicates.length > 0,
            duplicates: {
              uei: ueiDuplicate,
              name: nameDuplicates
            }
          });
        }

      } catch (error) {
        console.error("[DuplicateChecker] Error checking duplicates:", error);
      } finally {
        setChecking(false);
      }
    };

    // Debounce the check to avoid too many API calls
    const timer = setTimeout(checkForDuplicates, 500);
    return () => clearTimeout(timer);
  }, [organizationId, uei, companyName, currentPartnerId, onDuplicateFound]);

  // Simple similarity calculation (Dice coefficient)
  const calculateSimilarity = (str1, str2) => {
    if (str1 === str2) return 1;
    if (str1.length < 2 || str2.length < 2) return 0;

    const bigrams1 = new Set();
    for (let i = 0; i < str1.length - 1; i++) {
      bigrams1.add(str1.substring(i, i + 2));
    }

    const bigrams2 = new Set();
    for (let i = 0; i < str2.length - 1; i++) {
      bigrams2.add(str2.substring(i, i + 2));
    }

    const intersection = new Set([...bigrams1].filter(x => bigrams2.has(x)));
    return (2.0 * intersection.size) / (bigrams1.size + bigrams2.size);
  };

  // Don't show anything if no duplicates found
  if (!duplicates.uei && duplicates.name.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* UEI Duplicate Alert - CRITICAL */}
      {duplicates.uei && (
        <Alert className="border-2 border-red-500 bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="ml-2">
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-red-900 text-base mb-1">
                  ⚠️ Duplicate UEI Detected!
                </p>
                <p className="text-red-800 text-sm">
                  A partner with UEI <strong className="font-mono">{uei}</strong> already exists:
                </p>
              </div>

              <div className="bg-white border border-red-300 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{duplicates.uei.partner_name}</p>
                    <div className="flex gap-2 mt-1">
                      {duplicates.uei.partner_type && (
                        <Badge variant="outline" className="text-xs">
                          {duplicates.uei.partner_type.replace('_', ' ')}
                        </Badge>
                      )}
                      {duplicates.uei.certifications?.slice(0, 2).map((cert, idx) => (
                        <Badge key={idx} className="bg-blue-600 text-white text-xs">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      window.location.href = `${createPageUrl("AddTeamingPartner")}?mode=edit&id=${duplicates.uei.id}`;
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Edit Existing
                  </Button>
                </div>
              </div>

              <p className="text-xs text-red-700">
                💡 <strong>Recommendation:</strong> Each company should have only ONE profile. 
                Please edit the existing profile instead of creating a duplicate.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Name Similarity Warning - SOFT WARNING */}
      {!duplicates.uei && duplicates.name.length > 0 && (
        <Alert className="border-2 border-amber-500 bg-amber-50">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="ml-2">
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-amber-900 text-base mb-1">
                  ⚠️ Similar Company Name{duplicates.name.length > 1 ? 's' : ''} Found
                </p>
                <p className="text-amber-800 text-sm">
                  {duplicates.name.length} existing partner{duplicates.name.length > 1 ? 's' : ''} with similar name{duplicates.name.length > 1 ? 's' : ''}:
                </p>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {duplicates.name.map((partner, idx) => (
                  <div key={idx} className="bg-white border border-amber-300 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{partner.partner_name}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {partner.uei && (
                            <Badge variant="outline" className="text-xs font-mono">
                              UEI: {partner.uei}
                            </Badge>
                          )}
                          {partner.cage_code && (
                            <Badge variant="outline" className="text-xs font-mono">
                              CAGE: {partner.cage_code}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          window.location.href = `${createPageUrl("AddTeamingPartner")}?mode=edit&id=${partner.id}`;
                        }}
                        className="ml-2 flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-amber-700">
                💡 These companies have similar names. If this is the same company, please edit the existing profile to avoid duplicates.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}