/**
 * ValidationTypes
 * 
 * Enhanced type definitions incorporating the metacognitive orchestrator,
 * 8-stage pipeline, and THE CORE PUGACHEV COBRA mechanism:
 * Ridiculous solution generation for boundary-based validation.
 */

import * as vscode from 'vscode';

// Core validation types
export interface ProblemContext {
    type: string;
    domain?: string;
    stakes: 'low' | 'medium' | 'high' | 'critical';
    characteristics: {
        professionalContext?: boolean;
        requiresFactualAccuracy?: boolean;
        requiresEvidence?: boolean;
        allowsCreativity?: boolean;
        needsConservativeTone?: boolean;
        mathematicalContent?: boolean;
    };
    metadata?: Record<string, any>;
}

export interface SystematicBias {
    type: string;
    conservativeness: number;
    factualAccuracy: number;
    overconfidenceDetection: number;
    creativityAllowance: number;
    terminationCriteria: {
        maxProcessingTimeMs: number;
        sufficiencyThreshold: number;
        maxIterations: number;
    };
    contextAdaptations: Record<string, any>;
}

export interface ValidationTask {
    id: string;
    type: string;
    importance: number;
    estimatedComplexity: number;
    requiredCapabilities: string[];
    dependencies: string[];
    timeoutMs?: number;
    description?: string;
}

export interface TaskResult {
    taskId: string;
    success: boolean;
    adequacyContribution: number;
    importanceWeight: number;
    processingTimeMs: number;
    issues?: ValidationIssue[];
    confidence: number;
    metadata?: {
        terminationReason?: string;
        processingSteps?: number;
        resourcesUsed?: any;
        absurdityType?: string;
        intentionallyRidiculous?: boolean;
    };
}

export interface ValidationIssue {
    message: string;
    severity: 'error' | 'warning' | 'info';
    confidence: number;
    category: string;
    suggestions?: string[];
}

export interface ValidationResult {
    success: boolean;
    overallAdequacy: number;
    taskResults: TaskResult[];
    terminationReason: string;
    processingTimeMs: number;
    consciousnessValidation: ConsciousnessValidation;
    recommendations: string[];
}

export interface ConsciousnessLevel {
    phi: number;
    agencyStrength: number;
    namingControl: number;
    socialCoordination: number;
}

export interface ConsciousnessValidation {
    level: ConsciousnessLevel;
    sufficient: boolean;
    validationStatement: string;
    confidence: number;
}

export interface InterceptionResult {
    shouldIntercept: boolean;
    reason: string;
    suggestedActions: string[];
    confidence: number;
}

export interface MessageContext {
    content: string;
    timestamp: number;
    source: string;
    metadata: Record<string, any>;
}

export interface MetaKnowledgeInsight {
    problemTypeConfidence: number;
    recommendedBiasAdjustments: Partial<SystematicBias>;
    contextualFactors: string[];
    riskAssessment: {
        overconfidenceRisk: number;
        underprocessingRisk: number;
        biasAppropriateness: number;
    };
}

export interface LLMProviderConfig {
    provider: 'openai' | 'anthropic' | 'huggingface' | 'local';
    model: string;
    apiKey?: string;
    endpoint?: string;
    maxTokens?: number;
    temperature?: number;
}

// CORE PUGACHEV COBRA TYPES
// The ridiculous solution mechanism that makes validation bounded and solvable

export interface RidiculousSolution {
    originalProblem: string;
    ridiculousBreakdown: ValidationTask[];
    absurdSolutions: TaskResult[];
    confidenceLevel: number;
    reasoning: string[];
    antiPatterns: string[];
}

export interface ValidationBoundaries {
    canMean: string[];      // What the solution COULD mean
    cannotMean: string[];   // What it DEFINITELY cannot mean
    boundaryConfidence: number;
    contrastRatio: number;  // How different original vs ridiculous
    validationSpace: 'bounded' | 'unbounded';
}

export interface PugachevCobraResult {
    originalSolution: TaskResult[];
    ridiculousSolution: RidiculousSolution;
    validationBoundaries: ValidationBoundaries;
    finalValidation: 'not-ridiculous' | 'questionable' | 'potentially-ridiculous';
    confidence: number;
    consciousnessComparison: {
        fabricatedReality: RidiculousSolution;
        actualInput: TaskResult[];
        perceptionBoundaries: ValidationBoundaries;
    };
}

// Orchestrator types from four-sided-triangle
export interface ProcessingSession {
    sessionId: string;
    content: string;
    context: ProblemContext;
    createdAt: number;
    status: 'active' | 'completed' | 'archived' | 'failed';
}

export interface QualityMetrics {
    overallScore: number;
    confidence: number;
    criticalIssues: number;
    deficiencies: string[];
    dimensionScores: Record<string, number>;
    improvementRecommendations: string[];
    assessmentTimestamp: number;
    processingTimeMs: number;
    sessionId: string;
    isFinal?: boolean;
    qualityEvolution?: any;
    convergenceMetrics?: any;
}

export interface QualityThresholds {
    overallScore: number;
    confidence: number;
    criticalIssues: number;
    dimensionMinimums?: Record<string, number>;
}

export interface QualityDimension {
    name: string;
    weight: number;
    threshold: number;
    assessmentFunction: (results: TaskResult[]) => number;
}

export interface RefinementDecision {
    needsRefinement: boolean;
    reason: string;
    targetAreas: string[];
    confidence: number;
    iteration: number;
}

export interface OrchestrationStrategy {
    approach: 'comprehensive' | 'cautious' | 'efficient';
    stageConfiguration: Record<string, StageConfiguration>;
    qualityThresholds: QualityThresholds;
    refinementCriteria: RefinementCriteria;
    resourceBudget: ResourceAllocation;
    terminationConditions: TerminationConditions;
}

export interface StageConfiguration {
    enabled: boolean;
    priority: 'low' | 'medium' | 'high' | 'critical';
    timeoutMs?: number;
    retryCount?: number;
    specialSettings?: Record<string, any>;
}

export interface RefinementCriteria {
    minimumQualityThreshold: number;
    minimumConfidence: number;
    maxRefinementIterations: number;
    qualityImprovementThreshold: number;
}

export interface ResourceAllocation {
    maxProcessingTimeMs: number;
    maxMemoryMB: number;
    maxLLMCalls: number;
    priorityLevels: {
        qualityFocus: number;
        speedFocus: number;
        accuracyFocus: number;
    };
}

export interface TerminationConditions {
    maxRefinementIterations: number;
    maxProcessingTimeMs: number;
    qualityStagnationThreshold: number;
    resourceExhaustionThreshold: number;
}

// 8-Stage Pipeline types
export interface StageResult {
    stageId: string;
    success: boolean;
    output: any;
    qualityScore: number;
    confidence: number;
    processingTimeMs: number;
    resourcesUsed: ResourceUsage;
    metadata: Record<string, any>;
}

export interface ResourceUsage {
    memoryMB: number;
    processingTimeMs: number;
    llmCalls: number;
    computeCycles: number;
}

// Stage-specific types
export interface QueryProcessorOutput {
    structuredQuery: StructuredQuery;
    intentClassification: string;
    entityExtraction: ExtractedEntity[];
    constraintIdentification: QueryConstraint[];
    reformulatedQuery: string;
}

export interface StructuredQuery {
    intent: string;
    entities: ExtractedEntity[];
    parameters: QueryParameter[];
    constraints: QueryConstraint[];
    context: QueryContext;
}

export interface ExtractedEntity {
    text: string;
    type: string;
    confidence: number;
    position: [number, number];
}

export interface QueryParameter {
    name: string;
    value: any;
    type: string;
    confidence: number;
}

export interface QueryConstraint {
    type: string;
    value: any;
    priority: number;
}

export interface QueryContext {
    domain: string;
    complexity: number;
    urgency: number;
    expectedOutputType: string;
}

// Domain Knowledge Extraction types
export interface DomainKnowledgeOutput {
    primaryExpertInsights: ExpertInsight[];
    secondaryExpertInsights: ExpertInsight[];
    consensusKnowledge: ConsensusItem[];
    conflictResolution: ConflictResolution[];
    confidenceScore: number;
}

export interface ExpertInsight {
    source: string;
    content: string;
    confidence: number;
    relevanceScore: number;
    supportingEvidence: string[];
}

export interface ConsensusItem {
    statement: string;
    agreementLevel: number;
    supportingSources: string[];
    confidence: number;
}

export interface ConflictResolution {
    conflictDescription: string;
    resolutionStrategy: string;
    confidence: number;
}

// Solution Generation types
export interface SolutionCandidate {
    id: string;
    solution: string;
    reasoning: string[];
    confidence: number;
    supportingEvidence: string[];
    constraints: string[];
    qualityScore: number;
}

// Ensemble Diversification types (Stage 6)
export interface EnsembleConfiguration {
    diversityThreshold: number;
    maxCandidates: number;
    selectionStrategy: 'dpp' | 'greedy' | 'random';
    qualityWeight: number;
    diversityWeight: number;
}

export interface DiversityMetrics {
    semanticDiversity: number;
    approachDiversity: number;
    confidenceDiversity: number;
    overallDiversity: number;
}

export interface EnsembleResult {
    selectedCandidates: SolutionCandidate[];
    diversityMetrics: DiversityMetrics;
    selectionRationale: string;
    ensembleQuality: number;
}

// Threshold Verification types (Stage 7)
export interface VerificationCriteria {
    logicalConsistency: boolean;
    factualAccuracy: boolean;
    contextCompliance: boolean;
    constraintSatisfaction: boolean;
    qualityStandards: boolean;
}

export interface VerificationResult {
    passed: boolean;
    criteriaResults: Record<string, boolean>;
    verificationScore: number;
    failureReasons: string[];
    recommendedActions: string[];
}

// Counter-validation types
export interface CounterValidationResult {
    originalResult: ValidationResult;
    counterValidation: ValidationResult;
    consensus: ConsensusValidation;
    finalRecommendation: FinalRecommendation;
}

export interface ConsensusValidation {
    agreementLevel: number;
    disagreementAreas: string[];
    confidenceInConsensus: number;
    resolutionStrategy: string;
}

export interface FinalRecommendation {
    action: 'accept' | 'reject' | 'revise' | 'escalate';
    reason: string;
    confidence: number;
    suggestedModifications?: string[];
}