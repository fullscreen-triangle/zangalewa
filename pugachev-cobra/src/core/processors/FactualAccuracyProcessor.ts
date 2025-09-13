/**
 * FactualAccuracyProcessor
 * 
 * Specialized processor for factual accuracy and overconfidence detection.
 * Critical for professional communication contexts.
 */

import { ValidationTask, ProblemContext, SystematicBias, TaskResult } from '../../types/ValidationTypes';
import { TerminationCriteria } from '../TerminationCriteria';

export class FactualAccuracyProcessor {

    async process(
        task: ValidationTask,
        content: string,
        systematicBias: SystematicBias,
        context: ProblemContext,
        terminationCriteria: TerminationCriteria
    ): Promise<TaskResult> {
        const startTime = Date.now();
        const issues: any[] = [];
        let adequacyContribution = 0.7;
        let confidence = 0.8;

        try {
            // Detect overconfidence patterns
            const overconfidenceIssues = this.detectOverconfidence(content);
            issues.push(...overconfidenceIssues);

            // Check factual claims
            const factualIssues = this.analyzeFactualClaims(content);
            issues.push(...factualIssues);

            // Verify claims substantiation
            const substantiationIssues = this.checkClaimsSubstantiation(content);
            issues.push(...substantiationIssues);

            // Check for unverifiable statements
            const verifiabilityIssues = this.checkVerifiability(content);
            issues.push(...verifiabilityIssues);

            // Adjust adequacy based on findings
            if (issues.filter(i => i.severity === 'error').length > 0) {
                adequacyContribution = 0.3;
                confidence = 0.6;
            } else if (issues.filter(i => i.severity === 'warning').length > 2) {
                adequacyContribution = 0.5;
                confidence = 0.7;
            }

            // Apply systematic bias adjustments for professional contexts
            if (context.type === 'Professional Communication') {
                adequacyContribution *= 1.1; // Higher weight for professional contexts
                confidence = Math.min(confidence * 1.1, 1.0);
            }

            const processingTime = Date.now() - startTime;

            return {
                taskId: task.id,
                success: true,
                adequacyContribution: Math.min(adequacyContribution, 1.0),
                importanceWeight: task.importance,
                processingTimeMs: processingTime,
                issues,
                confidence,
                metadata: {
                    terminationReason: 'factual_analysis_completed',
                    processingSteps: this.calculateProcessingSteps(content, issues.length),
                    resourcesUsed: {
                        patternMatches: this.countPatternMatches(content),
                        claimsAnalyzed: this.countClaims(content)
                    }
                }
            };

        } catch (error) {
            return this.createErrorResult(task, startTime, error);
        }
    }

    /**
     * Detects overconfidence patterns in text
     */
    private detectOverconfidence(content: string): any[] {
        const issues: any[] = [];

        // High-confidence language without evidence
        const overconfidentPatterns = [
            {
                pattern: /\b(definitely|certainly|obviously|clearly|undoubtedly|without question|unquestionably)\b/gi,
                message: 'Overconfident language detected - consider moderating certainty',
                severity: 'warning' as const
            },
            {
                pattern: /\b(always|never|all|every|none|completely|totally|absolutely)\b/gi,
                message: 'Absolute statements detected - consider if exceptions might exist',
                severity: 'warning' as const
            },
            {
                pattern: /\b(proves|proof|proven|demonstrates conclusively|establishes beyond doubt)\b/gi,
                message: 'Very strong evidential claims - ensure adequate support',
                severity: 'warning' as const
            }
        ];

        for (const { pattern, message, severity } of overconfidentPatterns) {
            const matches = content.match(pattern);
            if (matches && matches.length > 0) {
                const uniqueMatches = [...new Set(matches.map(m => m.toLowerCase()))];
                
                if (uniqueMatches.length > 2) {
                    issues.push({
                        message: `${message}. Found: ${uniqueMatches.join(', ')}`,
                        severity,
                        confidence: 0.8,
                        category: 'factual',
                        suggestions: [
                            'Consider using more moderate language',
                            'Add qualifying words like "generally", "typically", "often"',
                            'Ensure claims are fully supported'
                        ]
                    });
                }
            }
        }

        // Detect unsupported superlatives
        const superlativePattern = /\b(best|worst|most|least|greatest|smallest|largest|first|only)\b/gi;
        const superlatives = content.match(superlativePattern);
        if (superlatives && superlatives.length > 3) {
            // Check if supported by evidence
            const evidencePattern = /\b(according to|research shows|data indicates|study found)\b/gi;
            const evidenceCount = (content.match(evidencePattern) || []).length;
            
            if (evidenceCount < superlatives.length / 2) {
                issues.push({
                    message: 'Multiple superlative claims may lack adequate evidence',
                    severity: 'warning',
                    confidence: 0.7,
                    category: 'factual',
                    suggestions: [
                        'Provide evidence for superlative claims',
                        'Consider more moderate comparisons',
                        'Add sources or justification'
                    ]
                });
            }
        }

        return issues;
    }

    /**
     * Analyzes factual claims in the content
     */
    private analyzeFactualClaims(content: string): any[] {
        const issues: any[] = [];

        // Statistical claims
        const statisticalClaims = content.match(/\b\d+(\.\d+)?%|\b\d+\s*(percent|percentage)|\bp\s*[<>=]\s*0?\.\d+/gi);
        if (statisticalClaims && statisticalClaims.length > 0) {
            // Check if sources are provided
            const citationPattern = /\b(source:|according to|cited in|\[[\d,\s-]+\]|et al\.)/gi;
            const citations = content.match(citationPattern);
            
            if (!citations || citations.length < statisticalClaims.length / 2) {
                issues.push({
                    message: 'Statistical claims detected without adequate source citations',
                    severity: 'warning',
                    confidence: 0.8,
                    category: 'factual',
                    suggestions: [
                        'Add sources for statistical claims',
                        'Provide context for statistical data',
                        'Ensure statistics are current and relevant'
                    ]
                });
            }
        }

        // Technical specifications or measurements
        const technicalSpecs = content.match(/\b\d+\s*(GB|MB|KB|GHz|MHz|°C|°F|miles|kilometers|hours|minutes)\b/gi);
        if (technicalSpecs && technicalSpecs.length > 2) {
            issues.push({
                message: 'Technical specifications detected - verify accuracy',
                severity: 'info',
                confidence: 0.6,
                category: 'factual',
                suggestions: [
                    'Double-check technical specifications',
                    'Ensure units are correct',
                    'Verify current standards'
                ]
            });
        }

        return issues;
    }

    /**
     * Checks if claims are properly substantiated
     */
    private checkClaimsSubstantiation(content: string): any[] {
        const issues: any[] = [];

        // Strong causal claims
        const causalClaims = content.match(/\b(causes|results in|leads to|due to|because of|as a result of)\b/gi);
        if (causalClaims && causalClaims.length > 0) {
            // Check for supporting evidence
            const evidenceKeywords = /\b(research|study|data|evidence|analysis|investigation|experiment)\b/gi;
            const evidenceCount = (content.match(evidenceKeywords) || []).length;
            
            if (evidenceCount < causalClaims.length) {
                issues.push({
                    message: 'Causal claims may need stronger evidential support',
                    severity: 'warning',
                    confidence: 0.7,
                    category: 'factual',
                    suggestions: [
                        'Provide evidence for causal relationships',
                        'Consider alternative explanations',
                        'Use more tentative language if evidence is limited'
                    ]
                });
            }
        }

        // Comparative claims without context
        const comparativeClaims = content.match(/\b(better|worse|more|less|superior|inferior|faster|slower)\s+than\b/gi);
        if (comparativeClaims && comparativeClaims.length > 1) {
            // Check if comparisons specify what they're compared to
            const contextProvided = /\b(compared to|versus|vs\.|relative to|in contrast to)\b/gi.test(content);
            if (!contextProvided) {
                issues.push({
                    message: 'Comparative claims should specify comparison context',
                    severity: 'info',
                    confidence: 0.6,
                    category: 'factual',
                    suggestions: [
                        'Specify what is being compared',
                        'Provide context for comparisons',
                        'Use specific rather than vague comparisons'
                    ]
                });
            }
        }

        return issues;
    }

    /**
     * Checks for verifiability of statements
     */
    private checkVerifiability(content: string): any[] {
        const issues: any[] = [];

        // Claims about personal capabilities or achievements
        const personalClaims = content.match(/\bI\s+(am|have|can|will|developed|created|achieved|led|managed)\b/gi);
        if (personalClaims && personalClaims.length > 3) {
            // In professional contexts, these need to be verifiable
            issues.push({
                message: 'Multiple personal capability claims - ensure verifiability',
                severity: 'info',
                confidence: 0.5,
                category: 'factual',
                suggestions: [
                    'Provide specific examples or evidence',
                    'Include quantifiable achievements',
                    'Consider adding references or portfolio links'
                ]
            });
        }

        // Future predictions without hedging
        const futureClaims = content.match(/\b(will|shall|going to)\s+\w+/gi);
        const hedgingWords = content.match(/\b(likely|probably|expect|anticipate|plan to|intend to)\b/gi);
        
        if (futureClaims && futureClaims.length > 2 && (!hedgingWords || hedgingWords.length < futureClaims.length / 2)) {
            issues.push({
                message: 'Future predictions could benefit from hedging language',
                severity: 'info',
                confidence: 0.6,
                category: 'factual',
                suggestions: [
                    'Consider using hedging words like "likely", "expect", "plan to"',
                    'Acknowledge uncertainties in future predictions',
                    'Provide conditional statements where appropriate'
                ]
            });
        }

        return issues;
    }

    private calculateProcessingSteps(content: string, issueCount: number): number {
        const baseSteps = 8; // More steps for factual analysis
        const contentFactor = Math.min(content.length / 500, 10);
        const issueFactor = issueCount * 0.5;
        
        return Math.ceil(baseSteps + contentFactor + issueFactor);
    }

    private countPatternMatches(content: string): number {
        const patterns = [
            /\b(definitely|certainly|obviously)\b/gi,
            /\b(always|never|all|every)\b/gi,
            /\b\d+(\.\d+)?%/gi,
            /\b(causes|results in|leads to)\b/gi
        ];
        
        return patterns.reduce((total, pattern) => {
            const matches = content.match(pattern);
            return total + (matches ? matches.length : 0);
        }, 0);
    }

    private countClaims(content: string): number {
        // Rough heuristic for number of factual claims
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const claimIndicators = /\b(is|are|was|were|will|can|does|has|have)\b/gi;
        
        let claimCount = 0;
        for (const sentence of sentences) {
            const matches = sentence.match(claimIndicators);
            if (matches && matches.length > 0) {
                claimCount++;
            }
        }
        
        return claimCount;
    }

    private createErrorResult(task: ValidationTask, startTime: number, error: any): TaskResult {
        return {
            taskId: task.id,
            success: false,
            adequacyContribution: 0,
            importanceWeight: task.importance,
            processingTimeMs: Date.now() - startTime,
            issues: [{
                message: `Factual accuracy analysis failed: ${error.message || 'Unknown error'}`,
                severity: 'error',
                confidence: 0.9,
                category: 'processing'
            }],
            confidence: 0,
            metadata: {
                terminationReason: 'processing_error',
                processingSteps: 1,
                resourcesUsed: { error: error.message }
            }
        };
    }
}
