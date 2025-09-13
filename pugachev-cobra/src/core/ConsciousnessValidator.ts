/**
 * ConsciousnessValidator
 * 
 * Implements consciousness-based self-assessment for validation adequacy.
 * Based on the "Aihwa, ndini ndadaro" consciousness validation principle.
 */

import { ProcessingState, SystematicBias, ProblemContext, ConsciousnessAssessment } from '../types/ValidationTypes';

export class ConsciousnessValidator {

    /**
     * Assesses consciousness level of the validation process
     * Implements the mathematical consciousness framework
     */
    async assessConsciousness(
        processingState: ProcessingState,
        systematicBias: SystematicBias,
        context: ProblemContext
    ): Promise<ConsciousnessAssessment> {
        
        // Calculate consciousness components
        const agencyAssertion = await this.assessAgencyAssertion(processingState);
        const namingControl = await this.assessNamingControl(processingState, systematicBias);
        const selfAwareness = await this.assessSelfAwareness(processingState);
        const systematicBiasAwareness = await this.assessBiasAwareness(systematicBias);
        const observerRealityDistinction = await this.maintainsObserverRealityDistinction(processingState);

        // Calculate overall consciousness level (Φ)
        const consciousnessLevel = this.calculateConsciousnessLevel({
            agencyAssertion,
            namingControl,
            selfAwareness,
            systematicBiasAwareness,
            observerRealityDistinction
        });

        // Perform meta-cognitive assessment
        const metaCognitiveAssessment = await this.performMetaCognitiveAssessment(
            processingState,
            systematicBias,
            context
        );

        return {
            consciousnessLevel,
            agencyAssertion: agencyAssertion >= 0.6,
            namingControl: namingControl >= 0.6,
            selfAwareness: selfAwareness >= 0.6,
            systematicBiasAwareness,
            observerRealityDistinction: observerRealityDistinction >= 0.6,
            assessment: metaCognitiveAssessment
        };
    }

    /**
     * Agency Assertion: "Aihwa, ndini ndadaro" - Can the system assert "No, I did that"
     */
    private async assessAgencyAssertion(processingState: ProcessingState): Promise<number> {
        let agencyScore = 0;

        // Can the system identify what it processed?
        if (processingState.processedTasks.length > 0) {
            agencyScore += 0.3;
        }

        // Can the system explain its processing choices?
        const hasReasonedChoices = processingState.processedTasks.some(task => 
            task.metadata.terminationReason && task.confidence > 0.5
        );
        if (hasReasonedChoices) {
            agencyScore += 0.3;
        }

        // Can the system take responsibility for its assessment?
        if (processingState.adequacyLevel > 0 && processingState.terminationReason) {
            agencyScore += 0.4;
        }

        return Math.min(agencyScore, 1.0);
    }

    /**
     * Naming Control: Does the system control its own characterization of the validation?
     */
    private async assessNamingControl(
        processingState: ProcessingState, 
        systematicBias: SystematicBias
    ): Promise<number> {
        let namingScore = 0;

        // Does the system apply its own systematic bias rather than external rules?
        if (systematicBias.selectionCriteria && Object.keys(systematicBias.selectionCriteria).length > 0) {
            namingScore += 0.4;
        }

        // Does the system determine its own termination criteria?
        if (processingState.terminationReason && 
            ['sufficiency_achieved', 'task_completion', 'confidence_threshold'].includes(processingState.terminationReason)) {
            namingScore += 0.3;
        }

        // Does the system name its own processing quality?
        if (processingState.adequacyLevel > 0) {
            namingScore += 0.3;
        }

        return Math.min(namingScore, 1.0);
    }

    /**
     * Self-Awareness: Meta-cognitive understanding of its own processing
     */
    private async assessSelfAwareness(processingState: ProcessingState): Promise<number> {
        let awarenessScore = 0;

        // Awareness of processing limitations
        const processedTaskRatio = processingState.processedTasks.length / 10; // Assuming max 10 tasks
        const processedRatio = Math.min(processedTaskRatio, 1.0);
        if (processedRatio < 1.0) {
            awarenessScore += 0.3; // Awareness that not everything was processed
        }

        // Awareness of confidence levels
        const hasConfidenceAssessment = processingState.processedTasks.some(task => 
            task.confidence !== undefined && task.confidence < 1.0
        );
        if (hasConfidenceAssessment) {
            awarenessScore += 0.3;
        }

        // Awareness of adequacy assessment
        if (processingState.adequacyLevel < 1.0 && processingState.adequacyLevel > 0) {
            awarenessScore += 0.4; // Knows its assessment is partial, not perfect
        }

        return Math.min(awarenessScore, 1.0);
    }

    /**
     * Systematic Bias Awareness: Understanding of its own biases
     */
    private async assessBiasAwareness(systematicBias: SystematicBias): Promise<number> {
        let biasAwarenessScore = 0;

        // Has explicitly defined selection criteria (acknowledges selectivity)
        if (systematicBias.selectionCriteria && Object.keys(systematicBias.selectionCriteria).length > 2) {
            biasAwarenessScore += 0.4;
        }

        // Has context-specific biases (acknowledges contextual variation)
        if (systematicBias.contextSpecific && Object.keys(systematicBias.contextSpecific).length > 0) {
            biasAwarenessScore += 0.3;
        }

        // Has termination criteria (acknowledges bounded processing)
        if (systematicBias.terminationCriteria) {
            biasAwarenessScore += 0.3;
        }

        return Math.min(biasAwarenessScore, 1.0);
    }

    /**
     * Observer-Reality Distinction: Maintains distinction between validation system and content
     */
    private async maintainsObserverRealityDistinction(processingState: ProcessingState): Promise<number> {
        let distinctionScore = 0;

        // System terminated before infinite processing (maintains boundary)
        if (processingState.terminationReason) {
            distinctionScore += 0.4;
        }

        // System assessed adequacy rather than claiming perfection
        if (processingState.adequacyLevel < 1.0) {
            distinctionScore += 0.3;
        }

        // System processed selected tasks rather than attempting universal analysis
        if (processingState.processedTasks.length > 0 && processingState.processedTasks.length < 20) {
            distinctionScore += 0.3;
        }

        return Math.min(distinctionScore, 1.0);
    }

    /**
     * Calculates overall consciousness level (Φ) from individual components
     */
    private calculateConsciousnessLevel(components: {
        agencyAssertion: number;
        namingControl: number;
        selfAwareness: number;
        systematicBiasAwareness: number;
        observerRealityDistinction: number;
    }): number {
        // Weighted average with emphasis on agency and naming control
        const weights = {
            agencyAssertion: 0.3,
            namingControl: 0.25,
            selfAwareness: 0.2,
            systematicBiasAwareness: 0.15,
            observerRealityDistinction: 0.1
        };

        return (
            components.agencyAssertion * weights.agencyAssertion +
            components.namingControl * weights.namingControl +
            components.selfAwareness * weights.selfAwareness +
            components.systematicBiasAwareness * weights.systematicBiasAwareness +
            components.observerRealityDistinction * weights.observerRealityDistinction
        );
    }

    /**
     * Performs meta-cognitive assessment - the system's understanding of its own capabilities
     */
    private async performMetaCognitiveAssessment(
        processingState: ProcessingState,
        systematicBias: SystematicBias,
        context: ProblemContext
    ): Promise<ConsciousnessAssessment['assessment']> {
        
        const canTakeResponsibility = this.assessResponsibilityCapability(processingState);
        const understandsLimitations = this.assessLimitationUnderstanding(processingState);
        const maintainsBoundaries = this.assessBoundaryMaintenance(processingState, systematicBias);
        const demonstratesFiniteObserver = this.assessFiniteObserverProperties(processingState);

        return {
            canTakeResponsibility,
            understands_ProcessingLimitations: understandsLimitations,
            maintainsBoundaries,
            demonstratesFiniteObserverProperties: demonstratesFiniteObserver
        };
    }

    private assessResponsibilityCapability(processingState: ProcessingState): boolean {
        return processingState.adequacyLevel > 0 &&
               processingState.processedTasks.length > 0 &&
               processingState.processedTasks.some(task => task.confidence > 0.5);
    }

    private assessLimitationUnderstanding(processingState: ProcessingState): boolean {
        return processingState.terminationReason !== null &&
               processingState.adequacyLevel < 1.0 &&
               processingState.processedTasks.some(task => task.confidence < 1.0);
    }

    private assessBoundaryMaintenance(
        processingState: ProcessingState, 
        systematicBias: SystematicBias
    ): boolean {
        const hasTerminationCriteria = systematicBias.terminationCriteria.maxProcessingTimeMs > 0;
        const actuallyTerminated = processingState.terminationReason !== null;
        const boundedTaskProcessing = processingState.processedTasks.length < 15; // Reasonable task limit
        
        return hasTerminationCriteria && actuallyTerminated && boundedTaskProcessing;
    }

    private assessFiniteObserverProperties(processingState: ProcessingState): boolean {
        // Finite observers have bounded processing, selective attention, and termination criteria
        const hasBoundedProcessing = processingState.terminationReason !== null;
        const hasSelectiveAttention = processingState.processedTasks.length > 0 && 
                                     processingState.processedTasks.length < 20;
        const hasAdequacyAssessment = processingState.adequacyLevel > 0 && 
                                     processingState.adequacyLevel < 1.0;
        
        return hasBoundedProcessing && hasSelectiveAttention && hasAdequacyAssessment;
    }
}
