/**
 * MetaKnowledgeProcessor
 * 
 * Processes meta-knowledge about problems to refine context understanding.
 * Implements the meta-knowledge requirement from the mathematical framework.
 */

import * as vscode from 'vscode';
import { ProblemContext, MetaKnowledgeInsight, LLMProviderConfig } from '../types/ValidationTypes';

export class MetaKnowledgeProcessor {
    private config: vscode.WorkspaceConfiguration;

    constructor(private context: vscode.ExtensionContext) {
        this.config = vscode.workspace.getConfiguration('pugachev-cobra');
    }

    /**
     * Refines problem context based on content analysis and meta-knowledge
     */
    async refineContext(
        initialContext: ProblemContext,
        content: string
    ): Promise<ProblemContext> {
        try {
            // Analyze content for meta-patterns
            const metaInsights = await this.generateMetaKnowledgeInsights(content, initialContext);
            
            // Refine context based on insights
            const refinedContext = this.applyMetaKnowledgeRefinements(
                initialContext,
                metaInsights
            );

            return refinedContext;
        } catch (error) {
            console.warn('Meta-knowledge processing failed, using initial context:', error);
            return initialContext;
        }
    }

    /**
     * Generates meta-knowledge insights about the content and context
     */
    private async generateMetaKnowledgeInsights(
        content: string,
        context: ProblemContext
    ): Promise<MetaKnowledgeInsight> {
        // Analyze content patterns
        const contentAnalysis = this.analyzeContentPatterns(content);
        
        // Assess context confidence
        const problemTypeConfidence = this.assessProblemTypeConfidence(content, context);
        
        // Generate bias adjustments
        const biasAdjustments = this.generateBiasAdjustments(contentAnalysis, context);
        
        // Assess risks
        const riskAssessment = this.assessValidationRisks(content, context);

        return {
            problemTypeConfidence,
            recommendedBiasAdjustments: biasAdjustments,
            contextualFactors: contentAnalysis.contextualFactors,
            riskAssessment
        };
    }

    /**
     * Analyzes content for meta-patterns and characteristics
     */
    private analyzeContentPatterns(content: string): {
        complexity: number;
        confidence_indicators: string[];
        uncertainty_indicators: string[];
        contextualFactors: string[];
    } {
        const analysis = {
            complexity: this.calculateContentComplexity(content),
            confidence_indicators: this.detectConfidenceIndicators(content),
            uncertainty_indicators: this.detectUncertaintyIndicators(content),
            contextualFactors: this.extractContextualFactors(content)
        };

        return analysis;
    }

    /**
     * Calculates content complexity for meta-knowledge assessment
     */
    private calculateContentComplexity(content: string): number {
        let complexity = 0;

        // Length factor
        complexity += Math.min(content.length / 5000, 0.3);

        // Sentence complexity
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = content.length / sentences.length;
        complexity += Math.min(avgSentenceLength / 100, 0.2);

        // Technical terminology
        const technicalTerms = (content.match(/\b\w{10,}\b/g) || []).length;
        complexity += Math.min(technicalTerms / 50, 0.2);

        // Mathematical content
        if (/[\(\)\[\]{}=+\-*/^∫∑∏∆∇]|\\begin|\\end|\$.*\$/.test(content)) {
            complexity += 0.15;
        }

        // Citations and references
        if (/\b(et al\.|doi:|http|www\.|\[[\d,\s-]+\])/i.test(content)) {
            complexity += 0.1;
        }

        // Nested clauses and complex sentence structure
        const nestedClauses = (content.match(/[,;:]/g) || []).length;
        complexity += Math.min(nestedClauses / content.split(' ').length, 0.05);

        return Math.min(complexity, 1.0);
    }

    /**
     * Detects confidence indicators in the text
     */
    private detectConfidenceIndicators(content: string): string[] {
        const indicators: string[] = [];
        
        const highConfidencePatterns = [
            /\b(definitely|certainly|obviously|clearly|undoubtedly)\b/gi,
            /\b(always|never|all|every|none)\b/gi,
            /\b(proves|demonstrates|establishes|confirms)\b/gi,
            /\b(guaranteed|assured|certain|absolute)\b/gi
        ];

        for (const pattern of highConfidencePatterns) {
            const matches = content.match(pattern);
            if (matches) {
                indicators.push(...matches.map(m => m.toLowerCase()));
            }
        }

        return [...new Set(indicators)]; // Remove duplicates
    }

    /**
     * Detects uncertainty indicators in the text
     */
    private detectUncertaintyIndicators(content: string): string[] {
        const indicators: string[] = [];
        
        const uncertaintyPatterns = [
            /\b(might|may|could|possibly|perhaps|potentially)\b/gi,
            /\b(suggests|indicates|appears|seems|likely)\b/gi,
            /\b(approximately|roughly|around|about)\b/gi,
            /\b(uncertain|unclear|unknown|unsure)\b/gi,
            /\b(preliminary|tentative|provisional)\b/gi
        ];

        for (const pattern of uncertaintyPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                indicators.push(...matches.map(m => m.toLowerCase()));
            }
        }

        return [...new Set(indicators)];
    }

    /**
     * Extracts contextual factors for meta-knowledge assessment
     */
    private extractContextualFactors(content: string): string[] {
        const factors: string[] = [];

        // Domain-specific terminology
        if (/\b(algorithm|data|analysis|research|study)\b/gi.test(content)) {
            factors.push('technical-domain');
        }

        if (/\b(application|position|experience|skills)\b/gi.test(content)) {
            factors.push('professional-communication');
        }

        if (/\b(hypothesis|methodology|results|conclusion)\b/gi.test(content)) {
            factors.push('academic-writing');
        }

        // Emotional indicators
        if (/\b(excited|passionate|enthusiastic|motivated)\b/gi.test(content)) {
            factors.push('emotional-content');
        }

        // Quantitative content
        if (/\b\d+(\.\d+)?%|\b\d+\s+participants|\bp\s*[<>=]\s*0?\.\d+/gi.test(content)) {
            factors.push('quantitative-claims');
        }

        // Time references
        if (/\b(currently|recently|future|next|previous)\b/gi.test(content)) {
            factors.push('temporal-references');
        }

        return factors;
    }

    /**
     * Assesses confidence in problem type classification
     */
    private assessProblemTypeConfidence(content: string, context: ProblemContext): number {
        let confidence = 0.5; // Base confidence

        // Strong indicators for each problem type
        const typeIndicators = {
            'Professional Communication': [
                /\b(position|application|resume|cover letter)\b/gi,
                /\b(dear|sincerely|regards|experience)\b/gi,
                /\b(qualification|skill|responsibility)\b/gi
            ],
            'Academic Writing': [
                /\b(abstract|introduction|methodology|conclusion)\b/gi,
                /\b(research|study|hypothesis|citation)\b/gi,
                /\b(journal|publication|peer review)\b/gi
            ],
            'Technical Analysis': [
                /\b(algorithm|implementation|system|analysis)\b/gi,
                /\b(data|performance|optimization|framework)\b/gi,
                /[\(\)\[\]{}=+\-*/^]|\\begin|\\end/
            ],
            'Creative Exploration': [
                /\b(creative|innovative|imagine|story)\b/gi,
                /\b(artistic|design|aesthetic|vision)\b/gi
            ]
        };

        const currentTypeIndicators = typeIndicators[context.type as keyof typeof typeIndicators] || [];
        let matchCount = 0;

        for (const pattern of currentTypeIndicators) {
            if (pattern.test(content)) {
                matchCount++;
            }
        }

        // Adjust confidence based on matches
        confidence += (matchCount / currentTypeIndicators.length) * 0.4;

        // Reduce confidence if other type indicators are present
        for (const [otherType, indicators] of Object.entries(typeIndicators)) {
            if (otherType !== context.type) {
                for (const pattern of indicators) {
                    if (pattern.test(content)) {
                        confidence -= 0.1;
                    }
                }
            }
        }

        return Math.max(0.1, Math.min(confidence, 0.95));
    }

    /**
     * Generates bias adjustments based on meta-knowledge
     */
    private generateBiasAdjustments(
        contentAnalysis: any,
        context: ProblemContext
    ): Partial<any> {
        const adjustments: any = {};

        // Adjust based on confidence indicators
        if (contentAnalysis.confidence_indicators.length > 3) {
            adjustments.overconfidenceDetection = 0.9; // Increase overconfidence detection
        }

        // Adjust based on uncertainty indicators
        if (contentAnalysis.uncertainty_indicators.length > 2) {
            adjustments.conservativeness = 0.8; // Increase conservativeness
        }

        // Adjust based on complexity
        if (contentAnalysis.complexity > 0.7) {
            adjustments.terminationCriteria = {
                maxProcessingTimeMs: 7500, // Allow more time for complex content
                sufficiencyThreshold: 0.8 // Require higher sufficiency
            };
        }

        // Context-specific adjustments
        if (context.stakes === 'critical' && contentAnalysis.confidence_indicators.length > 0) {
            adjustments.factualAccuracy = 0.95;
            adjustments.claimVerification = 0.9;
        }

        return adjustments;
    }

    /**
     * Assesses validation risks based on content and context
     */
    private assessValidationRisks(content: string, context: ProblemContext): {
        overconfidenceRisk: number;
        underprocessingRisk: number;
        biasAppropriateness: number;
    } {
        let overconfidenceRisk = 0.3; // Base risk
        let underprocessingRisk = 0.3;
        let biasAppropriateness = 0.7;

        // Overconfidence risk factors
        const confidenceIndicators = this.detectConfidenceIndicators(content);
        overconfidenceRisk += Math.min(confidenceIndicators.length * 0.1, 0.4);

        // High stakes increase overconfidence risk
        if (context.stakes === 'critical') {
            overconfidenceRisk += 0.2;
        }

        // Underprocessing risk factors
        if (content.length > 2000) {
            underprocessingRisk += 0.2; // Long content needs more processing
        }

        if (context.characteristics.mathematicalContent) {
            underprocessingRisk += 0.15; // Math content needs careful analysis
        }

        // Bias appropriateness
        const contextMatch = this.assessProblemTypeConfidence(content, context);
        biasAppropriateness = contextMatch;

        return {
            overconfidenceRisk: Math.min(overconfidenceRisk, 0.9),
            underprocessingRisk: Math.min(underprocessingRisk, 0.9),
            biasAppropriateness: Math.max(biasAppropriateness, 0.1)
        };
    }

    /**
     * Applies meta-knowledge refinements to context
     */
    private applyMetaKnowledgeRefinements(
        context: ProblemContext,
        insights: MetaKnowledgeInsight
    ): ProblemContext {
        const refinedContext = { ...context };

        // Adjust stakes based on risk assessment
        if (insights.riskAssessment.overconfidenceRisk > 0.7) {
            refinedContext.stakes = 'critical'; // Elevate stakes for high overconfidence risk
        }

        // Adjust characteristics based on contextual factors
        if (insights.contextualFactors.includes('quantitative-claims')) {
            refinedContext.characteristics.requiresFactualAccuracy = true;
            refinedContext.characteristics.requiresEvidence = true;
        }

        if (insights.contextualFactors.includes('emotional-content')) {
            refinedContext.characteristics.needsConservativeTone = true;
        }

        // Update metadata with insights
        refinedContext.metadata = {
            ...refinedContext.metadata,
            problemTypeConfidence: insights.problemTypeConfidence,
            overconfidenceRisk: insights.riskAssessment.overconfidenceRisk,
            underprocessingRisk: insights.riskAssessment.underprocessingRisk,
            contextualFactors: insights.contextualFactors.join(', ')
        };

        return refinedContext;
    }
}
