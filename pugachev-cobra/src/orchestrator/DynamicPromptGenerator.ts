/**
 * DynamicPromptGenerator
 * 
 * Generates context-aware prompts for refinement iterations.
 * Extracted from four-sided-triangle's prompt generation system.
 */

import * as vscode from 'vscode';
import { WorkingMemorySystem } from './WorkingMemorySystem';
import { 
    ProcessingSession,
    QualityMetrics,
    RefinementDecision,
    ProblemContext
} from '../types/ValidationTypes';

export class DynamicPromptGenerator {
    private workingMemory: WorkingMemorySystem;
    private config: vscode.WorkspaceConfiguration;

    constructor(private context: vscode.ExtensionContext) {
        this.config = vscode.workspace.getConfiguration('pugachev-cobra');
        this.workingMemory = new WorkingMemorySystem(context);
    }

    /**
     * Generates refinement context for next iteration
     */
    async generateRefinementContext(
        refinementDecision: RefinementDecision,
        qualityAssessment: QualityMetrics,
        session: ProcessingSession
    ): Promise<any> {
        const refinementPrompts = await this.createRefinementPrompts(
            refinementDecision.targetAreas,
            refinementDecision.reason,
            session
        );

        const contextualInstructions = await this.generateContextualInstructions(
            qualityAssessment.deficiencies,
            session
        );

        const focusedObjectives = await this.createFocusedObjectives(
            qualityAssessment.improvementRecommendations,
            session
        );

        return {
            refinementPrompts,
            contextualInstructions,
            focusedObjectives,
            iterationContext: {
                iteration: refinementDecision.iteration + 1,
                previousQuality: qualityAssessment.overallScore,
                targetImprovement: Math.max(0.1, 0.8 - qualityAssessment.overallScore)
            }
        };
    }

    /**
     * Creates specific prompts for refinement areas
     */
    private async createRefinementPrompts(
        targetAreas: string[],
        reason: string,
        session: ProcessingSession
    ): Promise<Record<string, string>> {
        const prompts: Record<string, string> = {};

        for (const area of targetAreas) {
            switch (area) {
                case 'completeness':
                    prompts[area] = this.generateCompletenessPrompt(session);
                    break;
                case 'consistency':
                    prompts[area] = this.generateConsistencyPrompt(session);
                    break;
                case 'confidence':
                    prompts[area] = this.generateConfidencePrompt(session);
                    break;
                case 'factual':
                    prompts[area] = this.generateFactualPrompt(session);
                    break;
                case 'tonal':
                    prompts[area] = this.generateTonalPrompt(session);
                    break;
                default:
                    prompts[area] = this.generateGenericRefinementPrompt(area, session);
            }
        }

        return prompts;
    }

    private generateCompletenessPrompt(session: ProcessingSession): string {
        return `Focus on improving completeness by addressing these aspects:
        - Ensure all validation dimensions are covered
        - Check for missing analysis areas
        - Verify comprehensive issue detection
        - Context: ${session.context.type} with ${session.context.stakes} stakes`;
    }

    private generateConsistencyPrompt(session: ProcessingSession): string {
        return `Focus on improving consistency by:
        - Resolving contradictory assessments
        - Ensuring coherent reasoning
        - Aligning confidence levels across results
        - Maintaining consistent severity ratings`;
    }

    private generateConfidencePrompt(session: ProcessingSession): string {
        return `Focus on improving confidence by:
        - Providing stronger evidence for claims
        - Increasing certainty in assessments
        - Reducing uncertainty indicators
        - Strengthening validation rationale`;
    }

    private generateFactualPrompt(session: ProcessingSession): string {
        return `Focus on improving factual accuracy by:
        - Verifying all factual claims
        - Reducing overconfident language
        - Providing supporting evidence
        - Ensuring claims are substantiated`;
    }

    private generateTonalPrompt(session: ProcessingSession): string {
        const contextType = session.context.type;
        return `Focus on improving tonal appropriateness for ${contextType}:
        - Ensure appropriate formality level
        - Match tone to context expectations
        - Remove inappropriate language
        - Maintain professional standards`;
    }

    private generateGenericRefinementPrompt(area: string, session: ProcessingSession): string {
        return `Focus on improving ${area}:
        - Address identified deficiencies
        - Enhance quality in this dimension
        - Apply context-appropriate standards
        - Ensure systematic bias compliance`;
    }

    /**
     * Generates contextual instructions based on deficiencies
     */
    private async generateContextualInstructions(
        deficiencies: string[],
        session: ProcessingSession
    ): Promise<string[]> {
        const instructions: string[] = [];

        if (deficiencies.includes('completeness')) {
            instructions.push('Expand analysis to cover all required validation aspects');
        }

        if (deficiencies.includes('consistency')) {
            instructions.push('Resolve any contradictory assessments and improve coherence');
        }

        if (session.context.stakes === 'critical') {
            instructions.push('Apply heightened scrutiny for critical context');
            instructions.push('Ensure conservative approach to all assessments');
        }

        if (session.context.characteristics?.professionalContext) {
            instructions.push('Maintain professional standards throughout validation');
        }

        return instructions;
    }

    /**
     * Creates focused objectives for refinement
     */
    private async createFocusedObjectives(
        recommendations: string[],
        session: ProcessingSession
    ): Promise<string[]> {
        const objectives: string[] = [];

        // Convert recommendations to actionable objectives
        for (const recommendation of recommendations.slice(0, 3)) { // Limit to top 3
            if (recommendation.includes('completeness')) {
                objectives.push('Achieve >80% validation coverage across all dimensions');
            } else if (recommendation.includes('consistency')) {
                objectives.push('Eliminate contradictory assessments and improve coherence');
            } else if (recommendation.includes('confidence')) {
                objectives.push('Increase average confidence level to >75%');
            } else {
                objectives.push(`Address: ${recommendation}`);
            }
        }

        // Add context-specific objectives
        if (session.context.stakes === 'critical') {
            objectives.push('Ensure zero critical issues remain');
        }

        return objectives;
    }
}
