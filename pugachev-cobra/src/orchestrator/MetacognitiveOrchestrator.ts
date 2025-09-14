/**
 * MetacognitiveOrchestrator
 * 
 * Central intelligence system extracted from four-sided-triangle that provides
 * autonomous decision-making and processing control for Pugachev Cobra.
 * 
 * Solves the two critical problems:
 * 1. Deciding what to do with validation information
 * 2. Counter-validation through ensemble diversification
 */

import * as vscode from 'vscode';
import { WorkingMemorySystem } from './WorkingMemorySystem';
import { ProcessMonitor } from './ProcessMonitor';
import { DynamicPromptGenerator } from './DynamicPromptGenerator';
import { EightStagePipeline } from './EightStagePipeline';
import { RidiculousSolutionGenerator } from '../core/RidiculousSolutionGenerator';
import { 
    ValidationTask, 
    ProblemContext, 
    SystematicBias, 
    TaskResult, 
    ProcessingSession,
    QualityMetrics,
    RefinementDecision,
    OrchestrationStrategy,
    PugachevCobraResult,
    RidiculousSolution,
    ValidationBoundaries
} from '../types/ValidationTypes';

export class MetacognitiveOrchestrator {
    private workingMemory: WorkingMemorySystem;
    private processMonitor: ProcessMonitor;
    private promptGenerator: DynamicPromptGenerator;
    private pipeline: EightStagePipeline;
    private ridiculousSolutionGenerator: RidiculousSolutionGenerator;
    private config: vscode.WorkspaceConfiguration;

    constructor(private context: vscode.ExtensionContext) {
        this.config = vscode.workspace.getConfiguration('pugachev-cobra');
        this.workingMemory = new WorkingMemorySystem(context);
        this.processMonitor = new ProcessMonitor(context);
        this.promptGenerator = new DynamicPromptGenerator(context);
        this.pipeline = new EightStagePipeline(context);
        this.ridiculousSolutionGenerator = new RidiculousSolutionGenerator(context);
    }

    /**
     * THE PUGACHEV COBRA VALIDATION SYSTEM
     * 
     * Main orchestration method implementing the core breakthrough:
     * Instead of asking "is this correct?" we ask "is this NOT ridiculous?"
     * 
     * Like consciousness: fabricate reality (ridiculous solution), 
     * compare with input (original solution), create boundaries.
     * 
     * Problems become AT LEAST solvable through boundary creation.
     */
    async orchestrateValidation(
        content: string,
        initialContext: ProblemContext
    ): Promise<{
        finalResult: TaskResult[];
        decisions: RefinementDecision[];
        qualityMetrics: QualityMetrics;
        processingStrategy: OrchestrationStrategy;
        pugachevCobraResult: PugachevCobraResult;
    }> {
        // Create processing session with working memory
        const session = await this.workingMemory.createSession({
            content,
            context: initialContext,
            timestamp: Date.now(),
            sessionId: this.generateSessionId()
        });

        try {
            // Phase 1: Initial Strategy Selection
            const strategy = await this.selectOrchestrationStrategy(content, initialContext, session);
            
            // Phase 2: Execute 8-Stage Pipeline with Continuous Monitoring
            const pipelineResults = await this.executeWithMonitoring(content, initialContext, strategy, session);
            
            // Phase 3: Counter-Validation through Ensemble Diversification (Stage 6)
            const diversifiedResults = await this.pipeline.stage6_ensembleDiversification(
                pipelineResults, 
                session
            );
            
            // Phase 4: Final Threshold Verification (Stage 7)
            const verifiedResults = await this.pipeline.stage7_thresholdVerification(
                diversifiedResults, 
                session
            );
            
            // Phase 5: THE PUGACHEV COBRA MANEUVER
            // Generate ridiculous solution and create validation boundaries
            const pugachevCobraResult = await this.performPugachevCobraValidation(
                content,
                verifiedResults,
                initialContext,
                session
            );
            
            // Phase 6: Final Decision Based on Boundaries (NOT absolute correctness)
            const finalQuality = await this.processMonitor.computeFinalQuality(verifiedResults, session);
            const decisions = await this.workingMemory.getRefinementHistory(session.sessionId);
            
            return {
                finalResult: verifiedResults,
                decisions,
                qualityMetrics: finalQuality,
                processingStrategy: strategy,
                pugachevCobraResult
            };

        } finally {
            await this.workingMemory.archiveSession(session.sessionId);
        }
    }

    /**
     * Selects optimal orchestration strategy based on problem characteristics
     * Implements Metacognitive Task Partitioning (MTP) from four-sided-triangle
     */
    private async selectOrchestrationStrategy(
        content: string,
        context: ProblemContext,
        session: ProcessingSession
    ): Promise<OrchestrationStrategy> {
        // Analyze problem complexity and resource requirements
        const complexityAnalysis = await this.analyzeComplexity(content, context);
        
        // Apply Glycolytic Query Investment Cycle (GQIC) for resource allocation
        const resourceAllocation = await this.computeResourceAllocation(complexityAnalysis);
        
        // Determine optimal processing strategy
        const strategy: OrchestrationStrategy = {
            approach: this.selectProcessingApproach(complexityAnalysis),
            stageConfiguration: await this.configureStages(complexityAnalysis, resourceAllocation),
            qualityThresholds: this.computeQualityThresholds(context),
            refinementCriteria: this.establishRefinementCriteria(context),
            resourceBudget: resourceAllocation,
            terminationConditions: this.defineTerminationConditions(context)
        };

        // Store strategy in working memory
        await this.workingMemory.updateSession(session.sessionId, {
            orchestrationStrategy: strategy,
            complexityAnalysis
        });

        return strategy;
    }

    /**
     * Executes pipeline with continuous monitoring and adaptive refinement
     * This implements the autonomous loop control that prevents infinite processing
     */
    private async executeWithMonitoring(
        content: string,
        context: ProblemContext,
        strategy: OrchestrationStrategy,
        session: ProcessingSession
    ): Promise<TaskResult[]> {
        let currentResults: TaskResult[] = [];
        let refinementIteration = 0;
        const maxRefinements = strategy.terminationConditions.maxRefinementIterations || 3;

        while (refinementIteration <= maxRefinements) {
            // Execute pipeline stages according to strategy
            const stageResults = await this.pipeline.executeConfiguredStages(
                content,
                context,
                strategy.stageConfiguration,
                session
            );

            // Continuous quality monitoring
            const qualityAssessment = await this.processMonitor.assessQuality(
                stageResults,
                strategy.qualityThresholds,
                session
            );

            // Store intermediate results
            await this.workingMemory.storeIntermediateResults(session.sessionId, {
                iteration: refinementIteration,
                stageResults,
                qualityAssessment,
                timestamp: Date.now()
            });

            // Decision point: Is refinement needed?
            const refinementDecision = await this.decideRefinement(
                qualityAssessment,
                strategy.refinementCriteria,
                refinementIteration,
                session
            );

            if (!refinementDecision.needsRefinement) {
                currentResults = stageResults;
                break;
            }

            // Generate refined prompts and context for next iteration
            const refinedContext = await this.promptGenerator.generateRefinementContext(
                refinementDecision,
                qualityAssessment,
                session
            );

            // Update processing context for next iteration
            context = await this.updateContextForRefinement(context, refinedContext);
            refinementIteration++;
        }

        return currentResults;
    }

    /**
     * Decides whether refinement is needed based on quality assessment
     * This solves the "sufficient answer" determination problem
     */
    private async decideRefinement(
        qualityAssessment: QualityMetrics,
        refinementCriteria: any,
        currentIteration: number,
        session: ProcessingSession
    ): Promise<RefinementDecision> {
        const decision: RefinementDecision = {
            needsRefinement: false,
            reason: '',
            targetAreas: [],
            confidence: 0,
            iteration: currentIteration
        };

        // Check quality thresholds
        if (qualityAssessment.overallScore < refinementCriteria.minimumQualityThreshold) {
            decision.needsRefinement = true;
            decision.reason = 'Quality below minimum threshold';
            decision.targetAreas = qualityAssessment.deficiencies;
        }

        // Check for critical issues
        if (qualityAssessment.criticalIssues > 0) {
            decision.needsRefinement = true;
            decision.reason = 'Critical issues detected';
            decision.targetAreas.push('critical_issues');
        }

        // Check confidence levels
        if (qualityAssessment.confidence < refinementCriteria.minimumConfidence) {
            decision.needsRefinement = true;
            decision.reason = 'Insufficient confidence in results';
            decision.targetAreas.push('confidence_improvement');
        }

        // Apply Bayesian stopping criteria
        const stoppingProbability = await this.computeBayesianStoppingProbability(
            qualityAssessment,
            session
        );

        if (stoppingProbability > 0.8) {
            decision.needsRefinement = false;
            decision.reason = 'Bayesian stopping criteria met';
        }

        decision.confidence = this.computeDecisionConfidence(qualityAssessment, refinementCriteria);

        // Store decision in working memory
        await this.workingMemory.storeRefinementDecision(session.sessionId, decision);

        return decision;
    }

    /**
     * Analyzes problem complexity using multiple dimensions
     */
    private async analyzeComplexity(content: string, context: ProblemContext): Promise<any> {
        return {
            textComplexity: this.calculateTextComplexity(content),
            domainComplexity: this.assessDomainComplexity(context),
            stakesLevel: this.quantifyStakes(context),
            uncertaintyLevel: this.measureUncertainty(content),
            resourceRequirements: this.estimateResourceNeeds(content, context)
        };
    }

    /**
     * Computes resource allocation using GQIC principles
     */
    private async computeResourceAllocation(complexityAnalysis: any): Promise<any> {
        const baseAllocation = {
            maxProcessingTimeMs: 10000,
            maxMemoryMB: 100,
            maxLLMCalls: 10
        };

        // Scale based on complexity
        const complexityMultiplier = 1 + (complexityAnalysis.textComplexity * 0.5) + 
                                   (complexityAnalysis.domainComplexity * 0.3) +
                                   (complexityAnalysis.uncertaintyLevel * 0.2);

        return {
            maxProcessingTimeMs: Math.floor(baseAllocation.maxProcessingTimeMs * complexityMultiplier),
            maxMemoryMB: Math.floor(baseAllocation.maxMemoryMB * complexityMultiplier),
            maxLLMCalls: Math.floor(baseAllocation.maxLLMCalls * complexityMultiplier),
            priorityLevels: this.computePriorityAllocation(complexityAnalysis)
        };
    }

    /**
     * Computes Bayesian stopping probability
     */
    private async computeBayesianStoppingProbability(
        qualityAssessment: QualityMetrics,
        session: ProcessingSession
    ): Promise<number> {
        // Simple Bayesian model for stopping decision
        const priorProbability = 0.3; // Prior probability that current result is sufficient
        
        // Likelihood based on quality metrics
        const likelihood = Math.min(
            qualityAssessment.overallScore * qualityAssessment.confidence,
            1.0
        );

        // Bayesian update
        const posteriorNumerator = likelihood * priorProbability;
        const posteriorDenominator = posteriorNumerator + (1 - likelihood) * (1 - priorProbability);
        
        return posteriorNumerator / posteriorDenominator;
    }

    // Utility methods for complexity analysis
    private calculateTextComplexity(content: string): number {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = content.length / sentences.length;
        const technicalTerms = (content.match(/\b\w{8,}\b/g) || []).length;
        
        return Math.min(
            (avgSentenceLength / 100) + 
            (technicalTerms / 20) + 
            (content.length / 5000),
            1.0
        );
    }

    private assessDomainComplexity(context: ProblemContext): number {
        let complexity = 0.3; // Base complexity
        
        if (context.characteristics.mathematicalContent) complexity += 0.2;
        if (context.characteristics.requiresFactualAccuracy) complexity += 0.2;
        if (context.stakes === 'critical') complexity += 0.3;
        
        return Math.min(complexity, 1.0);
    }

    private quantifyStakes(context: ProblemContext): number {
        const stakeValues = {
            'low': 0.2,
            'medium': 0.5,
            'high': 0.8,
            'critical': 1.0
        };
        return stakeValues[context.stakes as keyof typeof stakeValues] || 0.5;
    }

    private measureUncertainty(content: string): number {
        const uncertaintyIndicators = [
            /\b(might|may|could|possibly|perhaps|potentially)\b/gi,
            /\b(uncertain|unclear|unknown|unsure)\b/gi,
            /\b(approximately|roughly|around|about)\b/gi
        ];

        let uncertaintyScore = 0;
        for (const pattern of uncertaintyIndicators) {
            const matches = content.match(pattern);
            if (matches) {
                uncertaintyScore += matches.length * 0.1;
            }
        }

        return Math.min(uncertaintyScore, 1.0);
    }

    private estimateResourceNeeds(content: string, context: ProblemContext): any {
        return {
            computationLevel: this.calculateTextComplexity(content),
            memoryRequirement: Math.min(content.length / 1000, 5),
            timeRequirement: this.assessDomainComplexity(context) * 10
        };
    }

    private selectProcessingApproach(complexityAnalysis: any): string {
        if (complexityAnalysis.textComplexity > 0.7 || complexityAnalysis.domainComplexity > 0.8) {
            return 'comprehensive';
        } else if (complexityAnalysis.uncertaintyLevel > 0.6) {
            return 'cautious';
        } else {
            return 'efficient';
        }
    }

    private async configureStages(complexityAnalysis: any, resourceAllocation: any): Promise<any> {
        return {
            stage0_queryProcessor: { enabled: true, priority: 'high' },
            stage1_semanticATDB: { enabled: true, priority: 'high' },
            stage2_domainKnowledge: { 
                enabled: true, 
                priority: 'high',
                dualModelFusion: complexityAnalysis.domainComplexity > 0.5
            },
            stage3_parallelReasoning: { 
                enabled: true, 
                priority: complexityAnalysis.textComplexity > 0.6 ? 'high' : 'medium'
            },
            stage4_solutionGeneration: { enabled: true, priority: 'high' },
            stage5_responseScoring: { enabled: true, priority: 'high' },
            stage6_ensembleDiversification: { 
                enabled: true, 
                priority: 'critical',
                diversityThreshold: 0.3
            },
            stage7_thresholdVerification: { 
                enabled: true, 
                priority: 'critical',
                strictMode: complexityAnalysis.stakesLevel > 0.7
            }
        };
    }

    private computeQualityThresholds(context: ProblemContext): any {
        const baseThresholds = {
            overallScore: 0.7,
            confidence: 0.6,
            criticalIssues: 0
        };

        // Adjust based on stakes
        if (context.stakes === 'critical') {
            baseThresholds.overallScore = 0.85;
            baseThresholds.confidence = 0.8;
        }

        return baseThresholds;
    }

    private establishRefinementCriteria(context: ProblemContext): any {
        return {
            minimumQualityThreshold: context.stakes === 'critical' ? 0.8 : 0.6,
            minimumConfidence: context.stakes === 'critical' ? 0.75 : 0.6,
            maxRefinementIterations: context.stakes === 'critical' ? 5 : 3,
            qualityImprovementThreshold: 0.1
        };
    }

    private defineTerminationConditions(context: ProblemContext): any {
        return {
            maxRefinementIterations: context.stakes === 'critical' ? 5 : 3,
            maxProcessingTimeMs: context.stakes === 'critical' ? 30000 : 15000,
            qualityStagnationThreshold: 0.05,
            resourceExhaustionThreshold: 0.9
        };
    }

    private computePriorityAllocation(complexityAnalysis: any): any {
        return {
            qualityFocus: complexityAnalysis.stakesLevel,
            speedFocus: 1 - complexityAnalysis.textComplexity,
            accuracyFocus: complexityAnalysis.domainComplexity
        };
    }

    private async updateContextForRefinement(context: ProblemContext, refinedContext: any): Promise<ProblemContext> {
        return {
            ...context,
            metadata: {
                ...context.metadata,
                refinementContext: refinedContext,
                refinementTimestamp: Date.now()
            }
        };
    }

    private computeDecisionConfidence(qualityAssessment: QualityMetrics, refinementCriteria: any): number {
        // Compute confidence in the refinement decision
        const qualityGap = Math.abs(qualityAssessment.overallScore - refinementCriteria.minimumQualityThreshold);
        const confidenceGap = Math.abs(qualityAssessment.confidence - refinementCriteria.minimumConfidence);
        
        return Math.min(1.0, (qualityGap + confidenceGap) / 2);
    }

    /**
     * THE CORE PUGACHEV COBRA VALIDATION MECHANISM
     * 
     * This is the breakthrough that makes validation bounded and solvable:
     * 1. Generate intentionally ridiculous solution 
     * 2. Create boundaries through contrast (can mean vs cannot mean)
     * 3. Validate by asking "is original NOT ridiculous?" instead of "is it correct?"
     * 
     * Mimics consciousness: we fabricate reality and compare with input.
     * We only see ~10% but boundaries make problems AT LEAST solvable.
     */
    private async performPugachevCobraValidation(
        originalContent: string,
        originalSolution: TaskResult[],
        context: ProblemContext,
        session: ProcessingSession
    ): Promise<PugachevCobraResult> {
        // Step 1: Generate systematic bias for contrast generation
        const systematicBias = await this.generateContrastBias(context);
        
        // Step 2: THE PUGACHEV COBRA MANEUVER - Generate ridiculous solution
        const ridiculousSolution = await this.ridiculousSolutionGenerator.generateRidiculousSolution(
            originalContent,
            context,
            systematicBias
        );

        // Step 3: Create validation boundaries through contrast
        const validationBoundaries = await this.ridiculousSolutionGenerator.createValidationBoundaries(
            originalSolution,
            ridiculousSolution,
            context
        );

        // Step 4: Final validation decision based on boundaries
        const finalValidation = this.decideFinalValidation(
            originalSolution,
            ridiculousSolution,
            validationBoundaries
        );

        // Step 5: Calculate confidence in boundary-based validation
        const confidence = this.calculateBoundaryConfidence(
            validationBoundaries,
            originalSolution,
            ridiculousSolution
        );

        // Store Pugachev Cobra results in working memory
        await this.workingMemory.storeStageOutput(session.sessionId, 'pugachev_cobra_validation', {
            ridiculousSolution,
            validationBoundaries,
            finalValidation,
            confidence
        });

        const pugachevCobraResult: PugachevCobraResult = {
            originalSolution,
            ridiculousSolution,
            validationBoundaries,
            finalValidation,
            confidence,
            consciousnessComparison: {
                fabricatedReality: ridiculousSolution, // Like dreams/fabricated reality
                actualInput: originalSolution,         // Like actual sensory input
                perceptionBoundaries: validationBoundaries // The boundaries that make it solvable
            }
        };

        return pugachevCobraResult;
    }

    /**
     * Generates systematic bias specifically for creating maximum contrast
     */
    private async generateContrastBias(context: ProblemContext): Promise<SystematicBias> {
        return {
            type: 'contrast-maximization',
            conservativeness: 0.0, // Minimum conservativeness for maximum absurdity
            factualAccuracy: 0.0,  // Ignore facts for ridiculous solutions
            overconfidenceDetection: 0.0, // Allow maximum overconfidence
            creativityAllowance: 1.0, // Maximum creativity for absurdity
            terminationCriteria: {
                maxProcessingTimeMs: 5000,
                sufficiencyThreshold: 0.1, // Very low threshold for ridiculous solutions
                maxIterations: 1 // Single iteration for contrast
            },
            contextAdaptations: {
                antiPatternGeneration: true,
                maximumAbsurdity: true,
                inverseLogic: true
            }
        };
    }

    /**
     * Makes final validation decision based on boundaries, not absolute correctness
     */
    private decideFinalValidation(
        originalSolution: TaskResult[],
        ridiculousSolution: RidiculousSolution,
        boundaries: ValidationBoundaries
    ): 'not-ridiculous' | 'questionable' | 'potentially-ridiculous' {
        // Calculate how far original is from ridiculous solution
        const avgOriginalConfidence = originalSolution.reduce((s, r) => s + r.confidence, 0) / originalSolution.length;
        const avgRidiculousConfidence = ridiculousSolution.absurdSolutions.reduce((s, r) => s + r.confidence, 0) / ridiculousSolution.absurdSolutions.length;
        
        const confidenceDistance = Math.abs(avgOriginalConfidence - avgRidiculousConfidence);
        const contrastRatio = boundaries.contrastRatio;
        const boundaryConfidence = boundaries.boundaryConfidence;

        // Decision based on boundaries, not absolute truth
        if (contrastRatio > 0.7 && confidenceDistance > 0.3 && boundaryConfidence > 0.7) {
            return 'not-ridiculous'; // Clear boundaries, original is reasonable
        } else if (contrastRatio > 0.4 && confidenceDistance > 0.2) {
            return 'questionable';   // Some contrast but not clear
        } else {
            return 'potentially-ridiculous'; // Too similar to ridiculous solution
        }
    }

    /**
     * Calculates confidence in boundary-based validation
     */
    private calculateBoundaryConfidence(
        boundaries: ValidationBoundaries,
        originalSolution: TaskResult[],
        ridiculousSolution: RidiculousSolution
    ): number {
        // Confidence is based on boundary quality, not solution quality
        const boundaryQuality = boundaries.boundaryConfidence;
        const contrastQuality = boundaries.contrastRatio;
        
        // More boundaries = more confidence
        const boundaryCount = boundaries.canMean.length + boundaries.cannotMean.length;
        const boundaryDensity = Math.min(boundaryCount / 10, 1.0); // Normalize to 0-1
        
        // Combined confidence in the boundary-based approach
        return (boundaryQuality * 0.4) + (contrastQuality * 0.4) + (boundaryDensity * 0.2);
    }

    private generateSessionId(): string {
        return `pugachev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
