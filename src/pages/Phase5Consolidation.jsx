import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Database, ArrowRight, CheckCircle2, Info } from "lucide-react";

const CONSOLIDATION_PLAN = [
  {
    id: 1,
    name: "Activity & Audit Logs Consolidation",
    status: "planned",
    description: "Merge ActivityLog and AuditLog into unified SystemLog entity",
    impact: "Low - minimal usage",
    entities: ["ActivityLog", "AuditLog"],
    targetEntity: "SystemLog",
    benefits: [
      "Single unified event tracking system",
      "Consistent schema for all system activities",
      "Easier querying across all events",
      "Reduced entity count by 1"
    ],
    migration: {
      newFields: [
        "log_type: 'activity' | 'audit' | 'system'",
        "entity_type: string (what was affected)",
        "entity_id: string (ID of affected entity)",
        "actor_email: string (who performed action)",
        "actor_role: string (role at time of action)",
        "action_type: string (standardized action)",
        "action_description: string",
        "metadata: object (additional data)",
        "ip_address: string (for security tracking)",
        "success: boolean"
      ],
      dataMapping: [
        "ActivityLog.user_email → SystemLog.actor_email",
        "ActivityLog.action_type → SystemLog.action_type",
        "AuditLog.admin_email → SystemLog.actor_email",
        "AuditLog.target_entity → SystemLog.entity_id"
      ]
    }
  },
  {
    id: 2,
    name: "AdminData into ProposalResource",
    status: "planned",
    description: "Merge AdminData into ProposalResource as new resource_type options",
    impact: "Low - AdminData rarely used",
    entities: ["AdminData"],
    targetEntity: "ProposalResource",
    benefits: [
      "Single content library for all resources",
      "Unified folder hierarchy",
      "Consistent search and filtering",
      "Reduced entity count by 1",
      "Better integration with content library UI"
    ],
    migration: {
      newResourceTypes: [
        "far_regulation",
        "dfars_regulation",
        "training_material",
        "admin_template",
        "guideline"
      ],
      dataMapping: [
        "AdminData.data_type → ProposalResource.resource_type",
        "AdminData.title → ProposalResource.title",
        "AdminData.content → ProposalResource.boilerplate_content",
        "AdminData.folder_id → ProposalResource.folder_id",
        "AdminData.is_public → ProposalResource metadata",
        "AdminData.is_proprietary → ProposalResource.tags (add 'proprietary')"
      ],
      notes: "Set organization_id to null for system-wide resources"
    }
  },
  {
    id: 3,
    name: "Pricing Entities Analysis",
    status: "analysis",
    description: "Evaluate consolidation of pricing-related entities",
    impact: "High - active feature with complex relationships",
    entities: [
      "LaborCategory",
      "CLIN", 
      "LaborAllocation",
      "ODCItem",
      "PricingStrategy",
      "PricingTemplate",
      "SubcontractorPricing",
      "CostEstimate",
      "PricingBenchmark"
    ],
    targetEntity: "To be determined",
    benefits: [
      "Would simplify pricing model",
      "Reduce query complexity"
    ],
    concerns: [
      "⚠️ High usage in production",
      "⚠️ Complex relationships between entities",
      "⚠️ Active feature development",
      "⚠️ Risk of breaking existing pricing functionality"
    ],
    recommendation: "DEFER - Keep separate until pricing module stabilizes"
  },
  {
    id: 4,
    name: "Notification/Message Cleanup",
    status: "analysis", 
    description: "Evaluate consolidation opportunities for notification entities",
    impact: "Medium",
    entities: [
      "Notification",
      "EmailTemplate",
      "ClientNotification"
    ],
    recommendation: "DEFER - Different use cases, keep separate"
  }
];

export default function Phase5Consolidation() {
  const plannedCount = CONSOLIDATION_PLAN.filter(p => p.status === "planned").length;
  const analysisCount = CONSOLIDATION_PLAN.filter(p => p.status === "analysis").length;
  const entitiesBeforeCount = CONSOLIDATION_PLAN.reduce((sum, plan) => sum + plan.entities.length, 0);
  const entitiesSavedCount = CONSOLIDATION_PLAN
    .filter(p => p.status === "planned")
    .reduce((sum, plan) => sum + (plan.entities.length - 1), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Phase 5: Entity Consolidation</h1>
              <p className="text-slate-600">Merge similar entities to reduce complexity</p>
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
                  <p className="text-sm text-slate-600">Ready to Consolidate</p>
                  <p className="text-2xl font-bold text-slate-900">{plannedCount}</p>
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
                  <p className="text-sm text-slate-600">Under Analysis</p>
                  <p className="text-2xl font-bold text-slate-900">{analysisCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Database className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Entities to Save</p>
                  <p className="text-2xl font-bold text-slate-900">{entitiesSavedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Conservative Approach</p>
              <p className="text-sm text-amber-700 mt-1">
                Only consolidating low-risk entities with minimal production usage. 
                High-impact entities (pricing, notifications) are deferred to avoid breaking changes.
              </p>
            </div>
          </div>
        </div>

        {/* Consolidation Plans */}
        <div className="space-y-6">
          {CONSOLIDATION_PLAN.map((plan) => (
            <Card key={plan.id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      {plan.name}
                      <Badge className={
                        plan.status === "planned" ? "bg-green-600 text-white" :
                        plan.status === "analysis" ? "bg-blue-600 text-white" :
                        "bg-slate-400 text-white"
                      }>
                        {plan.status.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Impact: {plan.impact}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Entity Flow */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Consolidation Flow:</h4>
                  <div className="flex items-center gap-3 flex-wrap">
                    {plan.entities.map((entity, idx) => (
                      <React.Fragment key={entity}>
                        <Badge className="bg-red-100 text-red-700 px-3 py-1">
                          {entity}
                        </Badge>
                        {idx < plan.entities.length - 1 && (
                          <span className="text-slate-400">+</span>
                        )}
                      </React.Fragment>
                    ))}
                    <ArrowRight className="w-5 h-5 text-blue-600 mx-2" />
                    <Badge className="bg-green-100 text-green-700 px-3 py-1.5 text-base">
                      {plan.targetEntity}
                    </Badge>
                  </div>
                </div>

                {/* Benefits */}
                {plan.benefits && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Benefits:</h4>
                    <ul className="space-y-1">
                      {plan.benefits.map((benefit, idx) => (
                        <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Concerns */}
                {plan.concerns && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Concerns:</h4>
                    <ul className="space-y-1">
                      {plan.concerns.map((concern, idx) => (
                        <li key={idx} className="text-sm text-amber-700 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <span>{concern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Migration Details */}
                {plan.migration && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Migration Details:</h4>
                    
                    {plan.migration.newFields && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-slate-600 mb-2">New Schema Fields:</p>
                        <ul className="space-y-1">
                          {plan.migration.newFields.map((field, idx) => (
                            <li key={idx} className="text-xs font-mono text-slate-700 pl-4">
                              • {field}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {plan.migration.newResourceTypes && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-slate-600 mb-2">New Resource Types:</p>
                        <ul className="space-y-1">
                          {plan.migration.newResourceTypes.map((type, idx) => (
                            <li key={idx} className="text-xs font-mono text-slate-700 pl-4">
                              • {type}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {plan.migration.dataMapping && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-slate-600 mb-2">Data Mapping:</p>
                        <ul className="space-y-1">
                          {plan.migration.dataMapping.map((mapping, idx) => (
                            <li key={idx} className="text-xs font-mono text-blue-700 pl-4">
                              {mapping}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {plan.migration.notes && (
                      <div className="text-xs text-slate-600 italic mt-2">
                        Note: {plan.migration.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Recommendation */}
                {plan.recommendation && (
                  <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900">
                      📋 Recommendation: {plan.recommendation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card className="mt-8 bg-green-50 border-2 border-green-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-green-900 mb-2">Phase 5 Summary</h3>
            <p className="text-sm text-green-800 mb-3">
              Conservative consolidation approach targeting {entitiesSavedCount} entity reductions 
              while deferring high-risk pricing entities until module stabilization.
            </p>
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ready to implement: ActivityLog + AuditLog → SystemLog</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-700 mt-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ready to implement: AdminData → ProposalResource</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}