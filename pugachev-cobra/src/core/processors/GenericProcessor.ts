/**
 * GenericProcessor
 * 
 * Generic task processor for basic validation tasks.
 * Implements bounded processing with termination criteria.
 */

import { ValidationTask, ProblemContext, SystematicBias, TaskResult } from '../../types/ValidationTypes';
import { TerminationCriteria } from '../TerminationCriteria';

export class GenericProcessor {

    async process(
        task: ValidationTask,
        content: string,
        systematicBias: SystematicBias,
        context: ProblemContext,
        terminationCriteria: TerminationCriteria
    ): Promise<TaskResult> {
        const startTime = Date.now();
        const issues: any[] = [];
        let adequacyContribution = 0;
        let confidence = 0.5;

        try {
            // Basic processing based on task type
            switch (task.type) {
                case 'logical-consistency':
                    ({ adequacyContribution, confidence } = await this.processLogicalConsistency(
                        content, task, systematicBias, issues
                    ));
                    break;

                case 'linguistic-analysis':
                    ({ adequacyContribution, confidence } = await this.processLinguisticAnalysis(
                        content, task, systematicBias, issues
                    ));
                    break;

                default:
                    ({ adequacyContribution, confidence } = await this.processGeneric(
                        content, task, systematicBias, issues
                    ));
                    break;
            }

            const processingTime = Date.now() - startTime;

            return {
                taskId: task.id,
                success: true,
                adequacyContribution,
                importanceWeight: task.importance,
                processingTimeMs: processingTime,
                issues,
                confidence,
                metadata: {
                    terminationReason: 'task_completed',
                    processingSteps: this.estimateProcessingSteps(content, task),
                    resourcesUsed: {
                        memoryMB: 0.1,
                        computeCycles: processingTime
                    }
                }
            };

        } catch (error) {
            return this.createErrorResult(task, startTime, error);
        }
    }

    private async processLogicalConsistency(
        content: string,
        task: ValidationTask,
        systematicBias: SystematicBias,
        issues: any[]
    ): Promise<{ adequacyContribution: number; confidence: number }> {
        let adequacyContribution = 0.6; // Base adequacy for basic processing
        let confidence = 0.7;

        // Check for basic logical coherence
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        // Check for contradictory statements (simple heuristic)
        const contradictionPatterns = [
            { positive: /\b(is|are|will|can|does)\b/gi, negative: /\b(is not|are not|will not|cannot|does not)\b/gi },
            { positive: /\b(always|all|every)\b/gi, negative: /\b(never|none|no)\b/gi },
            { positive: /\b(possible|likely|probable)\b/gi, negative: /\b(impossible|unlikely|improbable)\b/gi }
        ];

        for (const pattern of contradictionPatterns) {
            const positiveMatches = content.match(pattern.positive) || [];
            const negativeMatches = content.match(pattern.negative) || [];
            
            if (positiveMatches.length > 0 && negativeMatches.length > 0) {
                issues.push({
                    message: 'Potential logical contradiction detected - text contains both positive and negative assertions about similar concepts',
                    severity: 'warning',
                    confidence: 0.6,
                    category: 'logical',
                    suggestions: ['Review for potential contradictions', 'Clarify seemingly conflicting statements']
                });
                adequacyContribution = 0.4;
                confidence = 0.6;
            }
        }

        // Check for logical flow
        if (sentences.length > 3) {
            const hasTransitions = /\b(however|therefore|furthermore|moreover|thus|hence|consequently)\b/gi.test(content);
            if (!hasTransitions) {
                issues.push({
                    message: 'Consider adding logical transition words to improve flow',
                    severity: 'info',
                    confidence: 0.5,
                    category: 'logical',
                    suggestions: ['Add transition words like "however", "therefore", "furthermore"']
                });
            }
        }

        return { adequacyContribution, confidence };
    }

    private async processLinguisticAnalysis(
        content: string,
        task: ValidationTask,
        systematicBias: SystematicBias,
        issues: any[]
    ): Promise<{ adequacyContribution: number; confidence: number }> {
        let adequacyContribution = 0.7;
        let confidence = 0.8;

        // Basic grammar checks
        const grammarIssues = this.checkBasicGrammar(content);
        issues.push(...grammarIssues);

        // Sentence length analysis
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = content.length / sentences.length;

        if (avgSentenceLength > 200) {
            issues.push({
                message: 'Very long average sentence length may impact readability',
                severity: 'info',
                confidence: 0.7,
                category: 'linguistic',
                suggestions: ['Consider breaking up long sentences', 'Use more punctuation to improve flow']
            });
        }

        // Word repetition check
        const words = content.toLowerCase().match(/\b\w+\b/g) || [];
        const wordCount: { [key: string]: number } = {};
        words.forEach(word => {
            if (word.length > 4) { // Only check longer words
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });

        for (const [word, count] of Object.entries(wordCount)) {
            if (count > Math.max(3, words.length / 50)) { // Threshold based on text length
                issues.push({
                    message: `Word "${word}" appears ${count} times - consider using synonyms`,
                    severity: 'info',
                    confidence: 0.6,
                    category: 'linguistic',
                    suggestions: [`Find synonyms for "${word}"`, 'Vary vocabulary to improve readability']
                });
            }
        }

        return { adequacyContribution, confidence };
    }

    private async processGeneric(
        content: string,
        task: ValidationTask,
        systematicBias: SystematicBias,
        issues: any[]
    ): Promise<{ adequacyContribution: number; confidence: number }> {
        // Generic processing - basic content analysis
        let adequacyContribution = 0.5;
        let confidence = 0.6;

        // Check content length appropriateness
        if (content.length < 50) {
            issues.push({
                message: 'Content appears very short for meaningful validation',
                severity: 'warning',
                confidence: 0.8,
                category: 'general',
                suggestions: ['Consider expanding content', 'Ensure content is complete']
            });
            adequacyContribution = 0.3;
        } else if (content.length > 5000) {
            issues.push({
                message: 'Very long content - consider breaking into sections',
                severity: 'info',
                confidence: 0.6,
                category: 'general',
                suggestions: ['Consider sectioning long content', 'Use headers to organize']
            });
        }

        // Check for placeholder text
        const placeholders = [/\b(lorem ipsum|placeholder|todo|fixme|xxx)\b/gi, /\[.*\]/g];
        for (const pattern of placeholders) {
            if (pattern.test(content)) {
                issues.push({
                    message: 'Placeholder text detected - ensure content is complete',
                    severity: 'warning',
                    confidence: 0.9,
                    category: 'general',
                    suggestions: ['Replace placeholder text', 'Complete all sections']
                });
                adequacyContribution = 0.2;
                break;
            }
        }

        return { adequacyContribution, confidence };
    }

    private checkBasicGrammar(content: string): any[] {
        const issues: any[] = [];

        // Check for double spaces
        if (/  +/g.test(content)) {
            issues.push({
                message: 'Multiple consecutive spaces detected',
                severity: 'info',
                confidence: 0.9,
                category: 'linguistic',
                suggestions: ['Remove extra spaces']
            });
        }

        // Check for missing capitalization after periods
        const sentences = content.split(/[.!?]+/);
        for (let i = 0; i < sentences.length - 1; i++) {
            const nextSentence = sentences[i + 1].trim();
            if (nextSentence.length > 0 && !/^[A-Z]/.test(nextSentence)) {
                issues.push({
                    message: 'Sentence may not start with capital letter',
                    severity: 'info',
                    confidence: 0.7,
                    category: 'linguistic',
                    suggestions: ['Check capitalization at sentence beginnings']
                });
                break; // Only report once
            }
        }

        // Check for basic punctuation issues
        if (/[,;:]$/.test(content.trim())) {
            issues.push({
                message: 'Content ends with comma, semicolon, or colon',
                severity: 'info',
                confidence: 0.8,
                category: 'linguistic',
                suggestions: ['End content with appropriate punctuation (. ! ?)']
            });
        }

        return issues;
    }

    private estimateProcessingSteps(content: string, task: ValidationTask): number {
        // Simple heuristic for processing complexity
        const baseSteps = 5;
        const lengthFactor = Math.min(content.length / 1000, 5);
        const complexityFactor = task.estimatedComplexity * 3;
        
        return Math.ceil(baseSteps + lengthFactor + complexityFactor);
    }

    private createErrorResult(
        task: ValidationTask,
        startTime: number,
        error: any
    ): TaskResult {
        return {
            taskId: task.id,
            success: false,
            adequacyContribution: 0,
            importanceWeight: task.importance,
            processingTimeMs: Date.now() - startTime,
            issues: [{
                message: `Task processing error: ${error.message || 'Unknown error'}`,
                severity: 'error',
                confidence: 0.9,
                category: 'processing',
                suggestions: ['Report this error to system administrators']
            }],
            confidence: 0,
            metadata: {
                terminationReason: 'processing_error',
                processingSteps: 1,
                resourcesUsed: { error: error.message }
            }
        };
    }
}
