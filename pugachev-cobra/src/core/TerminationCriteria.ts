/**
 * TerminationCriteria
 * 
 * Implements termination conditions for bounded processing.
 * Prevents infinite regress and maintains finite observer properties.
 */

import { ProcessingState, ValidationTask, TaskResult, SystematicBias } from '../types/ValidationTypes';

export class TerminationCriteria {

    /**
     * Determines if global processing should terminate
     */
    shouldTerminateGlobal(processingState: ProcessingState): boolean {
        const currentTime = Date.now();
        const elapsedTime = currentTime - processingState.metadata.startTime;
        
        // Check maximum processing time
        if (elapsedTime > this.getMaxProcessingTime(processingState)) {
            return true;
        }

        // Check if sufficiency threshold reached
        if (this.hasSufficientProcessing(processingState)) {
            return true;
        }

        // Check consciousness threshold
        if (processingState.consciousnessLevel >= 0.8) {
            return true; // High consciousness achieved
        }

        // Check resource constraints
        if (this.resourceConstraintsReached(processingState)) {
            return true;
        }

        return false;
    }

    /**
     * Determines if individual task processing should terminate
     */
    shouldTerminateTask(task: ValidationTask, taskResult: TaskResult): boolean {
        // Task-specific timeout
        if (taskResult.processingTimeMs > task.metadata.expectedDurationMs * 2) {
            return true;
        }

        // High confidence achieved
        if (taskResult.confidence >= 0.9) {
            return true;
        }

        // Adequate contribution achieved
        if (taskResult.adequacyContribution >= 0.8) {
            return true;
        }

        // Task complexity threshold
        if (this.taskComplexityThresholdReached(task, taskResult)) {
            return true;
        }

        return false;
    }

    /**
     * Checks if sufficient processing has been achieved
     */
    hasSufficientProcessing(processingState: ProcessingState): boolean {
        // Minimum tasks processed
        if (processingState.processedTasks.length < 2) {
            return false;
        }

        // Adequacy threshold
        if (processingState.adequacyLevel >= this.getSufficiencyThreshold(processingState)) {
            return true;
        }

        // Weighted adequacy based on task importance
        const weightedAdequacy = this.calculateWeightedAdequacy(processingState);
        if (weightedAdequacy >= 0.7) {
            return true;
        }

        // High-confidence tasks completed
        const highConfidenceTasks = processingState.processedTasks.filter(task => task.confidence >= 0.8);
        if (highConfidenceTasks.length >= 3) {
            return true;
        }

        return false;
    }

    /**
     * Gets maximum processing time based on context
     */
    private getMaxProcessingTime(processingState: ProcessingState): number {
        const baseTime = 5000; // 5 seconds default
        
        // Adjust based on problem type
        const problemType = processingState.metadata.problemType;
        let multiplier = 1.0;
        
        switch (problemType) {
            case 'Professional Communication':
                multiplier = 2.0; // Allow more time for critical applications
                break;
            case 'Technical Analysis':
                multiplier = 1.5; // More time for complex analysis
                break;
            case 'Academic Writing':
                multiplier = 1.8; // More time for rigorous review
                break;
            case 'Creative Exploration':
                multiplier = 0.8; // Less time for creative content
                break;
            default:
                multiplier = 1.0;
        }

        return baseTime * multiplier;
    }

    /**
     * Gets sufficiency threshold based on processing state
     */
    private getSufficiencyThreshold(processingState: ProcessingState): number {
        // Base threshold
        let threshold = 0.7;
        
        // Adjust based on systematic bias configuration
        if (processingState.metadata.biasConfiguration?.terminationCriteria?.sufficiencyThreshold) {
            threshold = processingState.metadata.biasConfiguration.terminationCriteria.sufficiencyThreshold;
        }

        // Adjust based on number of processed tasks
        const taskCount = processingState.processedTasks.length;
        if (taskCount >= 5) {
            threshold *= 0.9; // Lower threshold if many tasks processed
        } else if (taskCount <= 2) {
            threshold *= 1.1; // Higher threshold if few tasks processed
        }

        return Math.min(Math.max(threshold, 0.5), 0.9);
    }

    /**
     * Calculates weighted adequacy based on task importance
     */
    private calculateWeightedAdequacy(processingState: ProcessingState): number {
        if (processingState.processedTasks.length === 0) {
            return 0;
        }

        let totalWeightedContribution = 0;
        let totalWeight = 0;

        for (const taskResult of processingState.processedTasks) {
            const weight = taskResult.importanceWeight || 1;
            totalWeightedContribution += taskResult.adequacyContribution * weight;
            totalWeight += weight;
        }

        return totalWeight > 0 ? totalWeightedContribution / totalWeight : 0;
    }

    /**
     * Checks if resource constraints have been reached
     */
    private resourceConstraintsReached(processingState: ProcessingState): boolean {
        // Memory constraints (basic check)
        if (processingState.processedTasks.length > 15) {
            return true; // Too many tasks processed
        }

        // Processing steps constraint
        const totalProcessingSteps = processingState.processedTasks.reduce(
            (total, task) => total + (task.metadata.processingSteps || 0), 0
        );
        
        if (totalProcessingSteps > 100) {
            return true; // Too many processing steps
        }

        return false;
    }

    /**
     * Checks if task complexity threshold has been reached
     */
    private taskComplexityThresholdReached(task: ValidationTask, taskResult: TaskResult): boolean {
        // High complexity tasks get more processing time
        if (task.estimatedComplexity >= 0.8) {
            return taskResult.processingTimeMs > task.metadata.expectedDurationMs * 3;
        }

        // Medium complexity tasks
        if (task.estimatedComplexity >= 0.5) {
            return taskResult.processingTimeMs > task.metadata.expectedDurationMs * 2;
        }

        // Low complexity tasks
        return taskResult.processingTimeMs > task.metadata.expectedDurationMs * 1.5;
    }

    /**
     * Creates termination condition based on systematic bias
     */
    createTerminationConditions(systematicBias: SystematicBias): {
        maxTime: number;
        sufficiencyThreshold: number;
        taskTimeout: number;
        confidenceThreshold: number;
    } {
        const criteria = systematicBias.terminationCriteria;
        
        return {
            maxTime: criteria.maxProcessingTimeMs,
            sufficiencyThreshold: criteria.sufficiencyThreshold,
            taskTimeout: criteria.taskTimeoutMs,
            confidenceThreshold: criteria.confidenceThreshold
        };
    }

    /**
     * Determines reason for termination
     */
    getTerminationReason(processingState: ProcessingState): string {
        const currentTime = Date.now();
        const elapsedTime = currentTime - processingState.metadata.startTime;
        
        if (elapsedTime > this.getMaxProcessingTime(processingState)) {
            return 'max_time_exceeded';
        }

        if (this.hasSufficientProcessing(processingState)) {
            return 'sufficiency_achieved';
        }

        if (processingState.consciousnessLevel >= 0.8) {
            return 'high_consciousness_achieved';
        }

        if (this.resourceConstraintsReached(processingState)) {
            return 'resource_constraints';
        }

        return 'unknown';
    }

    /**
     * Validates termination appropriateness
     */
    isTerminationAppropriate(
        processingState: ProcessingState,
        systematicBias: SystematicBias
    ): {
        appropriate: boolean;
        reason: string;
        recommendation?: string;
    } {
        // Check minimum processing requirements
        if (processingState.processedTasks.length < 2) {
            return {
                appropriate: false,
                reason: 'insufficient_processing',
                recommendation: 'Process at least 2 validation tasks'
            };
        }

        // Check consciousness threshold
        if (processingState.consciousnessLevel < 0.4) {
            return {
                appropriate: false,
                reason: 'insufficient_consciousness',
                recommendation: 'Increase consciousness level through better processing'
            };
        }

        // Check adequacy level
        if (processingState.adequacyLevel < 0.5) {
            return {
                appropriate: false,
                reason: 'insufficient_adequacy',
                recommendation: 'Continue processing to achieve higher adequacy'
            };
        }

        return {
            appropriate: true,
            reason: 'termination_criteria_met'
        };
    }
}
