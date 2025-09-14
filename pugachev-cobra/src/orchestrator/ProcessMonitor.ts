/**
 * ProcessMonitor
 * 
 * Extracted from four-sided-triangle's process monitoring system.
 * Provides continuous quality evaluation across all pipeline stages,
 * determining when refinement is needed and triggering autonomous loops.
 * 
 * This solves the "sufficient answer" determination problem through
 * multi-dimensional quality assessment and Bayesian evaluation.
 */

import * as vscode from 'vscode';
import { WorkingMemorySystem } from './WorkingMemorySystem';
import { 
    QualityMetrics, 
    TaskResult, 
    ProcessingSession,
    QualityThresholds,
    QualityDimension
} from '../types/ValidationTypes';

interface QualityAssessmentResult {
    overallScore: number;
    confidence: number;
    criticalIssues: number;
    deficiencies: string[];
    dimensionScores: Record<string, number>;
    improvementRecommendations: string[];
}

export class ProcessMonitor {
    private workingMemory: WorkingMemorySystem;
    private config: vscode.WorkspaceConfiguration;
    private qualityHistory: Map<string, QualityMetrics[]> = new Map();

    constructor(private context: vscode.ExtensionContext) {
        this.config = vscode.workspace.getConfiguration('pugachev-cobra');
        this.workingMemory = new WorkingMemorySystem(context);
    }

    /**
     * Assesses quality of stage results using multi-dimensional evaluation
     * This is the core method that determines if refinement is needed
     */
    async assessQuality(
        stageResults: TaskResult[],
        qualityThresholds: QualityThresholds,
        session: ProcessingSession
    ): Promise<QualityMetrics> {
        const startTime = Date.now();

        // Multi-dimensional quality evaluation
        const dimensionScores = await this.evaluateQualityDimensions(stageResults, session);
        
        // Compute overall quality score
        const overallScore = this.computeOverallScore(dimensionScores);
        
        // Assess confidence based on consistency and convergence
        const confidence = await this.assessConfidence(stageResults, dimensionScores, session);
        
        // Identify critical issues
        const criticalIssues = this.identifyCriticalIssues(stageResults, qualityThresholds);
        
        // Determine deficiencies and improvement areas
        const deficiencies = this.identifyDeficiencies(dimensionScores, qualityThresholds);
        
        // Generate improvement recommendations
        const recommendations = await this.generateRecommendations(
            dimensionScores, 
            deficiencies, 
            session
        );

        const qualityMetrics: QualityMetrics = {
            overallScore,
            confidence,
            criticalIssues: criticalIssues.length,
            deficiencies,
            dimensionScores,
            improvementRecommendations: recommendations,
            assessmentTimestamp: Date.now(),
            processingTimeMs: Date.now() - startTime,
            sessionId: session.sessionId
        };

        // Store in quality history for trend analysis
        await this.updateQualityHistory(session.sessionId, qualityMetrics);

        return qualityMetrics;
    }

    /**
     * Computes final quality assessment for completed processing
     */
    async computeFinalQuality(
        finalResults: TaskResult[],
        session: ProcessingSession
    ): Promise<QualityMetrics> {
        // Enhanced assessment for final results
        const thresholds: QualityThresholds = {
            overallScore: 0.8,
            confidence: 0.75,
            criticalIssues: 0,
            dimensionMinimums: {
                completeness: 0.8,
                consistency: 0.85,
                confidence: 0.75,
                compliance: 0.9,
                correctness: 0.8
            }
        };

        const finalQuality = await this.assessQuality(finalResults, thresholds, session);
        
        // Add final quality indicators
        finalQuality.isFinal = true;
        finalQuality.qualityEvolution = await this.analyzeQualityEvolution(session.sessionId);
        finalQuality.convergenceMetrics = await this.assessConvergence(session.sessionId);

        return finalQuality;
    }

    /**
     * Evaluates quality across multiple dimensions inspired by four-sided-triangle
     */
    private async evaluateQualityDimensions(
        stageResults: TaskResult[],
        session: ProcessingSession
    ): Promise<Record<string, number>> {
        const dimensions: Record<string, number> = {};

        // Completeness: Are all required aspects addressed?
        dimensions.completeness = await this.assessCompleteness(stageResults, session);
        
        // Consistency: Are results internally consistent?
        dimensions.consistency = await this.assessConsistency(stageResults, session);
        
        // Confidence: How confident are we in the results?
        dimensions.confidence = await this.assessResultConfidence(stageResults, session);
        
        // Compliance: Do results meet context requirements?
        dimensions.compliance = await this.assessCompliance(stageResults, session);
        
        // Correctness: Are results factually accurate?
        dimensions.correctness = await this.assessCorrectness(stageResults, session);

        // Context-specific dimensions
        const contextualDimensions = await this.evaluateContextualDimensions(stageResults, session);
        Object.assign(dimensions, contextualDimensions);

        return dimensions;
    }

    /**
     * Assesses completeness of validation coverage
     */
    private async assessCompleteness(
        stageResults: TaskResult[],
        session: ProcessingSession
    ): Promise<number> {
        let completenessScore = 0;

        // Check if all expected validation aspects are covered
        const expectedAspects = ['logical', 'factual', 'tonal', 'linguistic', 'contextual'];
        const coveredAspects = new Set(
            stageResults.flatMap(result => 
                result.issues?.map(issue => issue.category) || []
            )
        );

        completenessScore += (coveredAspects.size / expectedAspects.length) * 0.4;

        // Check depth of analysis
        const totalIssuesFound = stageResults.reduce((sum, result) => 
            sum + (result.issues?.length || 0), 0
        );
        
        const depthScore = Math.min(totalIssuesFound / 10, 1.0) * 0.3;
        completenessScore += depthScore;

        // Check processing coverage
        const successfulTasks = stageResults.filter(r => r.success).length;
        const coverageScore = (successfulTasks / stageResults.length) * 0.3;
        completenessScore += coverageScore;

        return Math.min(completenessScore, 1.0);
    }

    /**
     * Assesses consistency across validation results
     */
    private async assessConsistency(
        stageResults: TaskResult[],
        session: ProcessingSession
    ): Promise<number> {
        let consistencyScore = 0.7; // Base score

        // Check for contradictory assessments
        const contradictions = this.findContradictions(stageResults);
        consistencyScore -= contradictions.length * 0.1;

        // Check confidence consistency
        const confidences = stageResults.map(r => r.confidence).filter(c => c !== undefined);
        if (confidences.length > 1) {
            const confidenceVariance = this.calculateVariance(confidences);
            consistencyScore += (1 - confidenceVariance) * 0.2;
        }

        // Check severity consistency
        const severityCounts = this.analyzeSeverityDistribution(stageResults);
        const severityConsistency = this.assessSeverityConsistency(severityCounts);
        consistencyScore += severityConsistency * 0.1;

        return Math.max(0, Math.min(consistencyScore, 1.0));
    }

    /**
     * Assesses result confidence based on convergence and agreement
     */
    private async assessResultConfidence(
        stageResults: TaskResult[],
        session: ProcessingSession
    ): Promise<number> {
        // Average confidence across all results
        const confidences = stageResults
            .map(r => r.confidence)
            .filter(c => c !== undefined && c !== null) as number[];

        if (confidences.length === 0) return 0.5;

        const averageConfidence = confidences.reduce((s, c) => s + c, 0) / confidences.length;
        
        // Adjust based on consistency
        const confidenceVariance = this.calculateVariance(confidences);
        const consistencyFactor = Math.max(0, 1 - confidenceVariance);
        
        // Factor in historical performance
        const historicalFactor = await this.getHistoricalConfidenceFactor(session.sessionId);
        
        return averageConfidence * consistencyFactor * historicalFactor;
    }

    /**
     * Assesses compliance with context requirements
     */
    private async assessCompliance(
        stageResults: TaskResult[],
        session: ProcessingSession
    ): Promise<number> {
        let complianceScore = 0.8; // Base score

        // Check for context violations
        const violations = stageResults.flatMap(result => 
            result.issues?.filter(issue => issue.category === 'compliance') || []
        );

        complianceScore -= violations.length * 0.1;

        // Check adherence to systematic bias requirements
        const biasCompliance = await this.assessBiasCompliance(stageResults, session);
        complianceScore *= biasCompliance;

        // Context-specific compliance checks
        const contextCompliance = await this.assessContextSpecificCompliance(stageResults, session);
        complianceScore *= contextCompliance;

        return Math.max(0, Math.min(complianceScore, 1.0));
    }

    /**
     * Assesses factual correctness of results
     */
    private async assessCorrectness(
        stageResults: TaskResult[],
        session: ProcessingSession
    ): Promise<number> {
        let correctnessScore = 0.7; // Conservative base

        // Count factual errors and overconfidence issues
        const factualErrors = stageResults.flatMap(result =>
            result.issues?.filter(issue => 
                issue.category === 'factual' && issue.severity === 'error'
            ) || []
        );

        const overconfidenceIssues = stageResults.flatMap(result =>
            result.issues?.filter(issue => 
                issue.message?.includes('overconfident') || 
                issue.message?.includes('unsupported')
            ) || []
        );

        // Penalize factual errors heavily
        correctnessScore -= factualErrors.length * 0.2;
        
        // Penalize overconfidence moderately
        correctnessScore -= overconfidenceIssues.length * 0.1;

        // Reward evidence-based claims
        const evidenceBased = stageResults.flatMap(result =>
            result.issues?.filter(issue => 
                issue.suggestions?.some(s => s.includes('evidence') || s.includes('source'))
            ) || []
        );

        correctnessScore += Math.min(evidenceBased.length * 0.05, 0.2);

        return Math.max(0, Math.min(correctnessScore, 1.0));
    }

    /**
     * Evaluates context-specific quality dimensions
     */
    private async evaluateContextualDimensions(
        stageResults: TaskResult[],
        session: ProcessingSession
    ): Promise<Record<string, number>> {
        const contextualDimensions: Record<string, number> = {};

        // Professional context dimensions
        if (session.context.characteristics?.professionalContext) {
            contextualDimensions.professionalism = this.assessProfessionalism(stageResults);
            contextualDimensions.appropriateness = this.assessAppropriatenesss(stageResults);
        }

        // Technical context dimensions
        if (session.context.characteristics?.mathematicalContent) {
            contextualDimensions.technicalAccuracy = this.assessTechnicalAccuracy(stageResults);
        }

        // Critical stakes dimensions
        if (session.context.stakes === 'critical') {
            contextualDimensions.riskMitigation = this.assessRiskMitigation(stageResults);
            contextualDimensions.conservativeness = this.assessConservativeness(stageResults);
        }

        return contextualDimensions;
    }

    /**
     * Computes overall score from dimensional scores
     */
    private computeOverallScore(dimensionScores: Record<string, number>): number {
        const coreDimensions = ['completeness', 'consistency', 'confidence', 'compliance', 'correctness'];
        const coreWeights = [0.2, 0.2, 0.2, 0.2, 0.2]; // Equal weighting for core dimensions
        
        let weightedSum = 0;
        let totalWeight = 0;

        // Core dimensions
        for (let i = 0; i < coreDimensions.length; i++) {
            const dimension = coreDimensions[i];
            if (dimensionScores[dimension] !== undefined) {
                weightedSum += dimensionScores[dimension] * coreWeights[i];
                totalWeight += coreWeights[i];
            }
        }

        // Contextual dimensions (lower weight)
        const contextualWeight = 0.1;
        for (const [dimension, score] of Object.entries(dimensionScores)) {
            if (!coreDimensions.includes(dimension)) {
                weightedSum += score * contextualWeight;
                totalWeight += contextualWeight;
            }
        }

        return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
    }

    /**
     * Assesses overall confidence based on multiple factors
     */
    private async assessConfidence(
        stageResults: TaskResult[],
        dimensionScores: Record<string, number>,
        session: ProcessingSession
    ): Promise<number> {
        // Base confidence from dimensional consistency
        const dimensionValues = Object.values(dimensionScores);
        const avgDimensionScore = dimensionValues.reduce((s, v) => s + v, 0) / dimensionValues.length;
        const dimensionVariance = this.calculateVariance(dimensionValues);
        const dimensionConsistency = Math.max(0, 1 - dimensionVariance);

        // Confidence from result convergence
        const resultConfidences = stageResults
            .map(r => r.confidence)
            .filter(c => c !== undefined) as number[];
        
        const avgResultConfidence = resultConfidences.length > 0
            ? resultConfidences.reduce((s, c) => s + c, 0) / resultConfidences.length
            : 0.5;

        // Historical confidence factor
        const historicalFactor = await this.getHistoricalConfidenceFactor(session.sessionId);

        // Weighted combination
        return (avgDimensionScore * 0.3) + 
               (dimensionConsistency * 0.2) + 
               (avgResultConfidence * 0.3) + 
               (historicalFactor * 0.2);
    }

    /**
     * Identifies critical issues that require immediate attention
     */
    private identifyCriticalIssues(
        stageResults: TaskResult[],
        qualityThresholds: QualityThresholds
    ): any[] {
        return stageResults.flatMap(result =>
            result.issues?.filter(issue => 
                issue.severity === 'error' || 
                (issue.confidence > 0.8 && issue.severity === 'warning')
            ) || []
        );
    }

    /**
     * Identifies quality deficiencies requiring improvement
     */
    private identifyDeficiencies(
        dimensionScores: Record<string, number>,
        qualityThresholds: QualityThresholds
    ): string[] {
        const deficiencies: string[] = [];

        for (const [dimension, score] of Object.entries(dimensionScores)) {
            const threshold = qualityThresholds.dimensionMinimums?.[dimension] || 0.6;
            if (score < threshold) {
                deficiencies.push(dimension);
            }
        }

        return deficiencies;
    }

    /**
     * Generates specific improvement recommendations
     */
    private async generateRecommendations(
        dimensionScores: Record<string, number>,
        deficiencies: string[],
        session: ProcessingSession
    ): Promise<string[]> {
        const recommendations: string[] = [];

        for (const deficiency of deficiencies) {
            const score = dimensionScores[deficiency];
            
            switch (deficiency) {
                case 'completeness':
                    recommendations.push('Expand validation coverage to address missing aspects');
                    break;
                case 'consistency':
                    recommendations.push('Resolve contradictory assessments and improve coherence');
                    break;
                case 'confidence':
                    recommendations.push('Gather additional evidence to increase confidence');
                    break;
                case 'compliance':
                    recommendations.push('Ensure adherence to context-specific requirements');
                    break;
                case 'correctness':
                    recommendations.push('Verify factual accuracy and reduce overconfidence');
                    break;
                default:
                    recommendations.push(`Improve ${deficiency} dimension (current score: ${score.toFixed(2)})`);
            }
        }

        // Context-specific recommendations
        const contextualRecommendations = await this.generateContextualRecommendations(
            dimensionScores, 
            session
        );
        recommendations.push(...contextualRecommendations);

        return recommendations;
    }

    // Utility methods for quality assessment
    private findContradictions(stageResults: TaskResult[]): any[] {
        // Simple contradiction detection based on opposing assessments
        const contradictions: any[] = [];
        
        const allIssues = stageResults.flatMap(r => r.issues || []);
        
        // Look for opposing assessments
        for (let i = 0; i < allIssues.length; i++) {
            for (let j = i + 1; j < allIssues.length; j++) {
                if (this.areContradictory(allIssues[i], allIssues[j])) {
                    contradictions.push({ issue1: allIssues[i], issue2: allIssues[j] });
                }
            }
        }
        
        return contradictions;
    }

    private areContradictory(issue1: any, issue2: any): boolean {
        // Simple heuristic for contradiction detection
        const message1 = issue1.message?.toLowerCase() || '';
        const message2 = issue2.message?.toLowerCase() || '';
        
        // Look for opposing sentiments
        const positivePatterns = ['good', 'excellent', 'appropriate', 'correct'];
        const negativePatterns = ['poor', 'incorrect', 'inappropriate', 'wrong'];
        
        const is1Positive = positivePatterns.some(p => message1.includes(p));
        const is1Negative = negativePatterns.some(p => message1.includes(p));
        const is2Positive = positivePatterns.some(p => message2.includes(p));
        const is2Negative = negativePatterns.some(p => message2.includes(p));
        
        return (is1Positive && is2Negative) || (is1Negative && is2Positive);
    }

    private calculateVariance(values: number[]): number {
        if (values.length <= 1) return 0;
        
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return squaredDiffs.reduce((s, d) => s + d, 0) / values.length;
    }

    private analyzeSeverityDistribution(stageResults: TaskResult[]): Record<string, number> {
        const counts: Record<string, number> = { error: 0, warning: 0, info: 0 };
        
        stageResults.forEach(result => {
            result.issues?.forEach(issue => {
                counts[issue.severity] = (counts[issue.severity] || 0) + 1;
            });
        });
        
        return counts;
    }

    private assessSeverityConsistency(severityCounts: Record<string, number>): number {
        const total = Object.values(severityCounts).reduce((s, c) => s + c, 0);
        if (total === 0) return 1.0;
        
        // Prefer fewer errors, moderate warnings, some info
        const errorRatio = severityCounts.error / total;
        const warningRatio = severityCounts.warning / total;
        const infoRatio = severityCounts.info / total;
        
        // Ideal distribution: 10% errors, 30% warnings, 60% info
        const idealError = 0.1, idealWarning = 0.3, idealInfo = 0.6;
        const deviations = Math.abs(errorRatio - idealError) + 
                          Math.abs(warningRatio - idealWarning) + 
                          Math.abs(infoRatio - idealInfo);
        
        return Math.max(0, 1 - deviations);
    }

    private async getHistoricalConfidenceFactor(sessionId: string): Promise<number> {
        const qualityHistory = this.qualityHistory.get(sessionId) || [];
        if (qualityHistory.length === 0) return 1.0;
        
        // Analyze confidence trend
        const recentConfidences = qualityHistory.slice(-3).map(q => q.confidence);
        const avgRecentConfidence = recentConfidences.reduce((s, c) => s + c, 0) / recentConfidences.length;
        
        // Reward improving confidence
        if (recentConfidences.length > 1) {
            const trend = recentConfidences[recentConfidences.length - 1] - recentConfidences[0];
            return Math.max(0.8, Math.min(1.2, 1 + trend));
        }
        
        return avgRecentConfidence;
    }

    private async updateQualityHistory(sessionId: string, qualityMetrics: QualityMetrics): Promise<void> {
        const history = this.qualityHistory.get(sessionId) || [];
        history.push(qualityMetrics);
        
        // Keep only recent history
        const maxHistoryLength = this.config.get('processMonitor.maxQualityHistory', 10);
        if (history.length > maxHistoryLength) {
            history.splice(0, history.length - maxHistoryLength);
        }
        
        this.qualityHistory.set(sessionId, history);
    }

    private async analyzeQualityEvolution(sessionId: string): Promise<any> {
        const history = this.qualityHistory.get(sessionId) || [];
        if (history.length === 0) return null;
        
        const scores = history.map(q => q.overallScore);
        const confidences = history.map(q => q.confidence);
        
        return {
            qualityTrend: this.calculateTrend(scores),
            confidenceTrend: this.calculateTrend(confidences),
            convergencePoint: this.findConvergencePoint(scores),
            finalImprovement: scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0
        };
    }

    private async assessConvergence(sessionId: string): Promise<any> {
        const history = this.qualityHistory.get(sessionId) || [];
        if (history.length < 2) return null;
        
        const recentScores = history.slice(-3).map(q => q.overallScore);
        const scoreVariance = this.calculateVariance(recentScores);
        const isConverged = scoreVariance < 0.01; // 1% variance threshold
        
        return {
            isConverged,
            variance: scoreVariance,
            stabilityScore: Math.max(0, 1 - scoreVariance * 10),
            iterations: history.length
        };
    }

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
        const threshold = 0.02;
        
        for (let i = 1; i < values.length; i++) {
            if (Math.abs(values[i] - values[i - 1]) < threshold) {
                return i;
            }
        }
        
        return values.length;
    }

    // Additional assessment methods
    private assessProfessionalism(stageResults: TaskResult[]): number {
        const professionalIssues = stageResults.flatMap(r => 
            r.issues?.filter(issue => issue.category === 'tonal') || []
        );
        return Math.max(0, 1 - professionalIssues.length * 0.1);
    }

    private assessAppropriatenesss(stageResults: TaskResult[]): number {
        // Implementation depends on specific appropriateness criteria
        return 0.8; // Placeholder
    }

    private assessTechnicalAccuracy(stageResults: TaskResult[]): number {
        const technicalErrors = stageResults.flatMap(r =>
            r.issues?.filter(issue => 
                issue.category === 'factual' && 
                (issue.message?.includes('technical') || issue.message?.includes('mathematical'))
            ) || []
        );
        return Math.max(0, 1 - technicalErrors.length * 0.15);
    }

    private assessRiskMitigation(stageResults: TaskResult[]): number {
        const riskIssues = stageResults.flatMap(r =>
            r.issues?.filter(issue => issue.severity === 'error' || issue.confidence > 0.8) || []
        );
        return Math.max(0, 1 - riskIssues.length * 0.2);
    }

    private assessConservativeness(stageResults: TaskResult[]): number {
        const overconfidenceIssues = stageResults.flatMap(r =>
            r.issues?.filter(issue => 
                issue.message?.includes('overconfident') || 
                issue.message?.includes('absolute') ||
                issue.message?.includes('certain')
            ) || []
        );
        return Math.max(0, 1 - overconfidenceIssues.length * 0.1);
    }

    private async assessBiasCompliance(stageResults: TaskResult[], session: ProcessingSession): Promise<number> {
        // Check if systematic bias was appropriately applied
        return 1.0; // Placeholder - would check against systematic bias configuration
    }

    private async assessContextSpecificCompliance(stageResults: TaskResult[], session: ProcessingSession): Promise<number> {
        // Check compliance with specific context requirements
        return 1.0; // Placeholder - context-specific implementation
    }

    private async generateContextualRecommendations(
        dimensionScores: Record<string, number>,
        session: ProcessingSession
    ): Promise<string[]> {
        const recommendations: string[] = [];
        
        // Add context-specific recommendations based on session context
        if (session.context.stakes === 'critical') {
            recommendations.push('Apply additional scrutiny for critical context');
        }
        
        if (session.context.characteristics?.professionalContext) {
            recommendations.push('Ensure professional tone and appropriateness');
        }
        
        return recommendations;
    }
}
