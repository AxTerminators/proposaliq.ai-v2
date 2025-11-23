import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FEATURE_FLAGS, 
  FEATURE_CATEGORIES, 
  FEATURE_TO_CATEGORY,
  FEATURE_DESCRIPTIONS,
  getEnabledFeatures,
  getDisabledFeatures 
} from "@/components/utils/featureFlags";
import { Search, CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FeatureManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Group features by category
  const featuresByCategory = Object.entries(FEATURE_FLAGS).reduce((acc, [feature, enabled]) => {
    const category = FEATURE_TO_CATEGORY[feature] || 'ADVANCED';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ name: feature, enabled });
    return acc;
  }, {});

  // Filter features based on search and category
  const filteredFeatures = Object.entries(featuresByCategory).reduce((acc, [category, features]) => {
    if (selectedCategory !== 'ALL' && category !== selectedCategory) return acc;
    
    const filtered = features.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      FEATURE_DESCRIPTIONS[f.name]?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    
    return acc;
  }, {});

  const enabledCount = getEnabledFeatures().length;
  const disabledCount = getDisabledFeatures().length;
  const totalCount = Object.keys(FEATURE_FLAGS).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🚀</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Feature Management</h1>
              <p className="text-slate-600">Control which features are available in the application</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Enabled Features</p>
                  <p className="text-2xl font-bold text-slate-900">{enabledCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Disabled Features</p>
                  <p className="text-2xl font-bold text-slate-900">{disabledCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Info className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Features</p>
                  <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Read-Only Feature Flags</p>
              <p className="text-sm text-amber-700 mt-1">
                This page displays the current feature flag configuration. To modify feature flags, 
                update the <code className="bg-amber-100 px-1 rounded">featureFlags.js</code> file 
                in the codebase. Feature flags are currently compile-time only for security and performance.
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search features..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('ALL')}
                >
                  All Categories
                </Button>
                {Object.entries(FEATURE_CATEGORIES).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features by Category */}
        <div className="space-y-6">
          {Object.entries(filteredFeatures).map(([category, features]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {FEATURE_CATEGORIES[category] || category}
                  <Badge variant="secondary">{features.length}</Badge>
                </CardTitle>
                <CardDescription>
                  {category === 'CORE' && 'Essential features that are always available'}
                  {category === 'COLLABORATION' && 'Features for team collaboration and communication'}
                  {category === 'ANALYTICS' && 'Reporting and analytics capabilities'}
                  {category === 'AUTOMATION' && 'AI-powered automation and workflow features'}
                  {category === 'INTEGRATIONS' && 'External integrations and API access'}
                  {category === 'CLIENT_PORTAL' && 'Client-facing portal features'}
                  {category === 'ADVANCED' && 'Advanced features for power users'}
                  {category === 'ADMIN' && 'Administrative and system management features'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {features.map(({ name, enabled }) => (
                    <div
                      key={name}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-lg border-2 transition-colors",
                        enabled 
                          ? "bg-green-50 border-green-200" 
                          : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {enabled ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900">
                            {name.replace(/_/g, ' ')}
                          </h4>
                          <Badge 
                            className={cn(
                              "text-xs",
                              enabled 
                                ? "bg-green-600 text-white" 
                                : "bg-slate-400 text-white"
                            )}
                          >
                            {enabled ? 'ENABLED' : 'DISABLED'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          {FEATURE_DESCRIPTIONS[name] || 'No description available'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {Object.keys(filteredFeatures).length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <Search className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No features found</h3>
              <p className="text-slate-600">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}