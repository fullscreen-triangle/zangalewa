/**
 * SystematicBiasGenerator
 * 
 * Generates context-appropriate systematic bias configurations.
 * Implements the mathematical necessity of systematic bias for functional validation.
 */

import * as vscode from 'vscode';
import { ProblemContext, SystematicBias } from '../types/ValidationTypes';

export class SystematicBiasGenerator {
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('pugachev-cobra');
    }

    /**
     * Generates systematic bias appropriate for the given problem context
     * Implements context-dependent bias generation from the mathematical framework
     */
    async generateBias(problemContext: ProblemContext): Promise<SystematicBias> {
        // Get base configuration
        const baseSystematicBias = this.config.get<any>('systematicBias', {});
        const terminationConfig = this.config.get<any>('terminationCriteria', {});

        // Generate context-specific bias
        const contextSpecificBias = this.generateContextSpecificBias(problemContext);
        
        // Calculate processing priorities based on context
        const processingPriorities = this.calculateProcessingPriorities(problemContext);
        
        // Generate selection criteria with importance weighting
        const selectionCriteria = this.generateSelectionCriteria(problemContext);
        
        // Configure termination criteria based on stakes and complexity
        const adaptiveTerminationCriteria = this.adaptTerminationCriteria(
            problemContext, 
            terminationConfig
        );

        return {
            selectionCriteria,
            processingPriorities,
            terminationCriteria: adaptiveTerminationCriteria,
            contextSpecific: {
                [problemContext.type]: contextSpecificBias,
                baseConfiguration: baseSystematicBias
            }
        };
    }

    private generateContextSpecificBias(problemContext: ProblemContext): { [criterion: string]: number } {
        const bias: { [criterion: string]: number } = {};

        switch (problemContext.type) {
            case 'Professional Communication':
                return this.generateProfessionalCommunicationBias(problemContext);
                
            case 'Creative Exploration':
                return this.generateCreativeExplorationBias(problemContext);
                
            case 'Technical Analysis':
                return this.generateTechnicalAnalysisBias(problemContext);
                
            case 'Academic Writing':
                return this.generateAcademicWritingBias(problemContext);
                
            case 'Technical Documentation':
                return this.generateTechnicalDocumentationBias(problemContext);
                
            default:
                return this.generateDefaultBias(problemContext);
        }
    }

    private generateProfessionalCommunicationBias(context: ProblemContext): { [criterion: string]: number } {
        const baseBias = {
            factualAccuracy: 0.9,
            conservativeTone: 0.85,
            verifiability: 0.9,
            professionalLanguage: 0.95,
            grammarPrecision: 0.9,
            appropriateFormal: 0.9,
            overconfidenceDetection: 0.95, // Critical for applications
            claimSubstantiation: 0.9
        };

        // Adjust based on stakes
        if (context.stakes === 'critical') {
            baseBias.factualAccuracy = 0.95;
            baseBias.overconfidenceDetection = 0.98;
            baseBias.verifiability = 0.95;
        }

        // Adjust based on domain
        if (context.domain === 'employment') {
            baseBias.overconfidenceDetection = 0.98; // Prevent resume/cover letter disasters
            baseBias.claimSubstantiation = 0.95;
        }

        return baseBias;
    }

    private generateCreativeExplorationBias(context: ProblemContext): { [criterion: string]: number } {
        return {
            novelty: 0.8,
            logicalConsistency: 0.6, // Lower for creative freedom
            theoreticalRigor: 0.7,
            creativeFreedom: 0.9,
            originalityCheck: 0.8,
            coherenceBalance: 0.7,
            overconfidenceDetection: 0.6, // Allow more exploratory confidence
            innovativeThinking: 0.85
        };
    }

    private generateTechnicalAnalysisBias(context: ProblemContext): { [criterion: string]: number } {
        const bias = {
            mathematicalRigor: 0.95,
            empiricalEvidence: 0.85,
            logicalConsistency: 0.9,
            methodologicalSoundness: 0.9,
            citationAccuracy: 0.85,
            technicalPrecision: 0.9,
            overconfidenceDetection: 0.8
        };

        // Boost mathematical rigor for mathematical content
        if (context.characteristics.mathematicalContent) {
            bias.mathematicalRigor = 0.98;
            bias.logicalConsistency = 0.95;
        }

        return bias;
    }

    private generateAcademicWritingBias(context: ProblemContext): { [criterion: string]: number } {
        return {
            citationAccuracy: 0.95,
            evidenceSupport: 0.9,
            methodologicalRigor: 0.9,
            academicTone: 0.85,
            logicalStructure: 0.9,
            claimSubstantiation: 0.95,
            peerReviewReadiness: 0.85,
            overconfidenceDetection: 0.85
        };
    }

    private generateTechnicalDocumentationBias(context: ProblemContext): { [criterion: string]: number } {
        return {
            technicalAccuracy: 0.9,
            clarityForUsers: 0.85,
            completenessCheck: 0.8,
            consistentTerminology: 0.9,
            practicalUtility: 0.85,
            maintenanceConsiderations: 0.8,
            overconfidenceDetection: 0.7 // Technical docs can be more confident about capabilities
        };
    }

    private generateDefaultBias(context: ProblemContext): { [criterion: string]: number } {
        return {
            generalAccuracy: 0.75,
            logicalConsistency: 0.8,
            appropriateTone: 0.75,
            factualVerification: 0.7,
            overconfidenceDetection: 0.8,
            generalCoherence: 0.75
        };
    }

    private calculateProcessingPriorities(context: ProblemContext): SystematicBias['processingPriorities'] {
        const priorities = {
            factualAccuracy: 0.5,
            logicalConsistency: 0.7,
            toneAppropriateness: 0.5,
            creativityLevel: 0.3,
            conservativeness: 0.5,
            evidenceRequirement: 0.5
        };

        // Adjust based on context characteristics
        if (context.characteristics.requiresFactualAccuracy) {
            priorities.factualAccuracy = 0.9;
            priorities.evidenceRequirement = 0.85;
        }

        if (context.characteristics.needsConservativeTone) {
            priorities.conservativeness = 0.9;
            priorities.toneAppropriateness = 0.85;
        }

        if (context.characteristics.allowsCreativity) {
            priorities.creativityLevel = 0.8;
            priorities.conservativeness = 0.3; // Inverse relationship
        }

        if (context.characteristics.mathematicalContent) {
            priorities.logicalConsistency = 0.95;
            priorities.factualAccuracy = 0.9;
        }

        if (context.characteristics.professionalContext) {
            priorities.toneAppropriateness = 0.9;
            priorities.conservativeness = 0.85;
        }

        return priorities;
    }

    private generateSelectionCriteria(context: ProblemContext): { [key: string]: number } {
        const criteria: { [key: string]: number } = {};

        // Base criteria all contexts need
        criteria['logical-consistency'] = 0.8;
        criteria['basic-coherence'] = 0.7;

        // Context-specific criteria
        switch (context.type) {
            case 'Professional Communication':
                criteria['factual-accuracy'] = 0.95;
                criteria['tone-analysis'] = 0.9;
                criteria['professional-language'] = 0.85;
                criteria['overconfidence-detection'] = 0.95;
                criteria['claim-verification'] = 0.9;
                break;

            case 'Creative Exploration':
                criteria['novelty-assessment'] = 0.8;
                criteria['creative-coherence'] = 0.7;
                criteria['originality-check'] = 0.75;
                criteria['logical-consistency'] = 0.6; // Lower for creativity
                break;

            case 'Technical Analysis':
                criteria['mathematical-rigor'] = 0.95;
                criteria['evidence-support'] = 0.9;
                criteria['technical-accuracy'] = 0.9;
                criteria['methodological-soundness'] = 0.85;
                break;

            case 'Academic Writing':
                criteria['citation-accuracy'] = 0.95;
                criteria['evidence-support'] = 0.9;
                criteria['academic-tone'] = 0.85;
                criteria['peer-review-readiness'] = 0.8;
                break;

            case 'Technical Documentation':
                criteria['technical-accuracy'] = 0.9;
                criteria['user-clarity'] = 0.85;
                criteria['completeness-check'] = 0.8;
                criteria['practical-utility'] = 0.8;
                break;
        }

        // Adjust based on stakes
        if (context.stakes === 'critical') {
            // Increase all criteria by 10% for critical situations
            for (const key in criteria) {
                criteria[key] = Math.min(criteria[key] * 1.1, 1.0);
            }
        }

        return criteria;
    }

    private adaptTerminationCriteria(
        context: ProblemContext, 
        baseConfig: any
    ): SystematicBias['terminationCriteria'] {
        const base = {
            maxProcessingTimeMs: baseConfig.maxProcessingTime || 5000,
            sufficiencyThreshold: baseConfig.sufficiencyThreshold || 0.7,
            taskTimeoutMs: baseConfig.taskTimeoutMs || 1000,
            confidenceThreshold: 0.6
        };

        // Adjust based on stakes and complexity
        switch (context.stakes) {
            case 'critical':
                base.maxProcessingTimeMs *= 2; // Allow more time for critical content
                base.sufficiencyThreshold = 0.85; // Require higher sufficiency
                base.confidenceThreshold = 0.8;
                break;
                
            case 'high':
                base.maxProcessingTimeMs *= 1.5;
                base.sufficiencyThreshold = 0.8;
                base.confidenceThreshold = 0.75;
                break;
                
            case 'low':
                base.maxProcessingTimeMs *= 0.7; // Faster processing for low stakes
                base.sufficiencyThreshold = 0.6;
                base.confidenceThreshold = 0.5;
                break;
        }

        // Adjust based on complexity
        const complexityMultiplier = 1 + (context.metadata.estimatedComplexity || 0);
        base.maxProcessingTimeMs *= complexityMultiplier;
        base.taskTimeoutMs *= complexityMultiplier;

        return base;
    }

    /**
     * Updates systematic bias based on feedback or validation results
     */
    async updateBiasFromFeedback(
        problemContext: ProblemContext,
        validationResult: any,
        userFeedback?: any
    ): Promise<void> {
        // Implement adaptive bias learning based on validation outcomes
        // This would update the bias configuration for future similar contexts
        
        if (validationResult.consciousnessLevel < 0.6) {
            console.log('Low consciousness detected, may need bias adjustment');
            // Could implement bias strengthening here
        }

        if (userFeedback?.type === 'false_positive') {
            console.log('False positive feedback, may need to reduce sensitivity');
            // Could implement bias relaxation for specific criteria
        }

        // For now, this is a placeholder for future adaptive learning
    }

    /**
     * Gets the default systematic bias configuration
     */
    getDefaultBias(): SystematicBias {
        return {
            selectionCriteria: {
                'logical-consistency': 0.8,
                'basic-coherence': 0.7,
                'factual-accuracy': 0.6,
                'tone-analysis': 0.5
            },
            processingPriorities: {
                factualAccuracy: 0.6,
                logicalConsistency: 0.8,
                toneAppropriateness: 0.5,
                creativityLevel: 0.4,
                conservativeness: 0.5,
                evidenceRequirement: 0.5
            },
            terminationCriteria: {
                maxProcessingTimeMs: 5000,
                sufficiencyThreshold: 0.7,
                taskTimeoutMs: 1000,
                confidenceThreshold: 0.6
            },
            contextSpecific: {}
        };
    }
}
