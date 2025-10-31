import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * A/B Testing System for AI Prompts
 * Test different prompt variations to optimize AI output quality
 */

const PROMPT_VARIANTS = {
  section_generation: {
    v1_baseline: {
      name: 'Baseline (Current)',
      description: 'Standard prompt with all context',
      weight: 50, // 50% traffic
      getPrompt: (context) => `You are an expert proposal writer...${context.sectionName}...`
    },
    v2_structured: {
      name: 'Structured with Examples',
      description: 'Includes example outputs and clear structure',
      weight: 25,
      getPrompt: (context) => `You are an expert proposal writer.

**EXAMPLE OUTPUT STRUCTURE:**
<h2>Section Title</h2>
<p>Opening paragraph that directly addresses the requirement...</p>
<h3>Subsection</h3>
<ul>
  <li>Bullet point with specific detail</li>
  <li>Another concrete example</li>
</ul>

Now write the "${context.sectionName}" section...`
    },
    v3_conversational: {
      name: 'Conversational Tone',
      description: 'More engaging, human-like writing',
      weight: 25,
      getPrompt: (context) => `You're working with a proposal team to write compelling content.

The client is ${context.agency} and they care about ${context.requirements}.

Write the "${context.sectionName}" section in a way that:
- Speaks directly to the evaluator
- Uses active voice and concrete examples
- Tells a story of success...`
    }
  },
  
  evaluation: {
    v1_baseline: {
      name: 'Standard Evaluation',
      description: 'Current evaluation criteria',
      weight: 70,
      getPrompt: (context) => `Evaluate this proposal section against the requirements...`
    },
    v2_detailed: {
      name: 'Detailed Scoring',
      description: 'More granular scoring with explanations',
      weight: 30,
      getPrompt: (context) => `You are a government contract evaluator. Score this section on:
1. Technical Soundness (0-10)
2. Requirement Compliance (0-10)  
3. Writing Clarity (0-10)
4. Persuasiveness (0-10)

For each score, provide specific justification...`
    }
  }
};

class PromptExperimentService {
  constructor() {
    this.userAssignments = new Map(); // user -> variant assignments
    this.results = [];
  }

  // Assign user to a variant based on weights
  assignVariant(userId, experimentType) {
    // Check if user already assigned
    const cacheKey = `${experimentType}_${userId}`;
    if (this.userAssignments.has(cacheKey)) {
      return this.userAssignments.get(cacheKey);
    }

    const variants = PROMPT_VARIANTS[experimentType];
    if (!variants) return null;

    // Weighted random selection
    const totalWeight = Object.values(variants).reduce((sum, v) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;

    for (const [key, variant] of Object.entries(variants)) {
      random -= variant.weight;
      if (random <= 0) {
        this.userAssignments.set(cacheKey, key);
        return key;
      }
    }

    // Fallback to first variant
    const firstKey = Object.keys(variants)[0];
    this.userAssignments.set(cacheKey, firstKey);
    return firstKey;
  }

  // Get the prompt for a user
  getPromptForUser(userId, experimentType, context) {
    const variantKey = this.assignVariant(userId, experimentType);
    const variant = PROMPT_VARIANTS[experimentType]?.[variantKey];
    
    if (!variant) {
      console.warn(`No variant found for ${experimentType}:${variantKey}`);
      return null;
    }

    return {
      prompt: variant.getPrompt(context),
      variantKey,
      variantName: variant.name
    };
  }

  // Record experiment result
  async recordResult(experimentData) {
    try {
      const {
        userId,
        experimentType,
        variantKey,
        success,
        metrics, // e.g., { wordCount, timeToGenerate, userRating, wasEdited }
        context
      } = experimentData;

      await base44.entities.ActivityLog.create({
        user_email: userId,
        action_type: 'prompt_experiment_result',
        action_description: `Experiment: ${experimentType}, Variant: ${variantKey}`,
        metadata: {
          experiment_type: experimentType,
          variant_key: variantKey,
          success,
          metrics,
          context,
          timestamp: new Date().toISOString()
        }
      });

      this.results.push(experimentData);
    } catch (error) {
      console.error('Failed to record experiment result:', error);
    }
  }

  // Get experiment results
  async getExperimentResults(experimentType, startDate, endDate) {
    try {
      const logs = await base44.entities.ActivityLog.filter({
        action_type: 'prompt_experiment_result',
        created_date: {
          $gte: startDate,
          $lte: endDate
        }
      });

      const results = {};
      
      logs.forEach(log => {
        try {
          const metadata = typeof log.metadata === 'string' 
            ? JSON.parse(log.metadata) 
            : log.metadata;
          
          if (metadata.experiment_type !== experimentType) return;

          const variantKey = metadata.variant_key;
          if (!results[variantKey]) {
            results[variantKey] = {
              variant_name: PROMPT_VARIANTS[experimentType]?.[variantKey]?.name,
              total_runs: 0,
              success_count: 0,
              metrics: {
                avg_word_count: 0,
                avg_time: 0,
                avg_rating: 0,
                edit_rate: 0
              }
            };
          }

          results[variantKey].total_runs++;
          if (metadata.success) {
            results[variantKey].success_count++;
          }

          // Aggregate metrics
          if (metadata.metrics) {
            const current = results[variantKey].metrics;
            const n = results[variantKey].total_runs;
            
            if (metadata.metrics.wordCount) {
              current.avg_word_count = ((current.avg_word_count * (n - 1)) + metadata.metrics.wordCount) / n;
            }
            if (metadata.metrics.timeToGenerate) {
              current.avg_time = ((current.avg_time * (n - 1)) + metadata.metrics.timeToGenerate) / n;
            }
            if (metadata.metrics.userRating) {
              current.avg_rating = ((current.avg_rating * (n - 1)) + metadata.metrics.userRating) / n;
            }
            if (metadata.metrics.wasEdited !== undefined) {
              current.edit_rate = ((current.edit_rate * (n - 1)) + (metadata.metrics.wasEdited ? 1 : 0)) / n;
            }
          }
        } catch (e) {
          console.error('Error parsing experiment result:', e);
        }
      });

      return results;
    } catch (error) {
      console.error('Failed to get experiment results:', error);
      return {};
    }
  }

  // Calculate statistical significance
  calculateSignificance(variantA, variantB) {
    // Simple chi-square test for success rate
    const n1 = variantA.total_runs;
    const n2 = variantB.total_runs;
    const s1 = variantA.success_count;
    const s2 = variantB.success_count;

    if (n1 === 0 || n2 === 0) return null;

    const p1 = s1 / n1;
    const p2 = s2 / n2;
    const pPool = (s1 + s2) / (n1 + n2);

    const se = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2));
    const zScore = Math.abs(p1 - p2) / se;

    // p-value approximation (two-tailed)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

    return {
      z_score: zScore,
      p_value: pValue,
      is_significant: pValue < 0.05, // 95% confidence
      relative_improvement: ((p1 - p2) / p2) * 100
    };
  }

  // Helper: Normal CDF approximation
  normalCDF(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }
}

// Singleton instance
export const promptExperiments = new PromptExperimentService();

// React Hook for experiments
export function usePromptExperiment(userId, experimentType) {
  const [variant, setVariant] = useState(null);

  useEffect(() => {
    if (userId && experimentType) {
      const variantKey = promptExperiments.assignVariant(userId, experimentType);
      setVariant(variantKey);
    }
  }, [userId, experimentType]);

  const getPrompt = (context) => {
    return promptExperiments.getPromptForUser(userId, experimentType, context);
  };

  const recordResult = async (success, metrics, context) => {
    await promptExperiments.recordResult({
      userId,
      experimentType,
      variantKey: variant,
      success,
      metrics,
      context
    });
  };

  return { variant, getPrompt, recordResult };
}

export { PROMPT_VARIANTS };
export default promptExperiments;