/**
 * WorkingMemorySystem
 * 
 * Extracted from four-sided-triangle's working memory implementation.
 * Maintains state and context throughout autonomous processing cycles.
 * 
 * Provides session management, hierarchical storage, and transaction operations
 * to ensure consistency across the 8-stage pipeline.
 */

import * as vscode from 'vscode';
import { 
    ProcessingSession, 
    TaskResult, 
    QualityMetrics, 
    RefinementDecision,
    OrchestrationStrategy,
    ProblemContext
} from '../types/ValidationTypes';

interface SessionStorage {
    session: ProcessingSession;
    orchestrationStrategy?: OrchestrationStrategy;
    complexityAnalysis?: any;
    intermediateResults: IntermediateResult[];
    refinementDecisions: RefinementDecision[];
    qualityHistory: QualityMetrics[];
    stageOutputs: Map<string, any>;
    metadata: SessionMetadata;
}

interface IntermediateResult {
    iteration: number;
    stageResults: TaskResult[];
    qualityAssessment: QualityMetrics;
    timestamp: number;
}

interface SessionMetadata {
    createdAt: number;
    lastUpdated: number;
    totalProcessingTime: number;
    resourcesUsed: ResourceUsage;
    status: 'active' | 'completed' | 'archived' | 'failed';
}

interface ResourceUsage {
    memoryMB: number;
    processingTimeMs: number;
    llmCalls: number;
    computeCycles: number;
}

export class WorkingMemorySystem {
    private sessions: Map<string, SessionStorage> = new Map();
    private config: vscode.WorkspaceConfiguration;
    private maxSessions: number;
    private sessionTimeoutMs: number;

    constructor(private context: vscode.ExtensionContext) {
        this.config = vscode.workspace.getConfiguration('pugachev-cobra');
        this.maxSessions = this.config.get('workingMemory.maxSessions', 10);
        this.sessionTimeoutMs = this.config.get('workingMemory.sessionTimeoutMs', 300000); // 5 minutes
        
        // Cleanup timer
        this.startCleanupTimer();
    }

    /**
     * Creates a new processing session with isolated memory context
     */
    async createSession(sessionData: {
        content: string;
        context: ProblemContext;
        timestamp: number;
        sessionId: string;
    }): Promise<ProcessingSession> {
        const session: ProcessingSession = {
            sessionId: sessionData.sessionId,
            content: sessionData.content,
            context: sessionData.context,
            createdAt: sessionData.timestamp,
            status: 'active'
        };

        const storage: SessionStorage = {
            session,
            intermediateResults: [],
            refinementDecisions: [],
            qualityHistory: [],
            stageOutputs: new Map(),
            metadata: {
                createdAt: sessionData.timestamp,
                lastUpdated: sessionData.timestamp,
                totalProcessingTime: 0,
                resourcesUsed: {
                    memoryMB: 0,
                    processingTimeMs: 0,
                    llmCalls: 0,
                    computeCycles: 0
                },
                status: 'active'
            }
        };

        // Ensure we don't exceed max sessions
        await this.enforceSessionLimits();
        
        this.sessions.set(sessionData.sessionId, storage);
        return session;
    }

    /**
     * Updates session with new information (transaction-like operation)
     */
    async updateSession(sessionId: string, updates: Partial<SessionStorage>): Promise<void> {
        const storage = this.sessions.get(sessionId);
        if (!storage) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Transaction-like update
        const updatedStorage = {
            ...storage,
            ...updates,
            metadata: {
                ...storage.metadata,
                lastUpdated: Date.now()
            }
        };

        this.sessions.set(sessionId, updatedStorage);
    }

    /**
     * Stores intermediate results with hierarchical organization
     */
    async storeIntermediateResults(sessionId: string, result: IntermediateResult): Promise<void> {
        const storage = this.sessions.get(sessionId);
        if (!storage) {
            throw new Error(`Session ${sessionId} not found`);
        }

        storage.intermediateResults.push(result);
        
        // Update resource usage
        const resourceDelta = this.calculateResourceDelta(result);
        storage.metadata.resourcesUsed.memoryMB += resourceDelta.memoryMB;
        storage.metadata.resourcesUsed.processingTimeMs += resourceDelta.processingTimeMs;
        storage.metadata.resourcesUsed.llmCalls += resourceDelta.llmCalls;
        storage.metadata.resourcesUsed.computeCycles += resourceDelta.computeCycles;

        storage.metadata.lastUpdated = Date.now();
        storage.metadata.totalProcessingTime = Date.now() - storage.metadata.createdAt;
    }

    /**
     * Stores refinement decisions for learning and analysis
     */
    async storeRefinementDecision(sessionId: string, decision: RefinementDecision): Promise<void> {
        const storage = this.sessions.get(sessionId);
        if (!storage) {
            throw new Error(`Session ${sessionId} not found`);
        }

        storage.refinementDecisions.push(decision);
        storage.metadata.lastUpdated = Date.now();
    }

    /**
     * Stores stage-specific outputs with structured access
     */
    async storeStageOutput(sessionId: string, stageId: string, output: any): Promise<void> {
        const storage = this.sessions.get(sessionId);
        if (!storage) {
            throw new Error(`Session ${sessionId} not found`);
        }

        storage.stageOutputs.set(stageId, {
            output,
            timestamp: Date.now(),
            stageId
        });

        storage.metadata.lastUpdated = Date.now();
    }

    /**
     * Retrieves stage output for cross-stage communication
     */
    async getStageOutput(sessionId: string, stageId: string): Promise<any | null> {
        const storage = this.sessions.get(sessionId);
        if (!storage) {
            return null;
        }

        const stageData = storage.stageOutputs.get(stageId);
        return stageData ? stageData.output : null;
    }

    /**
     * Gets all stage outputs for comprehensive analysis
     */
    async getAllStageOutputs(sessionId: string): Promise<Map<string, any>> {
        const storage = this.sessions.get(sessionId);
        if (!storage) {
            return new Map();
        }

        return new Map(storage.stageOutputs);
    }

    /**
     * Retrieves refinement history for decision analysis
     */
    async getRefinementHistory(sessionId: string): Promise<RefinementDecision[]> {
        const storage = this.sessions.get(sessionId);
        return storage ? [...storage.refinementDecisions] : [];
    }

    /**
     * Gets quality evolution over processing iterations
     */
    async getQualityHistory(sessionId: string): Promise<QualityMetrics[]> {
        const storage = this.sessions.get(sessionId);
        if (!storage) {
            return [];
        }

        return storage.intermediateResults.map(result => result.qualityAssessment);
    }

    /**
     * Retrieves current session state for monitoring
     */
    async getSessionState(sessionId: string): Promise<SessionStorage | null> {
        return this.sessions.get(sessionId) || null;
    }

    /**
     * Archives completed session for analysis
     */
    async archiveSession(sessionId: string): Promise<void> {
        const storage = this.sessions.get(sessionId);
        if (!storage) {
            return;
        }

        storage.metadata.status = 'archived';
        storage.metadata.totalProcessingTime = Date.now() - storage.metadata.createdAt;

        // In a production system, this would persist to disk/database
        // For now, we keep it in memory but mark as archived
        
        // Remove from active sessions after delay
        setTimeout(() => {
            this.sessions.delete(sessionId);
        }, this.config.get('workingMemory.archiveRetentionMs', 60000));
    }

    /**
     * Provides session analytics for optimization
     */
    async getSessionAnalytics(sessionId: string): Promise<any> {
        const storage = this.sessions.get(sessionId);
        if (!storage) {
            return null;
        }

        return {
            sessionId,
            duration: storage.metadata.totalProcessingTime,
            refinementCount: storage.refinementDecisions.length,
            qualityProgression: this.analyzeQualityProgression(storage.intermediateResults),
            resourceEfficiency: this.calculateResourceEfficiency(storage.metadata.resourcesUsed),
            stagePerformance: this.analyzeStagePerformance(storage.stageOutputs),
            iterationDetails: storage.intermediateResults.map(result => ({
                iteration: result.iteration,
                quality: result.qualityAssessment.overallScore,
                confidence: result.qualityAssessment.confidence,
                timestamp: result.timestamp
            }))
        };
    }

    /**
     * Gets global system analytics across all sessions
     */
    async getGlobalAnalytics(): Promise<any> {
        const allSessions = Array.from(this.sessions.values());
        
        return {
            totalActiveSessions: allSessions.filter(s => s.metadata.status === 'active').length,
            totalArchivedSessions: allSessions.filter(s => s.metadata.status === 'archived').length,
            averageProcessingTime: this.calculateAverageProcessingTime(allSessions),
            averageRefinementIterations: this.calculateAverageRefinements(allSessions),
            resourceUtilization: this.aggregateResourceUsage(allSessions),
            qualityDistribution: this.analyzeQualityDistribution(allSessions)
        };
    }

    /**
     * Provides context-aware memory retrieval for stages
     */
    async getContextualMemory(sessionId: string, contextType: string): Promise<any> {
        const storage = this.sessions.get(sessionId);
        if (!storage) {
            return null;
        }

        switch (contextType) {
            case 'recent_quality':
                return storage.intermediateResults.slice(-3).map(r => r.qualityAssessment);
            
            case 'refinement_patterns':
                return this.analyzeRefinementPatterns(storage.refinementDecisions);
            
            case 'stage_dependencies':
                return this.analyzeStageDependencies(storage.stageOutputs);
            
            case 'resource_constraints':
                return this.assessResourceConstraints(storage.metadata.resourcesUsed);
            
            default:
                return null;
        }
    }

    // Private utility methods
    private startCleanupTimer(): void {
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, this.sessionTimeoutMs / 2);
    }

    private async cleanupExpiredSessions(): Promise<void> {
        const now = Date.now();
        const expiredSessions = Array.from(this.sessions.entries())
            .filter(([_, storage]) => {
                return (now - storage.metadata.lastUpdated) > this.sessionTimeoutMs &&
                       storage.metadata.status !== 'active';
            })
            .map(([sessionId, _]) => sessionId);

        for (const sessionId of expiredSessions) {
            this.sessions.delete(sessionId);
        }
    }

    private async enforceSessionLimits(): Promise<void> {
        if (this.sessions.size >= this.maxSessions) {
            // Remove oldest archived session
            const oldestArchived = Array.from(this.sessions.entries())
                .filter(([_, storage]) => storage.metadata.status === 'archived')
                .sort((a, b) => a[1].metadata.lastUpdated - b[1].metadata.lastUpdated)[0];

            if (oldestArchived) {
                this.sessions.delete(oldestArchived[0]);
            }
        }
    }

    private calculateResourceDelta(result: IntermediateResult): ResourceUsage {
        // Estimate resource usage from result characteristics
        const resultSize = JSON.stringify(result).length;
        
        return {
            memoryMB: resultSize / (1024 * 1024),
            processingTimeMs: result.timestamp - (result.timestamp - 1000), // Approximate
            llmCalls: result.stageResults.length, // Rough estimate
            computeCycles: result.stageResults.reduce((sum, r) => sum + (r.processingTimeMs || 0), 0)
        };
    }

    private analyzeQualityProgression(results: IntermediateResult[]): any {
        if (results.length === 0) return null;

        const qualities = results.map(r => r.qualityAssessment.overallScore);
        const trend = this.calculateTrend(qualities);
        
        return {
            initialQuality: qualities[0],
            finalQuality: qualities[qualities.length - 1],
            improvement: qualities[qualities.length - 1] - qualities[0],
            trend,
            peakQuality: Math.max(...qualities),
            convergenceIteration: this.findConvergencePoint(qualities)
        };
    }

    private calculateResourceEfficiency(resources: ResourceUsage): any {
        return {
            timePerMB: resources.memoryMB > 0 ? resources.processingTimeMs / resources.memoryMB : 0,
            callsPerSecond: resources.processingTimeMs > 0 ? (resources.llmCalls * 1000) / resources.processingTimeMs : 0,
            memoryEfficiency: resources.computeCycles > 0 ? resources.memoryMB / resources.computeCycles : 0
        };
    }

    private analyzeStagePerformance(stageOutputs: Map<string, any>): any {
        const stages = Array.from(stageOutputs.keys());
        const performance: any = {};

        for (const stage of stages) {
            const output = stageOutputs.get(stage);
            performance[stage] = {
                completed: true,
                timestamp: output?.timestamp || 0,
                outputSize: JSON.stringify(output?.output || {}).length
            };
        }

        return performance;
    }

    private calculateAverageProcessingTime(sessions: SessionStorage[]): number {
        if (sessions.length === 0) return 0;
        return sessions.reduce((sum, s) => sum + s.metadata.totalProcessingTime, 0) / sessions.length;
    }

    private calculateAverageRefinements(sessions: SessionStorage[]): number {
        if (sessions.length === 0) return 0;
        return sessions.reduce((sum, s) => sum + s.refinementDecisions.length, 0) / sessions.length;
    }

    private aggregateResourceUsage(sessions: SessionStorage[]): ResourceUsage {
        return sessions.reduce((total, session) => ({
            memoryMB: total.memoryMB + session.metadata.resourcesUsed.memoryMB,
            processingTimeMs: total.processingTimeMs + session.metadata.resourcesUsed.processingTimeMs,
            llmCalls: total.llmCalls + session.metadata.resourcesUsed.llmCalls,
            computeCycles: total.computeCycles + session.metadata.resourcesUsed.computeCycles
        }), { memoryMB: 0, processingTimeMs: 0, llmCalls: 0, computeCycles: 0 });
    }

    private analyzeQualityDistribution(sessions: SessionStorage[]): any {
        const allQualities = sessions.flatMap(s => 
            s.intermediateResults.map(r => r.qualityAssessment.overallScore)
        );

        if (allQualities.length === 0) return null;

        return {
            mean: allQualities.reduce((sum, q) => sum + q, 0) / allQualities.length,
            median: this.calculateMedian(allQualities),
            standardDeviation: this.calculateStandardDeviation(allQualities),
            distribution: this.createQualityHistogram(allQualities)
        };
    }

    private analyzeRefinementPatterns(decisions: RefinementDecision[]): any {
        return {
            refinementReasons: this.groupBy(decisions, d => d.reason),
            targetAreas: this.flattenAndCount(decisions.map(d => d.targetAreas)),
            confidenceProgression: decisions.map(d => d.confidence),
            iterationDistribution: this.groupBy(decisions, d => d.iteration.toString())
        };
    }

    private analyzeStageDependencies(stageOutputs: Map<string, any>): any {
        const stages = Array.from(stageOutputs.keys()).sort();
        const dependencies: any = {};

        for (const stage of stages) {
            dependencies[stage] = {
                dependsOn: this.findStageDependencies(stage),
                completionOrder: stages.indexOf(stage),
                hasOutput: stageOutputs.has(stage)
            };
        }

        return dependencies;
    }

    private assessResourceConstraints(usage: ResourceUsage): any {
        const constraints = this.config.get('workingMemory.resourceConstraints', {});
        
        return {
            memoryUtilization: usage.memoryMB / (constraints.maxMemoryMB || 1000),
            timeUtilization: usage.processingTimeMs / (constraints.maxProcessingTimeMs || 60000),
            callUtilization: usage.llmCalls / (constraints.maxLLMCalls || 100),
            atRisk: this.identifyResourceRisks(usage, constraints)
        };
    }

    // Utility helper methods
    private calculateTrend(values: number[]): 'improving' | 'stable' | 'degrading' {
        if (values.length < 2) return 'stable';
        
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        
        const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
        
        if (secondAvg > firstAvg + 0.05) return 'improving';
        if (secondAvg < firstAvg - 0.05) return 'degrading';
        return 'stable';
    }

    private findConvergencePoint(values: number[]): number {
        const threshold = 0.02; // 2% change threshold
        
        for (let i = 1; i < values.length; i++) {
            if (Math.abs(values[i] - values[i - 1]) < threshold) {
                return i;
            }
        }
        
        return values.length;
    }

    private calculateMedian(values: number[]): number {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    private calculateStandardDeviation(values: number[]): number {
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((s, v) => s + v, 0) / values.length;
        
        return Math.sqrt(avgSquaredDiff);
    }

    private createQualityHistogram(values: number[]): any {
        const bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
        const histogram: any = {};
        
        for (let i = 0; i < bins.length - 1; i++) {
            const binKey = `${bins[i]}-${bins[i + 1]}`;
            histogram[binKey] = values.filter(v => v >= bins[i] && v < bins[i + 1]).length;
        }
        
        return histogram;
    }

    private groupBy<T, K extends string | number>(array: T[], keyFn: (item: T) => K): Record<K, T[]> {
        return array.reduce((groups, item) => {
            const key = keyFn(item);
            (groups[key] = groups[key] || []).push(item);
            return groups;
        }, {} as Record<K, T[]>);
    }

    private flattenAndCount<T>(arrays: T[][]): Record<string, number> {
        const flattened = arrays.flat();
        return flattened.reduce((counts, item) => {
            const key = String(item);
            counts[key] = (counts[key] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);
    }

    private findStageDependencies(stage: string): string[] {
        // Simple dependency analysis based on stage ordering
        const stageOrder = [
            'stage0_queryProcessor',
            'stage1_semanticATDB', 
            'stage2_domainKnowledge',
            'stage3_parallelReasoning',
            'stage4_solutionGeneration',
            'stage5_responseScoring',
            'stage6_ensembleDiversification',
            'stage7_thresholdVerification'
        ];
        
        const stageIndex = stageOrder.indexOf(stage);
        return stageIndex > 0 ? stageOrder.slice(0, stageIndex) : [];
    }

    private identifyResourceRisks(usage: ResourceUsage, constraints: any): string[] {
        const risks: string[] = [];
        
        if (usage.memoryMB > (constraints.maxMemoryMB || 1000) * 0.8) {
            risks.push('memory_exhaustion');
        }
        
        if (usage.processingTimeMs > (constraints.maxProcessingTimeMs || 60000) * 0.8) {
            risks.push('timeout_risk');
        }
        
        if (usage.llmCalls > (constraints.maxLLMCalls || 100) * 0.8) {
            risks.push('api_limit_risk');
        }
        
        return risks;
    }
}
