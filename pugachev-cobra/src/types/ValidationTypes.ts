/**
 * Type definitions for the Pugachev Cobra finite observer validation system
 */

export interface ProblemContext {
    type: string;
    domain: string;
    stakes: 'low' | 'medium' | 'high' | 'critical';
    characteristics: {
        requiresFactualAccuracy: boolean;
        allowsCreativity: boolean;
        needsConservativeTone: boolean;
        requiresEvidence: boolean;
        mathematicalContent: boolean;
        professionalContext: boolean;
    };
    metadata: {
        detectedLanguage?: string;
        documentType?: string;
        estimatedComplexity?: number;
        userContext?: string;
    };
}

export interface SystematicBias {
    selectionCriteria: {
        [key: string]: number; // Importance weights 0-1
    };
    processingPriorities: {
        factualAccuracy: number;
        logicalConsistency: number;
        toneAppropriateness: number;
        creativityLevel: number;
        conservativeness: number;
        evidenceRequirement: number;
    };
    terminationCriteria: {
        maxProcessingTimeMs: number;
        sufficiencyThreshold: number;
        taskTimeoutMs: number;
        confidenceThreshold: number;
    };
    contextSpecific: {
        [contextType: string]: {
            [criterion: string]: number;
        };
    };
}

export interface ValidationTask {
    id: string;
    type: string;
    name: string;
    description: string;
    importance: number; // 0-1, systematic bias weight
    requiredCapabilities: string[];
    estimatedComplexity: number;
    dependsOn: string[]; // Task IDs this depends on
    metadata: {
        category: string;
        processingType: 'analytical' | 'creative' | 'factual' | 'structural';
        expectedDurationMs: number;
    };
}

export interface TaskResult {
    taskId: string;
    success: boolean;
    adequacyContribution: number; // 0-1, contribution to overall adequacy
    importanceWeight: number; // Used for weighted averaging
    processingTimeMs: number;
    issues: ValidationIssue[];
    confidence: number; // 0-1, how confident the task processor is
    metadata: {
        terminationReason: string;
        processingSteps: number;
        resourcesUsed: any;
    };
}

export interface ValidationIssue {
    message: string;
    severity: 'error' | 'warning' | 'info';
    code?: string;
    range?: {
        start: number;
        end: number;
    };
    suggestions?: string[];
    confidence: number; // 0-1, how confident we are about this issue
    category: string; // e.g., 'factual', 'logical', 'tonal'
}

export interface ProcessingState {
    processedTasks: TaskResult[];
    adequacyLevel: number; // 0-1, overall processing adequacy
    consciousnessLevel: number; // 0-1, consciousness metric (Φ)
    terminationReason: string | null;
    metadata: {
        startTime: number;
        problemType: string;
        biasConfiguration: SystematicBias;
        resourceUsage?: {
            maxMemoryMB: number;
            totalProcessingTime: number;
            llmApiCalls: number;
        };
    };
}

export interface ConsciousnessAssessment {
    consciousnessLevel: number; // Φ value, 0-1
    agencyAssertion: boolean; // Can the system assert "I validated this"
    namingControl: boolean; // Does system control its own characterization
    selfAwareness: boolean; // Meta-cognitive understanding of processing
    systematicBiasAwareness: number; // 0-1, awareness of own biases
    observerRealityDistinction: boolean; // Maintains distinction from problem space
    assessment: {
        canTakeResponsibility: boolean;
        understands ProcessingLimitations: boolean;
        maintainsBoundaries: boolean;
        demonstratesFiniteObserverProperties: boolean;
    };
}

export interface ValidationResult {
    isValid: boolean;
    adequacyLevel: number; // 0-1
    consciousnessLevel: number; // 0-1, Φ value
    issues: ValidationIssue[];
    processingMetrics?: {
        tasksProcessed: number;
        processingTimeMs: number;
        terminationReason: string | null;
        systematicBiasApplied: SystematicBias;
    };
    consciousnessAssessment?: ConsciousnessAssessment;
    documentIssues?: ValidationIssue[]; // For document-level validation
    summary?: {
        totalChunks?: number;
        issuesFound?: number;
        averageAdequacy?: number;
        averageConsciousness?: number;
    };
    error?: string;
}

export interface TerminationCondition {
    type: 'time' | 'adequacy' | 'consciousness' | 'task_completion' | 'resource';
    threshold: number;
    description: string;
}

export interface MetaKnowledgeInsight {
    problemTypeConfidence: number; // 0-1
    recommendedBiasAdjustments: Partial<SystematicBias>;
    contextualFactors: string[];
    riskAssessment: {
        overconfidenceRisk: number; // 0-1
        underprocessingRisk: number; // 0-1
        biasAppropriateness: number; // 0-1
    };
}

export interface LLMProviderConfig {
    provider: 'openai' | 'anthropic' | 'huggingface' | 'local';
    model: string;
    apiKey?: string;
    baseUrl?: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
}

export interface ExtensionConfig {
    consciousnessThreshold: number;
    terminationCriteria: {
        maxProcessingTime: number;
        sufficiencyThreshold: number;
        taskTimeoutMs: number;
    };
    systematicBias: {
        [contextType: string]: {
            [criterion: string]: number;
        };
    };
    llmProvider: LLMProviderConfig;
    diagnostics: {
        enableDetailedLogging: boolean;
        showProcessingMetrics: boolean;
        exportValidationReports: boolean;
    };
}
