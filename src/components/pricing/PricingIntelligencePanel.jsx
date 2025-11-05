import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  DollarSign,
  Target,
  BarChart3,
  Lightbulb
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function PricingIntelligencePanel({ 
  yourPrice, 
  estimatedCompetitorPricing, 
  industryBenchmarks,
  aiRecommendations,
  riskFactors 
}) {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate competitive position
  const calculatePosition = () => {
    if (!estimatedCompetitorPricing) return null;
    
    const { low, mid, high } = estimatedCompetitorPricing;
    const position = yourPrice;
    
    if (position < low) {
      return { 
        label: "Aggressive (Below Market)", 
        color: "text-green-600",
        bgColor: "bg-green-50",
        icon: TrendingDown,
        risk: "high",
        message: "Your price is below all competitors. Risk of leaving money on table or appearing non-credible."
      };
    } else if (position <= mid) {
      return { 
        label: "Competitive (Sweet Spot)", 
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        icon: Target,
        risk: "low",
        message: "Your price is in the competitive range. Good balance of competitiveness and value capture."
      };
    } else if (position <= high) {
      return { 
        label: "Premium Pricing", 
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        icon: TrendingUp,
        risk: "medium",
        message: "Your price is above mid-range. Ensure strong value proposition and differentiation."
      };
    } else {
      return { 
        label: "High Risk (Above Market)", 
        color: "text-red-600",
        bgColor: "bg-red-50",
        icon: AlertTriangle,
        risk: "critical",
        message: "Your price is above all competitors. High risk of price-based elimination."
      };
    }
  };

  const position = calculatePosition();

  // Calculate price vs benchmark variance
  const calculateBenchmarkVariance = () => {
    if (!industryBenchmarks?.average) return null;
    
    const variance = ((yourPrice - industryBenchmarks.average) / industryBenchmarks.average) * 100;
    return variance;
  };

  const benchmarkVariance = calculateBenchmarkVariance();

  return (
    <div className="space-y-6">
      {/* Competitive Position Card */}
      {position && (
        <Card className={`border-2 ${position.bgColor}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <position.icon className={`w-6 h-6 ${position.color}`} />
                <div>
                  <CardTitle className={position.color}>{position.label}</CardTitle>
                  <CardDescription>{position.message}</CardDescription>
                </div>
              </div>
              <Badge 
                className={
                  position.risk === "low" ? "bg-green-600" :
                  position.risk === "medium" ? "bg-amber-600" :
                  position.risk === "high" ? "bg-orange-600" :
                  "bg-red-600"
                }
              >
                {position.risk.toUpperCase()} RISK
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Price Positioning Visual */}
      {estimatedCompetitorPricing && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Market Price Positioning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Visual price range */}
              <div className="relative h-24 bg-gradient-to-r from-green-100 via-blue-100 to-red-100 rounded-lg p-4">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-green-700 font-semibold">Low</span>
                  <span className="text-blue-700 font-semibold">Competitive</span>
                  <span className="text-red-700 font-semibold">High</span>
                </div>
                
                {/* Competitor range markers */}
                <div className="relative h-8">
                  <div 
                    className="absolute w-1 h-8 bg-green-600"
                    style={{ 
                      left: `${((estimatedCompetitorPricing.low - estimatedCompetitorPricing.low) / 
                        (estimatedCompetitorPricing.high - estimatedCompetitorPricing.low)) * 100}%` 
                    }}
                  >
                    <span className="absolute -top-6 -left-6 text-xs text-green-700 font-semibold whitespace-nowrap">
                      ${estimatedCompetitorPricing.low.toLocaleString()}
                    </span>
                  </div>
                  
                  <div 
                    className="absolute w-1 h-8 bg-blue-600"
                    style={{ 
                      left: `${((estimatedCompetitorPricing.mid - estimatedCompetitorPricing.low) / 
                        (estimatedCompetitorPricing.high - estimatedCompetitorPricing.low)) * 100}%` 
                    }}
                  >
                    <span className="absolute -top-6 -left-6 text-xs text-blue-700 font-semibold whitespace-nowrap">
                      ${estimatedCompetitorPricing.mid.toLocaleString()}
                    </span>
                  </div>
                  
                  <div 
                    className="absolute w-1 h-8 bg-red-600"
                    style={{ 
                      left: `${((estimatedCompetitorPricing.high - estimatedCompetitorPricing.low) / 
                        (estimatedCompetitorPricing.high - estimatedCompetitorPricing.low)) * 100}%` 
                    }}
                  >
                    <span className="absolute -top-6 -left-6 text-xs text-red-700 font-semibold whitespace-nowrap">
                      ${estimatedCompetitorPricing.high.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Your price marker */}
                  <div 
                    className="absolute w-3 h-12 -top-2 bg-purple-600 rounded"
                    style={{ 
                      left: `${Math.max(0, Math.min(100, 
                        ((yourPrice - estimatedCompetitorPricing.low) / 
                        (estimatedCompetitorPricing.high - estimatedCompetitorPricing.low)) * 100
                      ))}%`,
                      marginLeft: '-6px'
                    }}
                  >
                    <span className="absolute -bottom-8 -left-6 text-sm text-purple-700 font-bold whitespace-nowrap">
                      You: ${yourPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price differential stats */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center">
                  <p className="text-xs text-slate-600">vs Low Bidder</p>
                  <p className={`text-lg font-bold ${
                    yourPrice > estimatedCompetitorPricing.low ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {yourPrice > estimatedCompetitorPricing.low ? '+' : ''}
                    {(((yourPrice - estimatedCompetitorPricing.low) / estimatedCompetitorPricing.low) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-600">vs Mid-Range</p>
                  <p className={`text-lg font-bold ${
                    yourPrice > estimatedCompetitorPricing.mid ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {yourPrice > estimatedCompetitorPricing.mid ? '+' : ''}
                    {(((yourPrice - estimatedCompetitorPricing.mid) / estimatedCompetitorPricing.mid) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-600">vs High Bidder</p>
                  <p className={`text-lg font-bold ${
                    yourPrice > estimatedCompetitorPricing.high ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {yourPrice > estimatedCompetitorPricing.high ? '+' : ''}
                    {(((yourPrice - estimatedCompetitorPricing.high) / estimatedCompetitorPricing.high) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Industry Benchmarks */}
      {industryBenchmarks && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Industry Benchmarks
            </CardTitle>
            <CardDescription>
              Based on {industryBenchmarks.sampleSize || 'aggregated'} similar contracts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Industry Average</span>
                <span className="font-semibold text-slate-900">
                  ${industryBenchmarks.average?.toLocaleString()}
                </span>
              </div>
              
              {benchmarkVariance !== null && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Your Variance</span>
                    <span className={`font-bold ${
                      Math.abs(benchmarkVariance) < 10 ? 'text-green-600' :
                      Math.abs(benchmarkVariance) < 20 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {benchmarkVariance > 0 ? '+' : ''}{benchmarkVariance.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, Math.abs(benchmarkVariance))} 
                    className={
                      Math.abs(benchmarkVariance) < 10 ? 'bg-green-200' :
                      Math.abs(benchmarkVariance) < 20 ? 'bg-amber-200' :
                      'bg-red-200'
                    }
                  />
                </div>
              )}

              {industryBenchmarks.feeRange && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-slate-600 mb-2">Typical Fee Range</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {industryBenchmarks.feeRange.min}% - {industryBenchmarks.feeRange.max}%
                    </span>
                    <Badge variant="outline">
                      Avg: {industryBenchmarks.feeRange.average}%
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      {aiRecommendations && aiRecommendations.length > 0 && (
        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-purple-600" />
              AI Pricing Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiRecommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{rec.recommendation}</p>
                    {rec.expectedImpact && (
                      <p className="text-xs text-slate-500 mt-1">
                        Expected impact: {rec.expectedImpact}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors */}
      {riskFactors && riskFactors.length > 0 && (
        <Card className="border-none shadow-lg border-2 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-5 h-5" />
              Pricing Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {riskFactors.map((risk, idx) => (
                <Alert key={idx} className="bg-amber-50 border-amber-300">
                  <AlertDescription className="text-sm text-amber-900">
                    <span className="font-semibold">{risk.factor}:</span> {risk.description}
                    {risk.mitigation && (
                      <p className="text-xs mt-1 text-amber-700">
                        <strong>Mitigation:</strong> {risk.mitigation}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis Toggle */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => setShowDetails(!showDetails)}
          className="gap-2"
        >
          <Info className="w-4 h-4" />
          {showDetails ? 'Hide' : 'Show'} Detailed Analysis
        </Button>
      </div>

      {/* Detailed breakdown (collapsible) */}
      {showDetails && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Detailed Pricing Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Pricing Strategy Considerations:</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  <li>Your price positioning suggests {position?.label.toLowerCase()} strategy</li>
                  <li>Consider evaluator perception at this price point</li>
                  <li>Balance between competitiveness and margin protection</li>
                  <li>Assess technical strength vs price sensitivity trade-off</li>
                </ul>
              </div>

              {estimatedCompetitorPricing && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Competitive Landscape:</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li>Estimated {
                      yourPrice < estimatedCompetitorPricing.low ? '0' :
                      yourPrice < estimatedCompetitorPricing.mid ? '1-2' :
                      yourPrice < estimatedCompetitorPricing.high ? '3-4' :
                      '5+'
                    } competitors likely to price below you</li>
                    <li>Price spread in market: ${(estimatedCompetitorPricing.high - estimatedCompetitorPricing.low).toLocaleString()}</li>
                    <li>Your position in competitive range: {
                      (((yourPrice - estimatedCompetitorPricing.low) / 
                        (estimatedCompetitorPricing.high - estimatedCompetitorPricing.low)) * 100).toFixed(0)
                    }th percentile</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}